import { NextResponse } from "next/server";
import { adminDb, adminAuth, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { calculateShippingFee, VALID_COURIERS, VALID_REGIONS, isMetroManila } from "@/lib/shipping";
import { getBranch, DEFAULT_PICKUP_BRANCH_ID } from "@/lib/branches";
import { isProductActive, getChargedPrice, hasSizeSystem, getTotalStock } from "@/lib/product";
import { createRateLimiter } from "@/lib/rate-limit";

const MAX_QTY_PER_ITEM = 99;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const orderLimiter = createRateLimiter({ maxRequests: 10, windowMs: 10 * 60 * 1000 });

// Business failure inside the order transaction. Kept small and typed so the
// catch around runTransaction can map it back to a JSON response.
class OrderError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OrderError";
    this.status = status;
    Object.setPrototypeOf(this, OrderError.prototype);
  }
}

function isOrderError(error: any): error is OrderError {
  return (
    error instanceof OrderError ||
    (error?.name === "OrderError" &&
      typeof error?.status === "number" &&
      typeof error?.message === "string")
  );
}

export async function POST(request: Request) {
  try {
    const xForwardedFor = request.headers.get("x-forwarded-for");
    let ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : null;
    if (!ip) {
      const xRealIp = request.headers.get("x-real-ip");
      ip = xRealIp ? xRealIp.trim() : null;
    }

    if (ip) {
      const { allowed, retryAfterSeconds } = orderLimiter(ip);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfterSeconds) },
          }
        );
      }
    }

    const formData = await request.formData();

    const rawIdempotencyKey = formData.get("idempotencyKey");
    const idempotencyKey =
      typeof rawIdempotencyKey === "string" && UUID_REGEX.test(rawIdempotencyKey)
        ? rawIdempotencyKey
        : null;

    const nameRaw = (formData.get("name") as string | null) ?? "";
    const contactRaw = (formData.get("contact") as string | null) ?? "";
    const addressRaw = (formData.get("address") as string | null) ?? "";
    const courier = (formData.get("courier") as string | null) ?? "";
    const region = (formData.get("region") as string | null) ?? "";
    const city = formData.get("city") as string | null;
    const metroManilaAcknowledged = formData.get("metroManilaAcknowledged") as string | null;
    const lbcFeeAcknowledged = formData.get("lbcFeeAcknowledged") as string | null;
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

    if (idempotencyKey) {
      const existingSnap = await adminDb.collection("orders").doc(idempotencyKey).get();
      if (existingSnap.exists) {
        const existingData = existingSnap.data();
        if (existingData?.customer?.contact === contact) {
          return NextResponse.json({
            success: true,
            message: "Order placed successfully",
            orderId: existingSnap.id,
          });
        }
        return NextResponse.json(
          { success: false, error: "Duplicate request" },
          { status: 409 }
        );
      }
    }

    // NOTE: client-sent `total` and `shippingFee` are intentionally ignored.
    // All pricing is recomputed server-side below.

    if (!courier || !VALID_COURIERS.includes(courier as any)) {
      return NextResponse.json({ success: false, error: "Invalid courier" }, { status: 400 });
    }

    if (courier === "LBC" && !VALID_REGIONS.includes(region)) {
      return NextResponse.json({ success: false, error: "Invalid or missing region for LBC" }, { status: 400 });
    }

    if (courier === "LBC" && lbcFeeAcknowledged !== "true") {
      return NextResponse.json(
        { success: false, error: "Please confirm the LBC per-pair shipping fee to continue." },
        { status: 400 }
      );
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

    // 1. Validate each item shape and sum ordered quantity per composite key
    // (productId + "::" + size) across all cart lines. A legacy line without a
    // size keeps the empty size.
    const lines: { id: string; quantity: number; size: string }[] = [];
    const totalQtyByKey: Record<string, number> = {};
    const totalQtyByProduct: Record<string, number> = {};

    for (const raw of cart) {
      const id = raw?.id;
      const quantity = raw?.quantity;
      const size = typeof raw?.size === "string" ? raw.size.trim() : "";

      if (typeof id !== "string" || !id) {
        return NextResponse.json({ success: false, error: "Each cart item must have a product id" }, { status: 400 });
      }
      if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
        return NextResponse.json({ success: false, error: `Quantity for product ${id} must be a positive integer no greater than ${MAX_QTY_PER_ITEM}` }, { status: 400 });
      }

      lines.push({ id, quantity, size });
      const key = `${id}::${size}`;
      totalQtyByKey[key] = (totalQtyByKey[key] || 0) + quantity;
      totalQtyByProduct[id] = (totalQtyByProduct[id] || 0) + quantity;
    }

    const productIds = Array.from(new Set(lines.map((line) => line.id)));
    const productRefs = productIds.map((productId) => adminDb.collection("products").doc(productId));

    // LBC is charged per pair: the fee needs the summed quantity of every cart
    // line. Each line quantity is already validated above; this keeps the
    // derived total explicit and rejects a non-positive/non-integer total.
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
    if (!Number.isInteger(totalQuantity) || totalQuantity < 1) {
      return NextResponse.json({ success: false, error: "Cart quantity must be a positive integer" }, { status: 400 });
    }

    const shippingFee = calculateShippingFee(courier, region, totalQuantity);

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

    // 3. Build the order document. items/subtotal/total are filled in from the
    // transaction snapshots below.
    const baseOrderPayload: any = {
      customer: {
        name,
        contact,
        address: courier === "Pickup" ? "" : address,
      },
      userId: chatUid ?? null,
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
      status: "pending_payment",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (courier === "LBC" && region) {
      baseOrderPayload.shipping.region = region;
    }

    if (courier === "Lalamove") {
      baseOrderPayload.shipping.city = typeof city === "string" ? city.trim() : "";
      baseOrderPayload.shipping.metroManilaAcknowledged = true;
    }

    if (courier === "Pickup") {
      const branch = getBranch(DEFAULT_PICKUP_BRANCH_ID);
      if (branch) {
        baseOrderPayload.shipping.branchId = branch.id;
        baseOrderPayload.shipping.branchName = branch.name;
        baseOrderPayload.shipping.branchAddress = branch.address;
      } else {
        baseOrderPayload.shipping.branchId = DEFAULT_PICKUP_BRANCH_ID;
      }
    }

    // 4. Stock check, stock decrement and order create happen in ONE Firestore
    // transaction. The idempotency key is the order document id, so a retry
    // collides and is detected on the first read. The callback may run more
    // than once, so it must stay side-effect free: no Storage, network or chat
    // calls inside, and no mutation of the outer scope.
    const orderRef = idempotencyKey
      ? adminDb.collection("orders").doc(idempotencyKey)
      : adminDb.collection("orders").doc();

    let txResult: { created: boolean; orderId: string };
    try {
      txResult = await adminDb.runTransaction(async (t) => {
        // 4a. Idempotency read first: an existing order writes nothing (no
        // validation, no decrement, no create).
        const existingOrderSnap = await t.get(orderRef);
        if (existingOrderSnap.exists) {
          return { created: false, orderId: existingOrderSnap.id };
        }

        // 4b. Read every product with a single getAll. All reads happen before
        // any write.
        const productSnaps = await t.getAll(...productRefs);
        const productMap: Record<string, any> = {};
        productSnaps.forEach((snap, index) => {
          productMap[productIds[index]] = snap.exists ? snap.data() : null;
        });

        // 4c. Validate the cart against these snapshots.
        for (const productId of productIds) {
          const product: any = productMap[productId];
          if (!product) {
            throw new OrderError(400, `Product not found: ${productId}`);
          }
          if (!isProductActive(product)) {
            throw new OrderError(400, `Product is not available: ${productId}`);
          }

          if (hasSizeSystem(product)) {
            const productName = String(product.name || product.title || productId);
            for (const line of lines) {
              if (line.id !== productId) continue;
              if (!line.size) {
                throw new OrderError(400, `Size is required for ${productName}`);
              }
              const sizeEntry = product.sizes.find((size: any) => size && size.label === line.size);
              if (!sizeEntry || sizeEntry.active === false) {
                throw new OrderError(400, `Size not available for ${productName} (${line.size})`);
              }
              const availableStock =
                typeof sizeEntry.stock === "number" && Number.isFinite(sizeEntry.stock) ? sizeEntry.stock : 0;
              const requiredQty = totalQtyByKey[`${productId}::${line.size}`] || 0;
              if (availableStock < requiredQty) {
                throw new OrderError(400, `Insufficient stock for ${productName} (${line.size})`);
              }
            }
          } else {
            // Legacy products keep the single numeric stock field: a product
            // with no numeric stock field passes, and a carried size is ignored.
            const totalQty = totalQtyByProduct[productId];
            if (typeof product.stock === "number" && product.stock < 1) {
              throw new OrderError(400, `Product is out of stock: ${productId}`);
            }
            if (typeof product.stock === "number" && product.stock < totalQty) {
              throw new OrderError(400, `Insufficient stock for product ${productId}`);
            }
          }
        }

        // 4d. Build order items and totals from these snapshots.
        const items: any[] = [];
        let subtotal = 0;

        for (const line of lines) {
          const product = productMap[line.id];

          const chargedPrice = getChargedPrice(product);
          if (!Number.isFinite(chargedPrice) || chargedPrice <= 0) {
            throw new OrderError(400, `Product is not available: ${line.id}`);
          }

          const item: any = {
            id: line.id,
            name: product.name || product.title || "",
            price: chargedPrice,
            imageUrl: product.imageUrl || product.mainImageUrl || "",
            quantity: line.quantity,
          };
          const originalPrice = Number(product.price);
          if (Number.isFinite(originalPrice) && chargedPrice < originalPrice) {
            item.originalPrice = originalPrice;
          }
          if (typeof product.sku === "string" && product.sku !== "") {
            item.sku = product.sku;
          }
          if (hasSizeSystem(product)) {
            item.size = line.size;
          }

          items.push(item);
          subtotal += chargedPrice * line.quantity;
        }

        const total = subtotal + shippingFee;

        // 4e. Writes: create the order first (same document id as before, so a
        // retry collides), then decrement stock per product.
        t.create(orderRef, { ...baseOrderPayload, items, subtotal, total, stockDecremented: true });

        for (let index = 0; index < productIds.length; index++) {
          const productId = productIds[index];
          const product = productMap[productId];
          const updatedAt = new Date().toISOString();

          if (hasSizeSystem(product)) {
            // Rewrite the whole sizes array (never dotted field paths) and
            // reduce each affected size by its summed quantity.
            const newSizes = product.sizes.map((sizeEntry: any) => {
              if (!sizeEntry || typeof sizeEntry.label !== "string") return sizeEntry;
              const qty = totalQtyByKey[`${productId}::${sizeEntry.label}`];
              if (!qty) return sizeEntry;
              const currentStock =
                typeof sizeEntry.stock === "number" && Number.isFinite(sizeEntry.stock) ? sizeEntry.stock : 0;
              return { ...sizeEntry, stock: currentStock - qty };
            });
            t.update(productRefs[index], {
              sizes: newSizes,
              stock: getTotalStock({ ...product, sizes: newSizes }),
              updatedAt,
            });
          } else if (typeof product.stock === "number") {
            t.update(productRefs[index], {
              stock: product.stock - totalQtyByProduct[productId],
              updatedAt,
            });
          }
        }

        return { created: true, orderId: orderRef.id };
      });
    } catch (txError) {
      try {
        await file.delete();
      } catch (deleteError) {
        console.error("Failed to clean up payment image:", deleteError);
      }
      if (isOrderError(txError)) {
        return NextResponse.json({ success: false, error: txError.message }, { status: txError.status });
      }
      throw txError;
    }

    if (!txResult.created) {
      // Idempotent retry: the order already exists, so the freshly uploaded
      // proof image is discarded and the stored order is returned.
      try {
        await file.delete();
      } catch (deleteError) {
        console.error("Failed to clean up duplicate payment image:", deleteError);
      }

      const existingSnap = await adminDb.collection("orders").doc(txResult.orderId).get();
      if (existingSnap.exists) {
        const existingData = existingSnap.data();
        if (existingData?.customer?.contact === contact) {
          return NextResponse.json({
            success: true,
            message: "Order placed successfully",
            orderId: existingSnap.id,
          });
        }
      }
      return NextResponse.json(
        { success: false, error: "Duplicate request" },
        { status: 409 }
      );
    }

    const orderId = txResult.orderId;

    if (chatUid) {
      try {
        const convRef = adminDb.collection("conversations").doc(chatUid);
        const messagesRef = convRef.collection("messages");
        
        const convSnap = await convRef.get();
        const batch = adminDb.batch();
        const text = `Thank you for your order! Your Order ID is: ${orderId}. You can use this to track your order.`;
        
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
      orderId,
    });
  } catch (globalError: any) {
    console.error("POST /api/orders error:", globalError);
    return NextResponse.json(
      { success: false, error: "Failed to process order" },
      { status: 500 }
    );
  }
}
