import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getShippingFee, VALID_COURIERS, VALID_REGIONS, isMetroManila } from "@/lib/shipping";
import { getBranch, DEFAULT_PICKUP_BRANCH_ID } from "@/lib/branches";

const MAX_QTY_PER_ITEM = 99;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const contact = formData.get("contact") as string;
    const address = formData.get("address") as string;
    const courier = formData.get("courier") as string;
    const region = formData.get("region") as string;
    const city = formData.get("city") as string | null;
    const metroManilaAcknowledged = formData.get("metroManilaAcknowledged") as string | null;
    const paymentMethodId = formData.get("paymentMethodId") as string;
    const referenceNumber = formData.get("referenceNumber") as string;
    const cartStr = formData.get("cart") as string;
    const paymentImage = formData.get("paymentImage") as File;
    const uid = formData.get("uid") as string | null;

    if (!name || !contact || !referenceNumber || !cartStr || !paymentImage) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }
    if (courier !== "Pickup" && !address) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // NOTE: client-sent `total` and `shippingFee` are intentionally ignored.
    // All pricing is recomputed server-side below.

    if (!courier || !VALID_COURIERS.includes(courier as any)) {
      return NextResponse.json({ success: false, error: "Invalid courier" }, { status: 400 });
    }

    if (courier === "LBC" && !VALID_REGIONS.includes(region)) {
      return NextResponse.json({ success: false, error: "Invalid or missing region for LBC" }, { status: 400 });
    }

    if (courier === "Lalamove") {
      const trimmedCity = typeof city === "string" ? city.trim() : "";
      if (metroManilaAcknowledged !== "true" || !trimmedCity || !isMetroManila(trimmedCity)) {
        return NextResponse.json(
          { success: false, error: "Lalamove delivery is available within Metro Manila only." },
          { status: 400 }
        );
      }
    }
    if (courier === "Pickup") {
      // No region or city required for pickup
    }

    let cart: any[] = [];
    try {
      const parsed = JSON.parse(cartStr);
      cart = Array.isArray(parsed) ? parsed : (typeof parsed === 'object' && parsed !== null ? Object.values(parsed) : []);
    } catch (e) {
      return NextResponse.json({ success: false, error: "Invalid cart data" }, { status: 400 });
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty" }, { status: 400 });
    }

    // Validate each item shape and recompute pricing from Firestore
    const items: any[] = [];
    let subtotal = 0;

    for (const raw of cart) {
      const id = raw?.id;
      const quantity = raw?.quantity;

      if (typeof id !== "string" || !id) {
        return NextResponse.json({ success: false, error: "Each cart item must have a product id" }, { status: 400 });
      }
      if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
        return NextResponse.json({ success: false, error: `Quantity for product ${id} must be a positive integer no greater than ${MAX_QTY_PER_ITEM}` }, { status: 400 });
      }

      const snap = await adminDb.collection("products").doc(id).get();
      if (!snap.exists) {
        return NextResponse.json({ success: false, error: `Product not found: ${id}` }, { status: 400 });
      }

      const product: any = snap.data();
      if (product.deleted === true || product.hidden === true || product.isActive === false) {
        return NextResponse.json({ success: false, error: `Product is not available: ${id}` }, { status: 400 });
      }
      if (typeof product.stock === "number" && product.stock < 1) {
        return NextResponse.json({ success: false, error: `Product is out of stock: ${id}` }, { status: 400 });
      }

      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ success: false, error: `Product has invalid price: ${id}` }, { status: 400 });
      }

      items.push({
        id,
        name: product.name || product.title || "",
        price,
        imageUrl: product.imageUrl || product.mainImageUrl || "",
        quantity,
      });
      subtotal += price * quantity;
    }

    const shippingFee = getShippingFee(courier, region);
    const total = subtotal + shippingFee;

    // Validate the selected payment method BEFORE validating/uploading the proof image
    let paymentMethodDoc: any = null;
    if (typeof paymentMethodId !== "string" || paymentMethodId.length < 1 || paymentMethodId.length > 128 || paymentMethodId.includes("/")) {
      return NextResponse.json({ success: false, error: "Invalid payment method" }, { status: 400 });
    }
    try {
      const pmSnap = await adminDb.collection("paymentMethods").doc(paymentMethodId).get();
      if (!pmSnap.exists || pmSnap.data()?.active !== true) {
        return NextResponse.json({ success: false, error: "Selected payment method is not available" }, { status: 400 });
      }
      paymentMethodDoc = pmSnap.data();
    } catch (pmError: any) {
      console.error("Failed to load payment method:", pmError);
      return NextResponse.json({ success: false, error: "Failed to process order" }, { status: 500 });
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
        address: courier === "Pickup" ? "" : address,
      },
      shipping: {
        courier,
        shippingFee,
      },
      payment: {
        method: paymentMethodDoc.name,
        methodId: paymentMethodId,
        methodType: paymentMethodDoc.type,
        accountName: paymentMethodDoc.accountName,
        accountNumber: paymentMethodDoc.accountNumber,
        instructions: paymentMethodDoc.instructions ?? null,
        referenceNumber,
        proofImageUrl: paymentImageUrl,
        proofImagePath: storagePath, // Stored for generating secure signed URLs later
      },
      items,
      subtotal,
      total,
      status: "pending_payment",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (courier === "LBC" && region) {
      orderPayload.shipping.region = region;
    }

    if (courier === "Lalamove") {
      orderPayload.shipping.city = typeof city === "string" ? city.trim() : "";
      orderPayload.shipping.metroManilaAcknowledged = true;
    }

    if (courier === "Pickup") {
      const branch = getBranch(DEFAULT_PICKUP_BRANCH_ID);
      if (branch) {
        orderPayload.shipping.branchId = branch.id;
        orderPayload.shipping.branchName = branch.name;
        orderPayload.shipping.branchAddress = branch.address;
      } else {
        orderPayload.shipping.branchId = DEFAULT_PICKUP_BRANCH_ID;
      }
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
