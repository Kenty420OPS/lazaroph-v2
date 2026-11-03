"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthMenu from "@/components/AuthMenu";
import { HEADER_NAV } from "@/lib/storefront-nav";

export default function SiteHeader() {
  const { cartCount } = useCart();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleMobileSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      setMenuOpen(false);
      await signOut();
      router.push("/");
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0A] border-b border-white/10 pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 lg:grid lg:grid-cols-3 pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))]">
        {/* Left: Mobile hamburger or Desktop links */}
        <div className="flex items-center min-w-0">
          {/* Mobile hamburger (below lg) */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Desktop links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-3 xl:gap-4">
            {HEADER_NAV.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`text-xs font-bold uppercase tracking-wide text-[#B3B3B3] hover:text-white transition-colors whitespace-nowrap min-h-11 items-center ${
                  link.label === "New arrivals" ? "hidden xl:inline-flex" : "inline-flex"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Center: Logo image (40px) + wordmark LAZAROPH */}
        <div className="flex items-center justify-center min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-h-11 min-w-0">
            <img
              src="/images/logo.png"
              alt="LAZAROPH"
              className="h-8 sm:h-10 w-auto object-contain rounded-full shrink-0"
            />
            <span className="text-xs sm:text-2xl font-black tracking-wider sm:tracking-[0.2em] text-white whitespace-nowrap truncate group-hover:text-white/80 transition-colors">
              LAZAROPH
            </span>
          </Link>
        </div>

        {/* Right: Search, AuthMenu, Cart */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
          <Link
            href="/shop"
            aria-label="Search"
            className="hidden sm:inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Link>

          <AuthMenu />

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
        </div>
      </div>

      {/* Mobile navigation drawer / list (below lg) */}
      {menuOpen && (
        <nav
          aria-label="Mobile Navigation Menu"
          className="lg:hidden bg-[#0A0A0A] border-t border-white/10 px-4 py-3 space-y-1 max-h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))]"
        >
          <Link
            href="/shop"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 min-h-11 px-3 rounded-lg text-xs font-bold uppercase tracking-widest text-[#B3B3B3] hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search Catalog
          </Link>
          {HEADER_NAV.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center min-h-11 px-3 rounded-lg text-xs font-bold uppercase tracking-widest text-[#B3B3B3] hover:text-white hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 mt-2 border-t border-white/10">
            {user ? (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-xs text-neutral-400 truncate">
                  Signed in as{" "}
                  <span className="font-semibold text-white">
                    {user.displayName || user.email || "Account"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleMobileSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center min-h-11 px-3 rounded-lg text-xs font-bold uppercase tracking-widest text-neutral-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setMenuOpen(false)}
                className="flex items-center min-h-11 px-3 rounded-lg text-xs font-bold uppercase tracking-widest text-white hover:bg-white/5 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
