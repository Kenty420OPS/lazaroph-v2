import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createRateLimiter } from "@/lib/rate-limit";

const trackOrderLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
});

const normalizeContact = (c: string) => c.replace(/[\s\-\(\)]/g, "");

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!trackOrderLimiter(ip).allowed) {
      return NextResponse.json({ success: false, error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { orderId, contact } = await request.json();
    if (!orderId || !contact) {
      return NextResponse.json({ success: false, error: "Order ID and contact are required." }, { status: 400 });
    }

    const orderDoc = await adminDb.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ success: false, error: "Order not found or details mismatch." }, { status: 404 });
    }

    const orderData = orderDoc.data();
    const storedContact = orderData?.customer?.contact;

    if (!storedContact || normalizeContact(storedContact) !== normalizeContact(contact)) {
      return NextResponse.json({ success: false, error: "Order not found or details mismatch." }, { status: 404 });
    }

    // Return the safe order data
    return NextResponse.json({
      success: true,
      order: {
        id: orderDoc.id,
        status: orderData?.status,
        items: orderData?.items,
        total: orderData?.total,
        shipping: {
          courier: orderData?.shipping?.courier,
          shippingFee: orderData?.shipping?.shippingFee,
          region: orderData?.shipping?.region,
          city: orderData?.shipping?.city,
          branchId: orderData?.shipping?.branchId,
          branchName: orderData?.shipping?.branchName,
          branchAddress: orderData?.shipping?.branchAddress,
        },
        customer: {
          name: orderData?.customer?.name,
          address: orderData?.customer?.address,
        },
        payment: {
          method: orderData?.payment?.method,
          referenceNumber: orderData?.payment?.referenceNumber,
        }
      }
    });

  } catch (error: any) {
    console.error("Track order error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
