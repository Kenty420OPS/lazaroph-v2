import { NextResponse } from "next/server";
import { getPublicCategories } from "@/lib/categories-server";

export const dynamic = "force-dynamic";

// GET /api/categories — public list of categories (no auth). Built-in
// categories come first in their fixed order, followed by admin-created
// Firestore categories sorted case-insensitively by name.
export async function GET() {
  try {
    const categories = await getPublicCategories();

    return NextResponse.json(
      { success: true, categories },
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
