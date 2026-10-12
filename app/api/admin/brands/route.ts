import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { isValidBrandId, validateBrandName } from "@/lib/brands";

const COLLECTION = "brands";

function isAlreadyExists(error: any): boolean {
  return (
    error?.code === 6 ||
    error?.code === "6" ||
    error?.code === "already-exists" ||
    error?.code === "ALREADY_EXISTS"
  );
}

// POST /api/admin/brands — create a brand (admin or superadmin only).
// The document id is the brand slug, so duplicates collide on create().
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

    const result = validateBrandName(body?.name);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const { name, nameLower, slug } = result;

    try {
      await adminDb.collection(COLLECTION).doc(slug).create({
        name,
        nameLower,
        createdAt: new Date().toISOString(),
      });
    } catch (createError: any) {
      if (isAlreadyExists(createError)) {
        return NextResponse.json(
          { success: false, error: "Brand already exists" },
          { status: 409 }
        );
      }
      throw createError;
    }

    return NextResponse.json(
      { success: true, brand: { id: slug, name } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/brands error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/brands?id=<slug> — delete an unused brand (admin or superadmin only).
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
    if (typeof id !== "string" || !isValidBrandId(id)) {
      return NextResponse.json({ success: false, error: "invalid id" }, { status: 400 });
    }

    const docRef = adminDb.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    const brandName = String((snap.data() as any)?.name ?? "");
    const inUse = await adminDb
      .collection("products")
      .where("brand", "==", brandName)
      .limit(1)
      .get();
    if (!inUse.empty) {
      return NextResponse.json(
        { success: false, error: "Brand is used by one or more products" },
        { status: 409 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/admin/brands error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
