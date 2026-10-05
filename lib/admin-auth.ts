import { adminAuth, adminDb } from "./firebase-admin";

const STAFF_ROLES = ["admin", "superadmin"] as const;

export function isStaffRole(role: unknown): boolean {
  return typeof role === "string" && (STAFF_ROLES as readonly string[]).includes(role);
}

type VerifyResult = {
  isAdmin: boolean;
  error?: string;
  uid?: string;
  role?: string;
  status?: number;
};

async function verifyRequest(
  request: Request,
  isAllowed: (role: unknown) => boolean,
  forbiddenMessage: string
): Promise<VerifyResult> {
  try {
    if (!adminAuth || !adminDb) return { isAdmin: false, error: "Firebase Admin is not initialized. Please check your .env.local Service Account credentials.", status: 401 };
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { isAdmin: false, error: "Unauthorized: Missing or invalid Authorization header", status: 401 };
    }

    const token = authHeader.substring(7);
    if (!token) {
      return { isAdmin: false, error: "Unauthorized: Empty token", status: 401 };
    }

    // Verify token and check for revocation
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token, true);
    } catch (verifyError: any) {
      return { isAdmin: false, error: "Unauthorized: " + (verifyError.message || "Invalid or revoked token"), status: 401 };
    }
    const uid = decodedToken.uid;
    const role = (decodedToken as any).role as string | undefined;

    if (!isAllowed(role)) {
      return { isAdmin: false, error: forbiddenMessage, uid, role, status: 403 };
    }

    return { isAdmin: true, uid, role, status: 200 };
  } catch (error: any) {
    console.error("verifyAdminRequest error:", error);
    return { isAdmin: false, error: "Unauthorized: " + (error.message || "Invalid token"), status: 401 };
  }
}

export async function verifyAdminRequest(request: Request): Promise<VerifyResult> {
  return verifyRequest(
    request,
    isStaffRole,
    "Forbidden: User does not have admin privileges"
  );
}

export async function verifySuperadminRequest(request: Request): Promise<VerifyResult> {
  return verifyRequest(
    request,
    (role) => role === "superadmin",
    "Forbidden: Superadmin privileges required"
  );
}
