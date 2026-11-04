import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  readShippingRates,
  saveShippingRates,
} from "@/lib/shipping-rates-server";
import {
  DEFAULT_SHIPPING_RATES,
  validateShippingRatesInput,
} from "@/lib/shipping";

export const dynamic = "force-dynamic";

const patchLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 10 * 60 * 1000,
});

// GET /api/admin/shipping-rates — current LBC rates and last editor (admin or superadmin)
export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const context = await readShippingRates();

    return NextResponse.json(
      {
        success: true,
        rates: context.rates,
        defaults: DEFAULT_SHIPPING_RATES,
        source: context.source,
        updatedAt: context.updatedAt,
        updatedBy: context.updatedBy,
        updatedByEmail: context.updatedByEmail,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/shipping-rates error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load shipping rates" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/shipping-rates — update both LBC rates and write an audit entry
export async function PATCH(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const limit = patchLimiter(auth.uid || "unknown");
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many updates. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const result = validateShippingRatesInput(body);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const saved = await saveShippingRates({
      ...result.value,
      updatedBy: auth.uid || "unknown",
      updatedByEmail: auth.email || auth.uid || "unknown",
    });

    return NextResponse.json(
      {
        success: true,
        rates: saved.rates,
        updatedAt: saved.updatedAt,
        updatedBy: saved.updatedBy,
        updatedByEmail: saved.updatedByEmail,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("PATCH /api/admin/shipping-rates error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update shipping rates" },
      { status: 500 }
    );
  }
}
