"use client";

import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import AuthMenu from "@/components/AuthMenu";

// Storefront header used by the homepage. Wordmark only — no logo image, no
// version badge — plus the cart and the shared AuthMenu.
export default function SiteHeader() {
  const { cartCount } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0A] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="group flex items-center min-h-11 gap-3 min-w-0">
          <span className="text-lg sm:text-2xl font-black tracking-[0.15em] sm:tracking-[0.2em] text-white whitespace-nowrap group-hover:text-white/80 transition-colors">
            LAZAROPH
          </span>
          <span className="hidden sm:block text-xs text-[#B3B3B3] tracking-wide whitespace-nowrap">
            AUTHENTIC. LEGIT. BELOW MARKET PRICE.
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/shop"
            className="hidden sm:inline-flex items-center min-h-11 px-4 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-colors"
          >
            Shop
          </Link>
          <Link
            href="/cart"
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className="relative inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-black leading-none text-black bg-white rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}
