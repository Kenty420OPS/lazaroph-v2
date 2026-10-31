import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySuperadminRequest } from "@/lib/admin-auth";
import { toDate, manilaDay, parseDateRange, isInRange } from "@/lib/admin-date";

export const dynamic = "force-dynamic";

// Statuses that count as verified payment. pending_payment and cancelled are excluded.
const REVENUE_STATUSES = ["confirmed", "shipped", "ready_for_pickup", "picked_up", "completed"];

export async function GET(request: Request) {
  try {
    const auth = await verifySuperadminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const url = new URL(request.url);
    const dateRangeResult = parseDateRange(url.searchParams);
    if (dateRangeResult && "error" in dateRangeResult) {
      return NextResponse.json(
        { success: false, error: dateRangeResult.error },
        { status: 400 }
      );
    }

    // Read needed fields. No proof image signing here.
    const snapshot = await adminDb!
      .collection("orders")
      .select("status", "createdAt", "total", "subtotal", "shipping", "items")
      .get();

    const byDay: Record<
      string,
      { orders: number; itemsSold: number; subtotal: number; shippingFees: number; total: number }
    > = {};
    let totalOrders = 0;
    let totalItemsSold = 0;
    let totalSubtotal = 0;
    let totalShippingFees = 0;
    let totalRevenue = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!REVENUE_STATUSES.includes(data.status)) continue;

      const created = toDate(data.createdAt);
      if (!created) continue;

      const day = manilaDay(created);
      if (dateRangeResult && !isInRange(day, dateRangeResult.from, dateRangeResult.to)) {
        continue;
      }

      const total = typeof data.total === "number" && Number.isFinite(data.total) ? data.total : 0;
      const shippingFee =
        typeof data.shipping?.shippingFee === "number" && Number.isFinite(data.shipping.shippingFee)
          ? data.shipping.shippingFee
          : 0;
      const subtotal =
        typeof data.subtotal === "number" && Number.isFinite(data.subtotal)
          ? data.subtotal
          : Math.max(0, total - shippingFee);

      let itemsSold = 0;
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          const qty =
            typeof item?.quantity === "number" && Number.isFinite(item.quantity)
              ? item.quantity
              : 0;
          itemsSold += qty;
        }
      }

      if (!byDay[day]) {
        byDay[day] = { orders: 0, itemsSold: 0, subtotal: 0, shippingFees: 0, total: 0 };
      }
      byDay[day].orders += 1;
      byDay[day].itemsSold += itemsSold;
      byDay[day].subtotal += subtotal;
      byDay[day].shippingFees += shippingFee;
      byDay[day].total += total;

      totalOrders += 1;
      totalItemsSold += itemsSold;
      totalSubtotal += subtotal;
      totalShippingFees += shippingFee;
      totalRevenue += total;
    }

    const days = Object.entries(byDay)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, v]) => ({
        date,
        orders: v.orders,
        itemsSold: v.itemsSold,
        subtotal: Math.round(v.subtotal * 100) / 100,
        shippingFees: Math.round(v.shippingFees * 100) / 100,
        total: Math.round(v.total * 100) / 100,
        revenue: Math.round(v.total * 100) / 100,
      }));

    if (url.searchParams.get("format") === "csv") {
      const lines = ["Date,Orders,Items Sold,Subtotal,Shipping Fees,Total"];
      for (const d of days) {
        lines.push(
          `${d.date},${d.orders},${d.itemsSold},${d.subtotal.toFixed(2)},${d.shippingFees.toFixed(2)},${d.total.toFixed(2)}`
        );
      }
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
        totals: {
          orders: totalOrders,
          itemsSold: totalItemsSold,
          subtotal: Math.round(totalSubtotal * 100) / 100,
          shippingFees: Math.round(totalShippingFees * 100) / 100,
          total: Math.round(totalRevenue * 100) / 100,
          revenue: Math.round(totalRevenue * 100) / 100,
        },
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
