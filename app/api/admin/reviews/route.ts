import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const snapshot = await adminDb!
      .collection("reviews")
      .orderBy("createdAt", "desc")
      .get();

    const reviews = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        orderId: d.orderId,
        rating: d.rating,
        productIds: d.productIds,
        status: d.status,
        createdAt:
          d.createdAt && typeof d.createdAt.toDate === "function"
            ? d.createdAt.toDate().toISOString()
            : d.createdAt ?? null,
      };
    });

    return NextResponse.json({ success: true, reviews }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load reviews" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }

    const { orderId, status } = body ?? {};

    if (typeof orderId !== "string" || orderId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "orderId is required." },
        { status: 400 }
      );
    }

    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json(
        { success: false, error: "status must be \"approved\" or \"rejected\"." },
        { status: 400 }
      );
    }

    const reviewRef = adminDb!.collection("reviews").doc(orderId.trim());
    const existing = await reviewRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { success: false, error: "Review not found." },
        { status: 404 }
      );
    }

    await reviewRef.update({ status });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/admin/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update review" },
      { status: 500 }
    );
  }
}