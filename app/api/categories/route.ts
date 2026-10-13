import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_CATEGORIES, isDefaultCategorySlug } from "@/lib/categories";

export const dynamic = "force-dynamic";

// GET /api/categories — public list of categories (no auth). Built-in
// categories come first in their fixed order, followed by admin-created
// Firestore categories sorted case-insensitively by name.
export async function GET() {
  try {
    const snap = await adminDb.collection("categories").get();

    const custom = snap.docs
      .filter((d) => !isDefaultCategorySlug(d.id))
      .map((d) => ({
        id: d.id,
        name: String((d.data() as any).name ?? ""),
        builtIn: false as const,
      }))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    return NextResponse.json(
      { success: true, categories: [...DEFAULT_CATEGORIES, ...custom] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load categories" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
