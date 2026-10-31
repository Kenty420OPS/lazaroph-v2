"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { POLICY_VERSION } from "@/lib/store-info";
import { POLICY_CONSENT_KEY, readPolicyConsent, writePolicyConsent } from "@/lib/policy-consent";

// Pages that may be read before agreeing, plus the admin subdomain which has its
// own login. Everything else (shop, product, cart, checkout, auth, tracking) is gated.
const EXEMPT_PATHS = ["/privacy", "/terms", "/returns", "/shipping-policy", "/contact"];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// undefined = consent not read yet (server render and first paint), null = read
// and not accepted, string = the accepted policy version.
type ConsentVersion = string | null | undefined;

export default function PolicyGate() {
  const pathname = usePathname() ?? "";
  const [consentVersion, setConsentVersion] = useState<ConsentVersion>(undefined);
  // Accepting again is remembered in memory for this session, so a visitor whose
  // localStorage throws (private mode, blocked storage) is not stuck behind the gate.
  const [sessionAccepted, setSessionAccepted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showDeclineMessage, setShowDeclineMessage] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isExempt = pathname.startsWith("/portal/lzph/2016") || EXEMPT_PATHS.includes(pathname);

  // Read consent after mount only: the server render and the first client paint
  // both return nothing, so there is no hydration mismatch.
  useEffect(() => {
    const stored = readPolicyConsent();
    setConsentVersion(stored ? stored.version : null);
  }, [pathname]);

  // Accepting in one tab hides the gate in the others.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== POLICY_CONSENT_KEY) {
        return;
      }
      const stored = readPolicyConsent();
      setConsentVersion(stored ? stored.version : null);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const isOpen =
    consentVersion !== undefined &&
    !isExempt &&
    !sessionAccepted &&
    consentVersion !== POLICY_VERSION;

  // Move focus into the panel on open, and lock the page behind it. Cleaning up on
  // close (accept) or unmount restores whatever overflow the body had before.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    panelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Escape deliberately does nothing; only PROCEED TO SHOP closes the gate.
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

  function handleAccept() {
    writePolicyConsent(POLICY_VERSION);
    setConsentVersion(POLICY_VERSION);
    setSessionAccepted(true);
    setAgreed(false);
    setShowDeclineMessage(false);
  }

  // DECLINE and the X button only explain why the gate stays open.
  function handleRefuse() {
    setShowDeclineMessage(true);
  }

  function handleAgreedChange(event: React.ChangeEvent<HTMLInputElement>) {
    setAgreed(event.target.checked);
    if (event.target.checked) {
      setShowDeclineMessage(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-gate-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden border border-[#0A0A0A]/10 bg-white text-[#0A0A0A] shadow-2xl outline-none"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 bg-[#0A0A0A] px-4 py-3 sm:px-6">
          <h2
            id="policy-gate-title"
            className="text-sm font-black uppercase tracking-widest text-white"
          >
            STORE POLICIES &amp; AGREEMENT
          </h2>
          <button
            type="button"
            onClick={handleRefuse}
            aria-label="Close"
            className="-mr-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-2xl leading-none text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            &times;
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest">DISCLAIMER</h3>
            <p className="text-sm leading-relaxed text-[#6B6B6B]">
              LAZAROPH sells 100% authentic items. We are not directly affiliated with the brands
              listed. Prices are subject to change based on market value and availability.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest">PRIVACY</h3>
            <p className="text-sm leading-relaxed text-[#6B6B6B]">
              We collect your name, contact number, delivery address and payment details (payment
              method, reference number and proof of payment) only to process, verify and deliver
              your order and to give you support. We share your name, contact number and delivery
              address with the courier you choose. Our service providers Google Firebase and Vercel
              process data on our behalf. We do not sell your data, and we do not collect any
              government ID.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest">RULES &amp; REGULATIONS</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#6B6B6B]">
              <li>Orders are confirmed only after our staff verifies your payment.</li>
              <li>
                An order is final once we have confirmed and shipped it. Before that, you may ask
                us to cancel it, and a cancelled order&apos;s payment is returned once the account
                details you send us are correct.
              </li>
              <li>
                Replacement within 7 days for eligible items only. Report defective or wrong items
                within 7 days with photos or video and your order ID.
              </li>
              <li>Delivery options are LBC, Lalamove (Metro Manila only) and free store pickup.</li>
            </ul>
          </section>

          <div className="border-t border-[#0A0A0A]/10 pt-4">
            <p className="text-sm leading-relaxed text-[#6B6B6B]">
              Read the full:{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0A0A0A] underline underline-offset-2 hover:no-underline"
              >
                Privacy Policy
              </a>
              {", "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0A0A0A] underline underline-offset-2 hover:no-underline"
              >
                Terms and Conditions
              </a>
              {", "}
              <a
                href="/returns"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0A0A0A] underline underline-offset-2 hover:no-underline"
              >
                Return Policy
              </a>
              {" and "}
              <a
                href="/shipping-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0A0A0A] underline underline-offset-2 hover:no-underline"
              >
                Shipping Policy
              </a>
              .
            </p>
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-t border-[#0A0A0A]/10 px-4 py-4 sm:px-6">
          <label className="flex min-h-11 cursor-pointer select-none items-center gap-3 text-sm text-[#0A0A0A]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={handleAgreedChange}
              className="h-5 w-5 shrink-0 accent-[#0A0A0A]"
            />
            <span>I have read and agree to the policies above</span>
          </label>

          {showDeclineMessage && (
            <p
              role="alert"
              className="border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 px-3 py-2 text-sm font-semibold"
            >
              You need to agree to the policies to shop.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreed}
              className="inline-flex min-h-11 w-full items-center justify-center bg-[#0A0A0A] px-4 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#0A0A0A]/90 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-1"
            >
              PROCEED TO SHOP
            </button>
            <button
              type="button"
              onClick={handleRefuse}
              className="inline-flex min-h-11 w-full items-center justify-center border border-[#0A0A0A] bg-white px-4 text-sm font-bold uppercase tracking-wide text-[#0A0A0A] hover:bg-[#0A0A0A]/5 sm:flex-1"
            >
              DECLINE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
