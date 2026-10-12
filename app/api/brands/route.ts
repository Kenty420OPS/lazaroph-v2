import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET /api/brands — public list of brands (no auth). Only id and name are exposed.
export async function GET() {
  try {
    const snap = await adminDb.collection("brands").get();

    const brands = snap.docs
      .map((d) => ({ id: d.id, name: String((d.data() as any).name ?? "") }))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    return NextResponse.json(
      { success: true, brands },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("GET /api/brands error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
