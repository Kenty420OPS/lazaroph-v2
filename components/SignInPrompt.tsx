"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADD_TO_CART_EVENT } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { POLICY_VERSION } from "@/lib/store-info";
import { readPolicyConsent } from "@/lib/policy-consent";

// One prompt per browser session. sessionStorage is wrapped because private
// mode or blocked storage can throw; the module flag covers this page session.
const SESSION_KEY = "lazaroph_signin_prompt_shown";
let memoryPromptShown = false;

// Pages where a sign-in nudge makes no sense.
const EXCLUDED_PATHS = ["/privacy", "/terms", "/returns", "/shipping-policy", "/contact"];

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

function promptAlreadyShown(): boolean {
  if (memoryPromptShown) return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markPromptShown(): void {
  memoryPromptShown = true;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Storage unavailable: the module flag above still covers this page session.
  }
}

function isExcludedPath(pathname: string): boolean {
  if (pathname.startsWith("/portal/lzph/2016")) return true;
  if (pathname === "/sign-in" || pathname === "/sign-up") return true;
  return EXCLUDED_PATHS.includes(pathname);
}

// The prompt only appears once the policy gate is satisfied, so it can never
// stack on top of it: the gate is open exactly while consent is out of date.
function hasCurrentPolicyConsent(): boolean {
  const consent = readPolicyConsent();
  return consent !== null && consent.version === POLICY_VERSION;
}

// The same-site path the sign-in page validates with safeNext(). The browser
// already percent-encodes the URL and it is encoded again for the query string,
// so the decoded value never contains raw whitespace.
function currentPathWithQuery(): string {
  const raw = `${window.location.pathname}${window.location.search}`;
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (/[\\\s\u0000-\u001f]/.test(raw)) return "/";
  return raw;
}

export default function SignInPrompt() {
  const pathname = usePathname() ?? "";
  const { user, loading } = useAuth();
  const [nextPath, setNextPath] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const isOpen = nextPath !== null;

  // Listen only when the prompt could apply: auth settled, no real account
  // (anonymous users count as signed out) and not on an excluded page. The
  // cart's dispatch is the only trigger, so hydrating the saved cart or
  // changing quantities never opens this.
  useEffect(() => {
    if (loading || user || isExcludedPath(pathname)) {
      return;
    }

    function handleAddToCart() {
      if (promptAlreadyShown() || !hasCurrentPolicyConsent()) {
        return;
      }
      markPromptShown();
      setNextPath(currentPathWithQuery());
    }

    window.addEventListener(ADD_TO_CART_EVENT, handleAddToCart);
    return () => window.removeEventListener(ADD_TO_CART_EVENT, handleAddToCart);
  }, [loading, user, pathname]);

  // Close on navigation or when the visitor signs in.
  useEffect(() => {
    setNextPath(null);
  }, [pathname, user]);

  // Focus into the dialog on open and return it to the trigger on close.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();

    return () => {
      const previous = restoreFocusRef.current;
      if (previous && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [isOpen]);

  // Escape closes the dialog.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setNextPath(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Tab stays inside the dialog while it is open.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables.length === 0) {
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (!panel.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }

    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (nextPath === null) {
    return null;
  }

  const encodedNext = encodeURIComponent(nextPath);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0A0A0A]/40 px-4 pb-4 sm:items-center sm:pb-0">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-prompt-title"
        aria-describedby="signin-prompt-text"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-[#0A0A0A]/10 bg-white p-5 text-[#0A0A0A] shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] sm:p-6"
      >
        <h2 id="signin-prompt-title" className="text-lg font-black tracking-tight">
          Sign in to save your cart
        </h2>
        <p id="signin-prompt-text" className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">
          Sign in or create an account to track your orders and check out faster. You can also keep
          shopping as a guest.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/sign-in?next=${encodedNext}`}
            className="inline-flex min-h-11 w-full items-center justify-center bg-[#0A0A0A] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0A0A0A]/90"
          >
            Sign in
          </Link>
          <Link
            href={`/sign-up?next=${encodedNext}`}
            className="inline-flex min-h-11 w-full items-center justify-center border border-[#0A0A0A] bg-white px-4 text-sm font-bold text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A]/5"
          >
            Create account
          </Link>
          <button
            type="button"
            onClick={() => setNextPath(null)}
            className="inline-flex min-h-11 w-full items-center justify-center border border-[#0A0A0A]/20 bg-white px-4 text-sm font-bold text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A]/5"
          >
            Continue shopping
          </button>
        </div>
      </div>
    </div>
  );
}
