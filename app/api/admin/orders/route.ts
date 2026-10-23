import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { isValidStatusForCourier } from "@/lib/order-status";
import { hasSizeSystem, getTotalStock } from "@/lib/product";

export const dynamic = "force-dynamic";

// Thrown inside the status transaction when the order disappeared between the
// pre-read and the transaction so the response stays 404 (not a generic 500).
class OrderStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OrderStatusError";
    this.status = status;
    Object.setPrototypeOf(this, OrderStatusError.prototype);
  }
}

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const snapshot = await adminDb!.collection("orders").orderBy("createdAt", "desc").get();
    
    // Process orders to inject short-lived signed URLs for payment proof images
    const bucket = adminStorage.bucket();
    const orders = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let secureUrl = null;
      
      // Determine the storage path (use explicit field or extract from legacy URL)
      let storagePath = data.payment?.proofImagePath;
      if (!storagePath && data.payment?.proofImageUrl) {
        // Try to parse legacy URL: https://firebasestorage.googleapis.com/v0/b/.../o/payments%2F123.jpg?alt=media
        try {
          const urlObj = new URL(data.payment.proofImageUrl);
          const pathParam = urlObj.pathname.split('/o/')[1];
          if (pathParam) {
            storagePath = decodeURIComponent(pathParam);
          }
        } catch (e) {
          console.error("Failed to parse legacy proof image URL:", e);
        }
      }

      // Validate storagePath to prevent directory traversal and unauthorized access
      if (storagePath) {
        if (!storagePath.startsWith("payments/") || storagePath.includes("..")) {
          console.warn("Invalid storagePath detected, skipping signed URL generation:", storagePath);
          storagePath = null;
        }
      }

      if (storagePath) {
        try {
          // Generate a 60-minute signed URL
          const [url] = await bucket.file(storagePath).getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000,
          });
          secureUrl = url;
        } catch (e) {
          console.error("Failed to generate signed URL for", storagePath, e);
        }
      }

      return { 
        id: doc.id, 
        ...data,
        payment: {
          ...data.payment,
          // Inject the secure temporary URL for the admin UI to use
          secureProofImageUrl: secureUrl || data.payment?.proofImageUrl
        }
      };
    }));

    return NextResponse.json({ success: true, orders }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}

// PATCH /api/admin/orders?id=<orderId> — update order status
// Merged from former /api/admin/orders/[id]/route.ts to reduce serverless function count.
export async function PATCH(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 });
    }

    if (typeof status !== "string") {
      return NextResponse.json({ success: false, error: "Status must be a string" }, { status: 400 });
    }

    const orderRef = adminDb!.collection("orders").doc(id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const courier = orderSnap.data()?.shipping?.courier;
    if (!isValidStatusForCourier(status, courier)) {
      return NextResponse.json(
        { success: false, error: "Invalid status for this shipping method" },
        { status: 400 }
      );
    }

    // Status update (and, on a first-time cancel of a stock-decremented order,
    // the stock restore) happens in ONE Firestore transaction: all reads come
    // before all writes, so the restore can never run twice. The callback may
    // run more than once, so it stays free of Storage and network calls.
    await adminDb!.runTransaction(async (t) => {
      // READS first.
      const snap = await t.get(orderRef);
      if (!snap.exists) {
        throw new OrderStatusError(404, "Order not found");
      }
      const order = snap.data()!;

      const shouldRestore =
        status === "cancelled" &&
        order.status !== "cancelled" &&
        order.stockDecremented === true &&
        order.stockRestored !== true;

      // Product ids only in the restore case, read with ONE getAll.
      const items: any[] = Array.isArray(order.items) ? order.items : [];
      const productIds = shouldRestore
        ? Array.from(
            new Set(
              items
                .map((item: any) => item?.id)
                .filter((pid: any) => typeof pid === "string" && pid !== "")
            )
          )
        : [];
      const productRefs = productIds.map((pid) => adminDb!.collection("products").doc(pid));
      const productSnaps = productRefs.length > 0 ? await t.getAll(...productRefs) : [];
      const productMap: Record<string, any> = {};
      productSnaps.forEach((ps, i) => {
        productMap[productIds[i]] = ps.exists ? ps.data() : null;
      });

      // WRITES.
      const updatedAt = new Date().toISOString();
      const orderUpdate: Record<string, any> = { status, updatedAt };
      if (shouldRestore) {
        orderUpdate.stockRestored = true;
      }
      t.update(orderRef, orderUpdate);

      if (!shouldRestore) return;

      // Sum the restored quantity per product: sized lines per size label,
      // legacy lines (no size) per product for the plain stock field.
      const restoreByProduct: Record<string, number> = {};
      const restoreBySize: Record<string, Record<string, number>> = {};
      for (const item of items) {
        if (!item || typeof item.id !== "string" || item.id === "") continue;
        const qty = item.quantity;
        if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) continue;
        if (typeof item.size === "string" && item.size !== "") {
          restoreBySize[item.id] = restoreBySize[item.id] || {};
          restoreBySize[item.id][item.size] = (restoreBySize[item.id][item.size] || 0) + qty;
        } else {
          restoreByProduct[item.id] = (restoreByProduct[item.id] || 0) + qty;
        }
      }

      for (let i = 0; i < productIds.length; i++) {
        const pid = productIds[i];
        const product = productMap[pid];
        if (!product) continue; // Product no longer exists — skip it.

        if (hasSizeSystem(product)) {
          const sizeSums = restoreBySize[pid] || {};
          if (Object.keys(sizeSums).length === 0) continue;
          // Rewrite the whole sizes array (never dotted field paths). Exact
          // label match; a label that is no longer in sizes is skipped.
          const newSizes = product.sizes.map((sizeEntry: any) => {
            if (!sizeEntry || typeof sizeEntry.label !== "string") return sizeEntry;
            const qty = sizeSums[sizeEntry.label];
            if (!qty) return sizeEntry;
            const currentStock =
              typeof sizeEntry.stock === "number" && Number.isFinite(sizeEntry.stock)
                ? sizeEntry.stock
                : 0;
            return { ...sizeEntry, stock: currentStock + qty };
          });
          t.update(productRefs[i], {
            sizes: newSizes,
            stock: getTotalStock({ ...product, sizes: newSizes }),
            updatedAt,
          });
        } else {
          const qty = restoreByProduct[pid] || 0;
          if (qty > 0 && typeof product.stock === "number") {
            t.update(productRefs[i], {
              stock: product.stock + qty,
              updatedAt,
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    if (error instanceof OrderStatusError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Error updating order:", error);
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}
