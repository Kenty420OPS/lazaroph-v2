import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
