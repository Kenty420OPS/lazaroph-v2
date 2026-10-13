import { NextResponse } from "next/server";
import { adminDb, adminAuth, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getShippingFee, VALID_COURIERS, VALID_REGIONS, isMetroManila } from "@/lib/shipping";
import { getBranch, DEFAULT_PICKUP_BRANCH_ID } from "@/lib/branches";
import { isProductActive, getChargedPrice } from "@/lib/product";

const MAX_QTY_PER_ITEM = 99;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const nameRaw = (formData.get("name") as string | null) ?? "";
    const contactRaw = (formData.get("contact") as string | null) ?? "";
    const addressRaw = (formData.get("address") as string | null) ?? "";
    const courier = (formData.get("courier") as string | null) ?? "";
    const region = (formData.get("region") as string | null) ?? "";
    const city = formData.get("city") as string | null;
    const metroManilaAcknowledged = formData.get("metroManilaAcknowledged") as string | null;
    const paymentMethodId = (formData.get("paymentMethodId") as string | null) ?? "";
    const referenceNumberRaw = (formData.get("referenceNumber") as string | null) ?? "";
    const cartStr = formData.get("cart") as string;
    const paymentImage = formData.get("paymentImage") as File;

    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
    const contact = typeof contactRaw === "string" ? contactRaw.trim() : "";
    const address = typeof addressRaw === "string" ? addressRaw.trim() : "";
    const referenceNumber = typeof referenceNumberRaw === "string" ? referenceNumberRaw.trim() : "";

    // Derive the chat uid from a verified ID token only. The client-supplied
    // `uid` form field is NOT trusted for conversation writes.
    let chatUid: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(token);
          chatUid = decodedToken.uid;
        } catch (authError) {
          console.error("Failed to verify ID token for chat association:", authError);
          chatUid = null;
        }
      }
    }

    if (!name || name.length > 100) {
      return NextResponse.json({ success: false, error: "Full name must be between 1 and 100 characters" }, { status: 400 });
    }

    const contactDigits = contact.replace(/\D/g, "");
    if (!contact || contact.length > 50 || contactDigits.length < 7 || contactDigits.length > 15) {
      return NextResponse.json({ success: false, error: "Contact must have between 7 and 15 digits and be at most 50 characters" }, { status: 400 });
    }

    if (courier !== "Pickup" && (!address || address.length > 500)) {
      return NextResponse.json({ success: false, error: "Address must be between 1 and 500 characters" }, { status: 400 });
    }

    if (referenceNumber.length < 4 || referenceNumber.length > 64) {
      return NextResponse.json({ success: false, error: "Reference number must be between 4 and 64 characters" }, { status: 400 });
    }

    if (!cartStr || !paymentImage) {
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

    if (cart.length > 50) {
      return NextResponse.json({ success: false, error: "Cart exceeds maximum items" }, { status: 400 });
    }

    // 1. Validate each item shape and sum ordered quantity per product id across all cart lines
    const totalQtyByProduct: Record<string, number> = {};

    for (const raw of cart) {
      const id = raw?.id;
      const quantity = raw?.quantity;

      if (typeof id !== "string" || !id) {
        return NextResponse.json({ success: false, error: "Each cart item must have a product id" }, { status: 400 });
      }
      if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
        return NextResponse.json({ success: false, error: `Quantity for product ${id} must be a positive integer no greater than ${MAX_QTY_PER_ITEM}` }, { status: 400 });
      }

      totalQtyByProduct[id] = (totalQtyByProduct[id] || 0) + quantity;
    }

    // 2. Fetch unique product documents and verify availability & stock against summed quantity
    const productMap: Record<string, any> = {};

    for (const id of Object.keys(totalQtyByProduct)) {
      const totalQty = totalQtyByProduct[id];
      const snap = await adminDb.collection("products").doc(id).get();
      if (!snap.exists) {
        return NextResponse.json({ success: false, error: `Product not found: ${id}` }, { status: 400 });
      }

      const product: any = snap.data();
      if (!isProductActive(product)) {
        return NextResponse.json({ success: false, error: `Product is not available: ${id}` }, { status: 400 });
      }
      if (typeof product.stock === "number" && product.stock < 1) {
        return NextResponse.json({ success: false, error: `Product is out of stock: ${id}` }, { status: 400 });
      }
      if (typeof product.stock === "number" && product.stock < totalQty) {
        return NextResponse.json({ success: false, error: `Insufficient stock for product ${id}` }, { status: 400 });
      }

      productMap[id] = product;
    }

    // 3. Build order items and recompute subtotal from Firestore data
    const items: any[] = [];
    let subtotal = 0;

    for (const raw of cart) {
      const id = raw.id;
      const quantity = raw.quantity;
      const product = productMap[id];

      const chargedPrice = getChargedPrice(product);
      if (!Number.isFinite(chargedPrice) || chargedPrice <= 0) {
        return NextResponse.json({ success: false, error: `Product is not available: ${id}` }, { status: 400 });
      }

      const item: any = {
        id,
        name: product.name || product.title || "",
        price: chargedPrice,
        imageUrl: product.imageUrl || product.mainImageUrl || "",
        quantity,
      };
      const originalPrice = Number(product.price);
      if (Number.isFinite(originalPrice) && chargedPrice < originalPrice) {
        item.originalPrice = originalPrice;
      }
      if (typeof product.sku === "string" && product.sku !== "") {
        item.sku = product.sku;
      }

      items.push(item);
      subtotal += chargedPrice * quantity;
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

    if (chatUid) {
      try {
        const convRef = adminDb.collection("conversations").doc(chatUid);
        const messagesRef = convRef.collection("messages");
        
        const convSnap = await convRef.get();
        const batch = adminDb.batch();
        const text = `Thank you for your order! Your Order ID is: ${docRef.id}. You can use this to track your order.`;
        
        if (!convSnap.exists) {
          batch.set(convRef, {
            customerId: chatUid,
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
      { success: false, error: "Failed to process order" },
      { status: 500 }
    );
  }
}
