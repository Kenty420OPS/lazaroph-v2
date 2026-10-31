import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { toDate, manilaDay, parseDateRange, isInRange } from "@/lib/admin-date";

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

    const { searchParams } = new URL(request.url);
    const dateRangeResult = parseDateRange(searchParams);
    if (dateRangeResult && "error" in dateRangeResult) {
      return NextResponse.json(
        { success: false, error: dateRangeResult.error },
        { status: 400 }
      );
    }

    const snapshot = await adminDb!
      .collection("reviews")
      .orderBy("createdAt", "desc")
      .get();

    const allReviews = snapshot.docs.map((doc) => {
      const d = doc.data();
      const created = toDate(d.createdAt);
      const dateManila = created ? manilaDay(created) : null;
      return {
        orderId: d.orderId,
        rating: d.rating,
        productIds: d.productIds,
        status: d.status,
        dateManila,
        createdAt:
          created
            ? created.toISOString()
            : d.createdAt ?? null,
      };
    });

    const reviews = dateRangeResult
      ? allReviews.filter((r) => r.dateManila && isInRange(r.dateManila, dateRangeResult.from, dateRangeResult.to))
      : allReviews;

    const dailyCounts: Record<string, number> = {};
    for (const r of reviews) {
      if (r.dateManila) {
        dailyCounts[r.dateManila] = (dailyCounts[r.dateManila] || 0) + 1;
      }
    }
    const daily = Object.entries(dailyCounts)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({ success: true, reviews, daily, totalCount: reviews.length }, { status: 200 });
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
