import { NextResponse } from "next/server";
import { getPublicShippingRates } from "@/lib/shipping-rates-server";

export const dynamic = "force-dynamic";

// GET /api/shipping-rates — active LBC rates for checkout. Never exposes the
// admin identity or the previous values used for the grace window.
export async function GET() {
  const context = await getPublicShippingRates();

  return NextResponse.json(
    {
      success: true,
      rates: context.rates,
      updatedAt: context.updatedAt,
      source: context.source,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
