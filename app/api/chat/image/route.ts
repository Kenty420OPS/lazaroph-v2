import { NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebase-admin";
import { getConversationIdFromImagePath } from "@/lib/chat";

export const dynamic = "force-dynamic";

function isStaffRole(role: unknown): boolean {
  return role === "admin" || role === "superadmin";
}

// GET /api/chat/image?path=chat/<conversationId>/<file>
// Serves a private chat image through the server. Storage rules deny direct
// client reads, so the only way in is this route: it requires a valid Firebase
// ID token and allows only the customer who owns the conversation or an admin.
export async function GET(request: Request) {
  try {
    if (!adminAuth || !adminStorage) {
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

    const path = new URL(request.url).searchParams.get("path") ?? "";
    const conversationId = getConversationIdFromImagePath(path);
    if (!conversationId) {
      return NextResponse.json({ success: false, error: "Invalid image path" }, { status: 400 });
    }

    const isAdmin = isStaffRole((decodedToken as any).role);
    if (!isAdmin && decodedToken.uid !== conversationId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const file = adminStorage.bucket().file(path);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ success: false, error: "Image not found" }, { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();
    const contentType =
      typeof metadata.contentType === "string" && metadata.contentType
        ? metadata.contentType
        : "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("GET /api/chat/image error:", error);
    return NextResponse.json({ success: false, error: "Failed to load image" }, { status: 500 });
  }
}
