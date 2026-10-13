import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";
import {
  isDefaultCategorySlug,
  isValidCategoryId,
  normalizeTagline,
  validateCategoryName,
} from "@/lib/categories";
import { validateImageUpload } from "@/lib/image-validation";

const COLLECTION = "categories";
const MAX_CATEGORY_IMAGE_BYTES = 1 * 1024 * 1024; // 1MB

function isAlreadyExists(error: any): boolean {
  return (
    error?.code === 6 ||
    error?.code === "6" ||
    error?.code === "already-exists" ||
    error?.code === "ALREADY_EXISTS"
  );
}

// Duck-typed check for a usable (non-empty) multipart file entry.
function isUsableFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as File).size === "number" &&
    (value as File).size > 0
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

// PUT /api/admin/categories — update a category's presentation fields and/or
// image (admin or superadmin only). Built-in categories can be customised too,
// but only through the optional fields: the name and builtIn flag always come
// from code and are never written into the doc.
export async function PUT(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, error: "Invalid form data" },
        { status: 400 }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, error: "Invalid form data" },
        { status: 400 }
      );
    }

    const id = formData.get("id");
    if (typeof id !== "string" || !isValidCategoryId(id)) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const builtIn = isDefaultCategorySlug(id);
    const docRef = adminDb.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!builtIn && !snap.exists) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }
    const existing = (snap.data() as Record<string, unknown>) || {};

    // Build the update payload from the recognized fields only. Unrecognized
    // or malformed values are rejected; anything not sent is left untouched.
    const update: Record<string, unknown> = {};

    const taglineRaw = formData.get("tagline");
    if (taglineRaw !== null) {
      const taglineResult = normalizeTagline(taglineRaw);
      if (!taglineResult.ok) {
        return NextResponse.json(
          { success: false, error: taglineResult.error },
          { status: 400 }
        );
      }
      update.tagline = taglineResult.tagline;
    }

    const showRaw = formData.get("showOnHomepage");
    if (showRaw !== null) {
      if (showRaw !== "true" && showRaw !== "false") {
        return NextResponse.json(
          { success: false, error: "showOnHomepage must be true or false" },
          { status: 400 }
        );
      }
      update.showOnHomepage = showRaw === "true";
    }

    const removeRaw = formData.get("removeImage");
    if (removeRaw !== null && removeRaw !== "true" && removeRaw !== "false") {
      return NextResponse.json(
        { success: false, error: "removeImage must be true or false" },
        { status: 400 }
      );
    }
    const removeImage = removeRaw === "true";

    const file = formData.get("file");
    const hasFile = isUsableFile(file);

    if (removeImage && hasFile) {
      return NextResponse.json(
        { success: false, error: "removeImage and a new image cannot be combined" },
        { status: 400 }
      );
    }

    const bucket = adminStorage.bucket();
    let newPath: string | null = null;

    if (hasFile) {
      const validation = await validateImageUpload(file, MAX_CATEGORY_IMAGE_BYTES);
      if (!validation.ok) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }

      newPath = `categories/${id}/${crypto.randomUUID()}.${validation.ext}`;
      try {
        await bucket.file(newPath).save(validation.buffer, {
          metadata: {
            contentType: validation.contentType,
            cacheControl: "public, max-age=31536000, immutable",
          },
        });
      } catch (uploadError: any) {
        console.error("Category image upload to Storage failed:", uploadError);
        return NextResponse.json(
          { success: false, error: "Failed to upload image" },
          { status: 500 }
        );
      }

      update.imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(newPath)}?alt=media`;
      update.imagePath = newPath;
    } else if (removeImage) {
      update.imageUrl = null;
      update.imagePath = null;
    }

    update.updatedAt = new Date().toISOString();
    update.updatedBy = auth.uid;

    try {
      await docRef.set(update, { merge: true });
    } catch (writeError: any) {
      console.error("Firestore write failed after category image upload:", writeError);
      if (newPath) {
        try {
          await bucket.file(newPath).delete();
        } catch (rollbackError: any) {
          console.error("Rollback delete of new category image failed:", rollbackError);
        }
      }
      return NextResponse.json(
        { success: false, error: "Failed to update category" },
        { status: 500 }
      );
    }

    // Best-effort cleanup of the previous file, only after the write succeeded
    // and only when the image actually changed. Derive the old path from the
    // stored imagePath and never touch objects outside categories/<id>/.
    const oldPath = existing.imagePath;
    if (
      (hasFile || removeImage) &&
      typeof oldPath === "string" &&
      oldPath.startsWith(`categories/${id}/`) &&
      oldPath !== newPath
    ) {
      try {
        await bucket.file(oldPath).delete();
      } catch (deleteError: any) {
        console.error("Failed to delete previous category image:", deleteError);
      }
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/admin/categories error:", error);
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

    // Best-effort cleanup of every image stored under categories/<id>/.
    // Never fails the request — the category is already gone.
    try {
      await adminStorage.bucket().deleteFiles({ prefix: `categories/${id}/` });
    } catch (deleteError: any) {
      console.error("Best-effort delete of category images failed:", deleteError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/admin/categories error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
