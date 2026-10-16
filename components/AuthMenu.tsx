"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Sign in / Sign out controls for the storefront header.
// Compact enough for mobile: the name truncates and buttons stay small.
export default function AuthMenu() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // While Firebase restores the session, render a neutral placeholder so we
  // never flash "Sign in" to a signed-in customer (or vice versa).
  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="h-8 w-20 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="text-xs font-bold px-3.5 py-1.5 rounded-lg border border-neutral-700 text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
      >
        Sign in
      </Link>
    );
  }

  const name = user.displayName || user.email || "Account";

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.push("/");
    } catch {
      // Stay on the page if sign-out fails; the button re-enables below.
      setSigningOut(false);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="hidden sm:block max-w-[160px] truncate text-xs font-semibold text-neutral-300"
        title={name}
      >
        {name}
      </span>
      <span className="sm:hidden w-8 h-8 shrink-0 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="text-xs font-bold px-3.5 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
