import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isComingSoon =
    process.env.COMING_SOON === "true" || process.env.COMING_SOON === "1";

  const { pathname } = request.nextUrl;

  // 1. Static files, assets, and internal Next.js paths are always allowed
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icon.png") ||
    pathname.startsWith("/__/auth") || // Firebase auth handler rewrite
    pathname.includes(".") // static files with extensions (.png, .jpg, .svg, .css, etc.)
  ) {
    return NextResponse.next();
  }

  // 2. Admin routes: always accessible so admin can log in and manage the store
  if (pathname.startsWith("/portal") || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // 3. API routes:
  if (pathname.startsWith("/api")) {
    // If coming soon is OFF, allow all API traffic
    if (!isComingSoon) {
      return NextResponse.next();
    }

    // Always allow admin API routes (/api/admin/*)
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.next();
    }

    const referer = request.headers.get("referer") || "";
    const hasAdminReferer =
      referer.includes("/portal") || referer.includes("/admin");
    const hasAuth = !!request.headers.get("authorization");

    // Strictly scoped: allow admin portal to fetch brands and categories dropdown data
    if (
      request.method === "GET" &&
      hasAdminReferer &&
      (pathname === "/api/brands" || pathname === "/api/categories")
    ) {
      return NextResponse.next();
    }

    // Strictly scoped: allow admin chat sending/uploads with verified auth and admin referer
    if (
      hasAdminReferer &&
      hasAuth &&
      (pathname === "/api/chat/send" || pathname === "/api/chat/image")
    ) {
      return NextResponse.next();
    }

    // Block all public customer & catalog endpoints (/api/orders, /api/products, etc.)
    return NextResponse.json(
      {
        success: false,
        error: "Store is currently in coming soon mode.",
      },
      {
        status: 503,
        headers: {
          "X-Robots-Tag": "noindex, nofollow",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // 4. When coming soon is OFF:
  if (!isComingSoon) {
    // If someone visits /coming-soon directly when the site is live, redirect them to home
    if (pathname === "/coming-soon") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 5. When coming soon is ON:
  // Allow direct access to /coming-soon
  if (pathname === "/coming-soon") {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }

  // Rewrite all other public routes internally to /coming-soon
  const response = NextResponse.rewrite(new URL("/coming-soon", request.url));
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
