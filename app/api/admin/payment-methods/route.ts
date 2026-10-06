import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySuperadminRequest } from "@/lib/admin-auth";
import {
  validatePaymentMethodInput,
  validatePaymentMethodPatch,
} from "@/lib/payment-methods";

const COLLECTION = "paymentMethods";

// GET /api/admin/payment-methods — list all methods (including inactive), ordered by sortOrder (superadmin only)
export async function GET(request: Request) {
  try {
    const auth = await verifySuperadminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy("sortOrder", "asc")
      .get();

    const methods = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, methods }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/payment-methods error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list payment methods" },
      { status: 500 }
    );
  }
}

// POST /api/admin/payment-methods — create a method (superadmin only)
export async function POST(request: Request) {
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

    const result = validatePaymentMethodInput(body);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const now = new Date().toISOString();
    const payload = {
      ...result.value,
      qrPath: null, // set later by the QR upload route (Step 4); not accepted from client
      qrUrl: null,
      createdAt: now,
      updatedAt: now,
      updatedBy: auth.uid,
    };

    const ref = await adminDb.collection(COLLECTION).add(payload);
    return NextResponse.json(
      { success: true, method: { id: ref.id, ...payload } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/payment-methods error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create payment method" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/payment-methods — update fields or toggle active (superadmin only). No DELETE; deactivate instead.
export async function PATCH(request: Request) {
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

    const { id, ...fields } = body;
    if (typeof id !== "string" || id.length < 1 || id.length > 128 || id.includes("/")) {
      return NextResponse.json({ success: false, error: "invalid id" }, { status: 400 });
    }

    const result = validatePaymentMethodPatch(fields);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const docRef = adminDb.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Payment method not found" }, { status: 404 });
    }

    const update = {
      ...result.value,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.uid,
    };

    await docRef.update(update);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/admin/payment-methods error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update payment method" },
      { status: 500 }
    );
  }
}
