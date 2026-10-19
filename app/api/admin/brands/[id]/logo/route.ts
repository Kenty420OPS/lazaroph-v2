import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { isValidBrandId } from "@/lib/brands";
import { validateImageUpload } from "@/lib/image-validation";

const COLLECTION = "brands";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB before processing (no server-side resize:
// the admin form compresses client-side via lib/client-image.ts first).

// POST /api/admin/brands/[id]/logo — upload/replace a brand logo (admin or
// superadmin only). Same shape as the payment-methods QR upload route:
// multipart form field "file", magic-byte validation, save to Storage with the
// Admin SDK, then update the brand doc with a rollback of the file if the
// Firestore write fails.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const id = params.id;
    if (!isValidBrandId(id)) {
      return NextResponse.json({ success: false, error: "invalid id" }, { status: 400 });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || typeof file !== "object" || !("arrayBuffer" in file) || (file as File).size === 0) {
      return NextResponse.json({ success: false, error: "file is required" }, { status: 400 });
    }

    const docRef = adminDb.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Brand not found" }, { status: 404 });
    }
    const existing = snap.data() as any;

    const validation = await validateImageUpload(file as File, MAX_LOGO_BYTES);
    if (!validation.ok) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // Stable, predictable path per the mission spec. Replacing a logo with the
    // same extension overwrites the same object, so the cache header is short.
    const storagePath = `brands/${id}/logo.${validation.ext}`;
    const bucket = adminStorage.bucket();
    const newFile = bucket.file(storagePath);

    try {
      await newFile.save(validation.buffer, {
        metadata: {
          contentType: validation.contentType,
          cacheControl: "public, max-age=3600",
        },
      });
    } catch (uploadError: any) {
      console.error("Brand logo upload to Storage failed:", uploadError);
      return NextResponse.json({ success: false, error: "Failed to upload image" }, { status: 500 });
    }

    const logoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

    try {
      await docRef.update({
        logoUrl,
        logoPath: storagePath,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.uid,
      });
    } catch (updateError: any) {
      console.error("Firestore update failed after brand logo upload; rolling back file:", updateError);
      // Only roll back when the previous file was not overwritten. When the
      // path is unchanged the old object is already gone, so deleting it too
      // would leave the stored URL 404ing.
      const oldPath = existing?.logoPath;
      if (typeof oldPath !== "string" || oldPath !== storagePath) {
        try {
          await newFile.delete();
        } catch (rollbackError: any) {
          console.error("Rollback delete of new brand logo failed:", rollbackError);
        }
      }
      return NextResponse.json(
        { success: false, error: "Failed to update brand" },
        { status: 500 }
      );
    }

    // Best-effort cleanup of the previous logo file, only after the doc write
    // succeeded and only when the extension changed. Never touch objects
    // outside brands/<id>/.
    const oldPath = existing?.logoPath;
    if (
      typeof oldPath === "string" &&
      oldPath.startsWith(`brands/${id}/`) &&
      oldPath !== storagePath
    ) {
      try {
        await bucket.file(oldPath).delete();
      } catch (deleteError: any) {
        console.error("Failed to delete previous brand logo:", deleteError);
      }
    }

    return NextResponse.json({ success: true, logoPath: storagePath, logoUrl }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/admin/brands/[id]/logo error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload logo" }, { status: 500 });
  }
}
