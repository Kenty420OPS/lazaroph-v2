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

  // 2. SEO routes: robots.txt and sitemap.xml
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    const response = NextResponse.next();
    if (isComingSoon) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  }

  // 3. Admin routes: always accessible so admin can log in and manage the store
  if (pathname.startsWith("/portal") || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // 4. API routes:
  if (pathname.startsWith("/api")) {
    // Always allow admin API routes
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.next();
    }

    // Allow requests from the admin dashboard (e.g. brand/category dropdowns, admin chat)
    const referer = request.headers.get("referer") || "";
    const hasAdminReferer =
      referer.includes("/portal") || referer.includes("/admin");
    const hasAuth = !!request.headers.get("authorization");

    if (
      hasAdminReferer ||
      hasAuth ||
      pathname.startsWith("/api/chat/send") ||
      pathname.startsWith("/api/chat/image")
    ) {
      return NextResponse.next();
    }

    // Block public catalog & customer endpoints while COMING_SOON is on
    if (isComingSoon) {
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

    return NextResponse.next();
  }

  // 5. When coming soon is OFF:
  if (!isComingSoon) {
    // If someone visits /coming-soon directly when the site is live, redirect them to home
    if (pathname === "/coming-soon") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 6. When coming soon is ON:
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

