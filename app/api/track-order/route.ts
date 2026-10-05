import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const rateLimit = new Map<string, { count: number, resetTime: number }>();

function isRateLimited(ip: string) {
  // Best-effort in-memory rate limiting for Vercel
  // Resets on cold start, but good enough as a first layer
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  
  const record = rateLimit.get(ip);
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  if (record.count >= maxAttempts) return true;
  record.count += 1;
  return false;
}

const normalizeContact = (c: string) => c.replace(/[\s\-\(\)]/g, "");

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(ip)) {
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
