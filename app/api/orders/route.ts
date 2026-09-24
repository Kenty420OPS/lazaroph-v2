import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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
    const uid = formData.get("uid") as string | null;

    if (!name || !contact || !address || !referenceNumber || !cartStr || !paymentImage) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    let cart = [];
    try {
      const parsed = JSON.parse(cartStr);
      cart = Array.isArray(parsed) ? parsed : (typeof parsed === 'object' && parsed !== null ? Object.values(parsed) : []);
    } catch (e) {
      return NextResponse.json({ success: false, error: "Invalid cart data" }, { status: 400 });
    }

    // 1. Validate payment image
    if (paymentImage.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Payment image must be under 5MB" }, { status: 400 });
    }
    
    // 2. Validate magic bytes and derive extension
    const buffer = Buffer.from(await paymentImage.arrayBuffer());
    let validatedMimeType = "";
    let ext = "";

    // Check magic bytes signatures
    if (buffer.length > 4 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      validatedMimeType = "image/jpeg";
      ext = "jpg";
    } else if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      validatedMimeType = "image/png";
      ext = "png";
    } else if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === "RIFF" && buffer.toString('ascii', 8, 12) === "WEBP") {
      validatedMimeType = "image/webp";
      ext = "webp";
    } else {
      return NextResponse.json({ success: false, error: "Payment image must be a valid image (JPEG, PNG, WEBP)" }, { status: 400 });
    }

    // 3. Upload the payment screenshot via Admin SDK
    const safeFileName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;
    const storagePath = `payments/${safeFileName}`;
    
    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);
    
    await file.save(buffer, {
      metadata: { contentType: validatedMimeType },
    });
    
    const paymentImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

    // 3. Save order to Firestore
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
        proofImagePath: storagePath, // Stored for generating secure signed URLs later
      },
      items: cart,
      total,
      status: "pending_payment",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (courier === "LBC" && region) {
      orderPayload.shipping.region = region;
    }

    const docRef = await adminDb.collection("orders").add(orderPayload);

    if (uid) {
      try {
        const convRef = adminDb.collection("conversations").doc(uid);
        const messagesRef = convRef.collection("messages");
        
        const convSnap = await convRef.get();
        const batch = adminDb.batch();
        const text = `Thank you for your order! Your Order ID is: ${docRef.id}. You can use this to track your order.`;
        
        if (!convSnap.exists) {
          batch.set(convRef, {
            customerId: uid,
            customerName: name || "Guest",
            lastMessage: text,
            updatedAt: FieldValue.serverTimestamp(),
            unreadAdmin: 0,
            unreadCustomer: 1
          });
        } else {
          batch.update(convRef, {
            lastMessage: text,
            updatedAt: FieldValue.serverTimestamp(),
            unreadCustomer: FieldValue.increment(1)
          });
        }

        const newMsgRef = messagesRef.doc();
        batch.set(newMsgRef, {
          senderId: "system",
          role: "admin",
          text,
          createdAt: FieldValue.serverTimestamp(),
          read: false
        });

        await batch.commit();
      } catch (chatError) {
        console.error("Failed to send automated chat message:", chatError);
        // Do not fail the order creation if the chat message fails
      }
    }

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
