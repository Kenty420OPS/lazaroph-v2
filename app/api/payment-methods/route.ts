import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET /api/payment-methods — public list of ACTIVE payment methods (no auth)
export async function GET() {
  try {
    const snap = await adminDb
      .collection("paymentMethods")
      .where("active", "==", true)
      .get();

    const methods = snap.docs
      .map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          type: data.type,
          name: data.name,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          instructions: data.instructions ?? null,
          qrUrl: data.qrUrl ?? null,
          sortOrder: data.sortOrder,
        };
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return NextResponse.json(
      { success: true, methods },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("GET /api/payment-methods error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load payment methods" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
