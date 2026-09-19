import { adminAuth, adminDb } from "./firebase-admin";

export async function verifyAdminRequest(request: Request): Promise<{ isAdmin: boolean; error?: string; uid?: string }> {
  try {
    if (!adminAuth || !adminDb) return { isAdmin: false, error: "Firebase Admin is not initialized. Please check your .env.local Service Account credentials." };
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { isAdmin: false, error: "Unauthorized: Missing or invalid Authorization header" };
    }

    const token = authHeader.substring(7);
    if (!token) {
      return { isAdmin: false, error: "Unauthorized: Empty token" };
    }

    // Verify token and check for revocation
    const decodedToken = await adminAuth.verifyIdToken(token, true);
    const uid = decodedToken.uid;

    if (decodedToken.role !== 'admin') {
      return { isAdmin: false, error: "Forbidden: User does not have admin privileges" };
    }

    return { isAdmin: true, uid };
  } catch (error: any) {
    console.error("verifyAdminRequest error:", error);
    return { isAdmin: false, error: "Unauthorized: " + (error.message || "Invalid token") };
  }
}
