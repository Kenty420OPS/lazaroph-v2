import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";
import { validateImageUpload } from "@/lib/image-validation";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_RATE_LIMIT,
  CHAT_MAX_TEXT_LENGTH,
  isValidConversationId,
} from "@/lib/chat";

export const dynamic = "force-dynamic";

const chatImageLimiter = createRateLimiter(CHAT_IMAGE_RATE_LIMIT);

function isStaffRole(role: unknown): boolean {
  return role === "admin" || role === "superadmin";
}

// POST /api/chat/send
// Sends an image message (with optional text) for a customer or an admin.
// The file is validated server-side (magic bytes + 1 MB cap), uploaded with the
// Admin SDK, then the message and conversation update are written in one
// transaction. If the Firestore write fails the uploaded file is rolled back.
// Text-only messages keep using the existing direct client path and never hit
// this route.
export async function POST(request: Request) {
  try {
    if (!adminAuth || !adminDb || !adminStorage) {
      console.error("Firebase Admin is not initialized. Check the Service Account env vars.");
      return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const isAdmin = isStaffRole((decodedToken as any).role);

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
    }

    const conversationIdRaw = formData.get("conversationId");
    const conversationId =
      typeof conversationIdRaw === "string" ? conversationIdRaw.trim() : "";

    if (!isValidConversationId(conversationId)) {
      return NextResponse.json({ success: false, error: "Invalid conversation" }, { status: 400 });
    }

    // Customers may only write to their own conversation (the id is their uid).
    // Admins may target any existing conversation.
    if (!isAdmin && conversationId !== uid) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const convRef = adminDb.collection("conversations").doc(conversationId);

    if (isAdmin) {
      const convSnap = await convRef.get();
      if (!convSnap.exists) {
        return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
      }
    }

    const textRaw = formData.get("text");
    const text = typeof textRaw === "string" ? textRaw.trim() : "";

    const fileEntry = formData.get("file");
    const file =
      fileEntry &&
      typeof fileEntry === "object" &&
      "arrayBuffer" in fileEntry &&
      "size" in fileEntry &&
      typeof (fileEntry as File).size === "number"
        ? (fileEntry as File)
        : null;
    const hasFile = !!file && file.size > 0;

    if (!text && !hasFile) {
      return NextResponse.json(
        { success: false, error: "Message or image is required" },
        { status: 400 }
      );
    }

    if (text.length > CHAT_MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Message must be ${CHAT_MAX_TEXT_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    let imagePath: string | null = null;
    let uploadedFile: { delete: () => Promise<unknown> } | null = null;

    if (hasFile) {
      // Basic abuse protection: limit image uploads per conversation.
      const rate = chatImageLimiter(`chat:${conversationId}`);
      if (!rate.allowed) {
        return NextResponse.json(
          { success: false, error: "Too many images. Please try again in a moment." },
          { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
        );
      }

      const validation = await validateImageUpload(file as File, CHAT_IMAGE_MAX_BYTES);
      if (!validation.ok) {
        return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
      }

      const storagePath = `chat/${conversationId}/${crypto.randomUUID()}.${validation.ext}`;
      const bucket = adminStorage.bucket();
      const newFile = bucket.file(storagePath);

      try {
        await newFile.save(validation.buffer, {
          metadata: {
            contentType: validation.contentType,
            cacheControl: "private, max-age=3600",
          },
        });
      } catch (uploadError: any) {
        console.error("Chat image upload to Storage failed:", uploadError);
        return NextResponse.json({ success: false, error: "Failed to upload image" }, { status: 500 });
      }

      imagePath = storagePath;
      uploadedFile = newFile;
    }

    const lastMessage = text || "Photo";
    const messageData: Record<string, any> = {
      senderId: isAdmin ? "admin" : uid,
      role: isAdmin ? "admin" : "customer",
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    };
    if (text) messageData.text = text;
    if (imagePath) messageData.imagePath = imagePath;

    try {
      await adminDb.runTransaction(async (transaction) => {
        const convSnap = await transaction.get(convRef);

        if (!convSnap.exists) {
          if (isAdmin) {
            throw new Error("conversation-missing");
          }
          transaction.set(convRef, {
            customerId: conversationId,
            customerName: "Guest",
            lastMessage,
            updatedAt: FieldValue.serverTimestamp(),
            unreadAdmin: 1,
            unreadCustomer: 0,
          });
        } else if (isAdmin) {
          transaction.update(convRef, {
            lastMessage,
            updatedAt: FieldValue.serverTimestamp(),
            unreadCustomer: 1,
          });
        } else {
          transaction.update(convRef, {
            lastMessage,
            updatedAt: FieldValue.serverTimestamp(),
            unreadAdmin: FieldValue.increment(1),
          });
        }

        transaction.set(convRef.collection("messages").doc(), messageData);
      });
    } catch (writeError: any) {
      console.error("Chat message write failed after image upload; rolling back file:", writeError);
      if (uploadedFile) {
        try {
          await uploadedFile.delete();
        } catch (rollbackError: any) {
          console.error("Rollback delete of chat image failed:", rollbackError);
        }
      }
      return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ success: true, imagePath }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/chat/send error:", error);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}
