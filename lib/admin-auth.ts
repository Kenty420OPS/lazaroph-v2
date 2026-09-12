import { cookies } from "next/headers";

export const ADMIN_SECRET_KEY = process.env.ADMIN_KEY || "lazaroph-admin-secret-2026";

export function verifyAdminRequest(request: Request): { isAdmin: boolean; error?: string } {
  // 1. Check x-admin-key or Authorization header
  const adminKeyHeader = request.headers.get("x-admin-key");
  const authHeader = request.headers.get("Authorization");

  let token = "";
  if (adminKeyHeader) {
    token = adminKeyHeader;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // 2. Fallback to cookie check for SSR / browser requests
  if (!token) {
    try {
      const cookieStore = cookies();
      const cookieVal = cookieStore.get("admin_token")?.value;
      if (cookieVal) {
        token = cookieVal;
      }
    } catch (e) {
      // cookies() may throw if context doesn't support headers/cookies
    }
  }

  if (!token) {
    return {
      isAdmin: false,
      error: "Unauthorized: Missing admin authentication credentials (header or cookie required)",
    };
  }

  if (token === ADMIN_SECRET_KEY) {
    return { isAdmin: true };
  }

  return {
    isAdmin: false,
    error: "Forbidden: Invalid admin key provided",
  };
}
