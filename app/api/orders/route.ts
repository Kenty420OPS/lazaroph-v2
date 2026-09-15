import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const name = formData.get("name") as string;
    const contact = formData.get("contact") as string;
    const address = formData.get("address") as string;
    const courier = formData.get("courier") as string;
    const region = formData.get("region") as string;
    const shippingFee = parseFloat(formData.get("shippingFee") as string) || 0;
    const paymentMethod = formData.get("paymentMethod") as string;
    const referenceNumber = formData.get("referenceNumber") as string;
    const cartStr = formData.get("cart") as string;
    const total = parseFloat(formData.get("total") as string);
    const paymentImage = formData.get("paymentImage") as File;

    if (!name || !contact || !address || !referenceNumber || !cartStr || !paymentImage) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    let cart = [];
    try {
      cart = JSON.parse(cartStr);
    } catch (e) {
      return NextResponse.json({ success: false, error: "Invalid cart data" }, { status: 400 });
    }

    // 1. Upload the payment screenshot via Admin SDK
    const buffer = Buffer.from(await paymentImage.arrayBuffer());
    const safeFileName = `${Date.now()}_${paymentImage.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    
    const bucket = adminStorage.bucket();
    const file = bucket.file(`payments/${safeFileName}`);
    
    await file.save(buffer, {
      metadata: { contentType: paymentImage.type || "image/jpeg" },
    });
    
    const paymentImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(`payments/${safeFileName}`)}?alt=media`;

    // 2. Save order to Firestore
    const orderPayload: any = {
      customer: {
        name,
        contact,
        address,
      },
      shipping: {
        courier,
        shippingFee,
      },
      payment: {
        method: paymentMethod,
        referenceNumber,
        proofImageUrl: paymentImageUrl,
      },
      items: cart,
      total,
      status: "pending_verification",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (courier === "LBC" && region) {
      orderPayload.shipping.region = region;
    }

    const docRef = await adminDb.collection("orders").add(orderPayload);

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      orderId: docRef.id,
    });
  } catch (globalError: any) {
    console.error("POST /api/orders error:", globalError);
    return NextResponse.json(
      { success: false, error: globalError.message || "Failed to process order" },
      { status: 500 }
    );
  }
}
