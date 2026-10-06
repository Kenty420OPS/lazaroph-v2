import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { verifySuperadminRequest } from "@/lib/admin-auth";
import { validateImageUpload } from "@/lib/image-validation";

const MAX_QR_BYTES = 1 * 1024 * 1024; // 1MB

function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.length >= 1 && id.length <= 128 && !id.includes("/");
}

// POST /api/admin/payment-methods/qr — upload/replace a payment method QR image (superadmin only)
export async function POST(request: Request) {
  try {
    const auth = await verifySuperadminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
    }

    const id = formData.get("id");
    const file = formData.get("file");

    if (!isValidId(id)) {
      return NextResponse.json({ success: false, error: "invalid id" }, { status: 400 });
    }
    if (!file || typeof file !== "object" || !("arrayBuffer" in file) || (file as File).size === 0) {
      return NextResponse.json({ success: false, error: "file is required" }, { status: 400 });
    }

    const docRef = adminDb.collection("paymentMethods").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Payment method not found" }, { status: 404 });
    }
    const existing = snap.data() as any;

    const validation = await validateImageUpload(file as File, MAX_QR_BYTES);
    if (!validation.ok) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const storagePath = `payment-methods/${id}_${crypto.randomUUID()}.${validation.ext}`;
    const bucket = adminStorage.bucket();
    const newFile = bucket.file(storagePath);

    try {
      await newFile.save(validation.buffer, {
        metadata: {
          contentType: validation.contentType,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
    } catch (uploadError: any) {
      console.error("QR upload to Storage failed:", uploadError);
      return NextResponse.json({ success: false, error: "Failed to upload image" }, { status: 500 });
    }

    const qrUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

    try {
      await docRef.update({
        qrPath: storagePath,
        qrUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.uid,
      });
    } catch (updateError: any) {
      console.error("Firestore update failed after QR upload; rolling back file:", updateError);
      try {
        await newFile.delete();
      } catch (rollbackError: any) {
        console.error("Rollback delete of new QR file failed:", rollbackError);
      }
      return NextResponse.json({ success: false, error: "Failed to update payment method" }, { status: 500 });
    }

    // Best-effort cleanup of the previous QR file
    const oldPath = existing?.qrPath;
    if (typeof oldPath === "string" && oldPath.startsWith("payment-methods/") && oldPath !== storagePath) {
      try {
        await bucket.file(oldPath).delete();
      } catch (deleteError: any) {
        console.error("Failed to delete previous QR file:", deleteError);
      }
    }

    return NextResponse.json({ success: true, qrPath: storagePath, qrUrl }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/admin/payment-methods/qr error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload QR image" }, { status: 500 });
  }
}

// DELETE /api/admin/payment-methods/qr — remove a payment method QR image (superadmin only)
export async function DELETE(request: Request) {
  try {
    const auth = await verifySuperadminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { id } = body;
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, error: "invalid id" }, { status: 400 });
    }

    const docRef = adminDb.collection("paymentMethods").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Payment method not found" }, { status: 404 });
    }

    const data = snap.data() as any;
    const qrPath = data?.qrPath;

    try {
      await docRef.update({
        qrPath: null,
        qrUrl: null,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.uid,
      });
    } catch (updateError: any) {
      console.error("Failed to update payment method doc:", updateError);
      return NextResponse.json({ success: false, error: "Failed to update payment method" }, { status: 500 });
    }

    // Best effort: only touch Storage after the doc update succeeded
    if (typeof qrPath === "string" && qrPath.startsWith("payment-methods/")) {
      try {
        await adminStorage.bucket().file(qrPath).delete();
      } catch (deleteError: any) {
        console.error("Failed to delete QR file:", deleteError);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/admin/payment-methods/qr error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete QR image" }, { status: 500 });
  }
}
