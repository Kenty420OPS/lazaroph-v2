import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySuperadminRequest } from "@/lib/admin-auth";

// Statuses that count as verified payment. pending_payment and cancelled are excluded.
const REVENUE_STATUSES = ["confirmed", "shipped", "ready_for_pickup", "picked_up", "completed"];
const TZ = "Asia/Manila";

// createdAt can be an ISO string (checkout route) or a Firestore Timestamp.
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof (value as any).toDate === "function") return (value as any).toDate();
  return null;
}

// Returns YYYY-MM-DD in Asia/Manila.
function manilaDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function GET(request: Request) {
  try {
    const auth = await verifySuperadminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    // Read only the fields needed. No proof image signing here.
    const snapshot = await adminDb!
      .collection("orders")
      .select("status", "createdAt", "total")
      .get();

    const byDay: Record<string, { orders: number; revenue: number }> = {};
    let totalOrders = 0;
    let totalRevenue = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!REVENUE_STATUSES.includes(data.status)) continue;

      const created = toDate(data.createdAt);
      if (!created) continue;

      const total = typeof data.total === "number" ? data.total : 0;
      const day = manilaDay(created);

      if (!byDay[day]) byDay[day] = { orders: 0, revenue: 0 };
      byDay[day].orders += 1;
      byDay[day].revenue += total;

      totalOrders += 1;
      totalRevenue += total;
    }

    const days = Object.entries(byDay)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, v]) => ({
        date,
        orders: v.orders,
        revenue: Math.round(v.revenue * 100) / 100,
      }));

    const url = new URL(request.url);
    if (url.searchParams.get("format") === "csv") {
      const lines = ["Date,Orders,Revenue"];
      for (const d of days) lines.push(`${d.date},${d.orders},${d.revenue.toFixed(2)}`);
      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="sales-report.csv"',
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        totals: { orders: totalOrders, revenue: Math.round(totalRevenue * 100) / 100 },
        days,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}