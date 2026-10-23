import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { createRateLimiter } from "@/lib/rate-limit";

const reviewLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
});

const RATABLE_STATUSES = ["completed", "picked_up"];

const normalizeContact = (c: string) => c.replace(/[\s\-\(\)]/g, "");

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!reviewLimiter(ip).allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }

    const { orderId, contact, rating } = body ?? {};

    if (
      typeof orderId !== "string" ||
      orderId.trim().length === 0 ||
      orderId.trim().length > 64
    ) {
      return NextResponse.json(
        { success: false, error: "orderId is required (max 64 chars)." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "rating must be an integer from 1 to 5." },
        { status: 400 }
      );
    }

    if (typeof contact !== "string" || contact.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "contact is required." },
        { status: 400 }
      );
    }

    // Look up the order and match contact exactly as track-order does.
    const orderDoc = await adminDb!.collection("orders").doc(orderId.trim()).get();
    if (!orderDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Order not found or details mismatch." },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();
    const storedContact = orderData?.customer?.contact;

    if (!storedContact || normalizeContact(storedContact) !== normalizeContact(contact)) {
      return NextResponse.json(
        { success: false, error: "Order not found or details mismatch." },
        { status: 404 }
      );
    }

    if (!RATABLE_STATUSES.includes(orderData?.status)) {
      return NextResponse.json(
        { success: false, error: "This order is not ready for rating yet." },
        { status: 400 }
      );
    }

    // Collect unique product IDs from the order items.
    const items: any[] = Array.isArray(orderData?.items) ? orderData.items : [];
    const productIds = Array.from(new Set(items.map((i: any) => i.productId).filter(Boolean)));

    // Use a transaction on reviews/{orderId} to prevent duplicates.
    const reviewRef = adminDb!.collection("reviews").doc(orderId.trim());
    let alreadyRated = false;

    await adminDb!.runTransaction(async (tx) => {
      const existing = await tx.get(reviewRef);
      if (existing.exists) {
        alreadyRated = true;
        return;
      }
      tx.set(reviewRef, {
        orderId: orderId.trim(),
        rating,
        productIds,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    if (alreadyRated) {
      return NextResponse.json(
        { success: false, error: "This order has already been rated." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const snapshot = await adminDb!
      .collection("reviews")
      .where("status", "==", "approved")
      .get();

    const ratings: Record<string, { average: number; count: number }> = {};
    const sums: Record<string, { total: number; count: number }> = {};

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const r = typeof data.rating === "number" ? data.rating : 0;
      const ids: string[] = Array.isArray(data.productIds) ? data.productIds : [];
      for (const pid of ids) {
        if (!sums[pid]) sums[pid] = { total: 0, count: 0 };
        sums[pid].total += r;
        sums[pid].count += 1;
      }
    }

    for (const [pid, v] of Object.entries(sums)) {
      ratings[pid] = {
        average: Math.round((v.total / v.count) * 10) / 10,
        count: v.count,
      };
    }

    return NextResponse.json({ success: true, ratings }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}