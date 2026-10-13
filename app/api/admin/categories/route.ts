import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";
import {
  isDefaultCategorySlug,
  isValidCategoryId,
  validateCategoryName,
} from "@/lib/categories";

const COLLECTION = "categories";

function isAlreadyExists(error: any): boolean {
  return (
    error?.code === 6 ||
    error?.code === "6" ||
    error?.code === "already-exists" ||
    error?.code === "ALREADY_EXISTS"
  );
}

// POST /api/admin/categories — create a category (admin or superadmin only).
// The document id is the category slug, so duplicates collide on create().
export async function POST(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json().catch(() => null);

    const result = validateCategoryName(body?.name);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const { name, nameLower, slug } = result;

    if (isDefaultCategorySlug(slug)) {
      return NextResponse.json(
        { success: false, error: "Category already exists" },
        { status: 409 }
      );
    }

    try {
      await adminDb.collection(COLLECTION).doc(slug).create({
        name,
        nameLower,
        createdAt: new Date().toISOString(),
      });
    } catch (createError: any) {
      if (isAlreadyExists(createError)) {
        return NextResponse.json(
          { success: false, error: "Category already exists" },
          { status: 409 }
        );
      }
      throw createError;
    }

    return NextResponse.json(
      { success: true, id: slug, name },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/categories error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/categories?id=<slug> — delete an unused category
// (admin or superadmin only). Built-in categories can never be deleted.
export async function DELETE(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const id = new URL(request.url).searchParams.get("id");
    if (typeof id !== "string" || !isValidCategoryId(id)) {
      return NextResponse.json({ success: false, error: "invalid id" }, { status: 400 });
    }

    if (isDefaultCategorySlug(id)) {
      return NextResponse.json(
        { success: false, error: "Built-in categories cannot be deleted" },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const categoryName = String((snap.data() as any)?.name ?? "");
    const inUse = await adminDb
      .collection("products")
      .where("category", "==", categoryName)
      .limit(1)
      .get();
    if (!inUse.empty) {
      return NextResponse.json(
        { success: false, error: "Category is used by one or more products" },
        { status: 409 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/admin/categories error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
