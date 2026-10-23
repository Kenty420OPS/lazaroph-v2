"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getAuthErrorMessage } from "@/lib/auth-errors";

// One generic message for every email/password failure so we never reveal
// whether the email exists or the password was wrong.
const GENERIC_EMAIL_ERROR = "Invalid email or password.";
const GENERIC_POPUP_ERROR = "Something went wrong. Please try again.";

// Password reset. The success text is deliberately identical for every send
// attempt (existing account, unknown email, Google-only account) so the page
// never reveals whether an email is registered. Only rate limiting and network
// failures surface a different, already-sanitized message.
const RESET_SENT_MESSAGE =
  "If an account exists for that email, we sent a reset link. Check your inbox and spam folder.";
const RESET_EMAIL_ERROR = "Please enter your email address.";
const RESET_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResetMessage = { kind: "success" | "error"; text: string };

// Only accept a same-site path: must start with a single "/", must not start
// with "//", must not contain "://", and must not contain a backslash,
// whitespace or control character. Anything else falls back to "/".
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.includes("://")) return "/";
  if (/[\\\s\u0000-\u001f]/.test(raw)) return "/";
  return raw;
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // "signin" shows the existing form; "reset" swaps the same card into a small
  // reset panel. Nothing here changes the sign-in, Google or next-param flows.
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resetMessage, setResetMessage] = useState<ResetMessage | null>(null);
  const resetEmailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mode !== "reset") return;
    resetEmailRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(GENERIC_EMAIL_ERROR);
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace(next);
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      if (msg === "") {
        setSubmitting(false);
        return;
      }
      setError(msg || GENERIC_POPUP_ERROR);
      setSubmitting(false);
    }
  };

  const openReset = () => {
    if (submitting) return;
    setError(null);
    setResetMessage(null);
    setMode("reset");
  };

  const backToSignIn = () => {
    if (sending) return;
    setResetMessage(null);
    setMode("signin");
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || cooldown > 0) return;

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setResetMessage({ kind: "error", text: RESET_EMAIL_ERROR });
      resetEmailRef.current?.focus();
      return;
    }

    setResetMessage(null);
    setSending(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setResetMessage({ kind: "success", text: RESET_SENT_MESSAGE });
      setCooldown(RESET_COOLDOWN_SECONDS);
    } catch (err) {
      const code =
        err && typeof err === "object" && typeof (err as { code?: unknown }).code === "string"
          ? (err as { code: string }).code
          : "";
      if (code === "auth/too-many-requests" || code === "auth/network-request-failed") {
        setResetMessage({ kind: "error", text: getAuthErrorMessage(err) });
        // A network failure may be transient, so it is the only case that can
        // be retried immediately; everything else starts the cooldown.
        if (code !== "auth/network-request-failed") {
          setCooldown(RESET_COOLDOWN_SECONDS);
        }
      } else {
        // Covers auth/user-not-found, auth/invalid-email, Google-only accounts
        // and anything else: same neutral message, no account enumeration.
        setResetMessage({ kind: "success", text: RESET_SENT_MESSAGE });
        setCooldown(RESET_COOLDOWN_SECONDS);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      <SiteHeader />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase">
            {mode === "signin" ? "Sign in" : "Reset your password"}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {mode === "signin"
              ? "Access your LAZAROPH account."
              : "We'll email you a link to set a new password."}
          </p>
        </div>

        <div className="w-full min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          {mode === "signin" ? (
            <>
              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-lg border border-red-500 bg-red-900/40 p-3 text-sm text-red-200"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="min-w-0">
                  <label
                    htmlFor="signin-email"
                    className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-400"
                  >
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[44px] min-w-0 bg-black border border-neutral-800 rounded-lg px-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="signin-password"
                    className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-400"
                  >
                    Password
                  </label>
                  <input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-[44px] min-w-0 bg-black border border-neutral-800 rounded-lg px-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                    placeholder="Your password"
                  />
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={openReset}
                      disabled={submitting}
                      className="inline-flex min-h-[44px] items-center text-xs font-bold uppercase tracking-wide text-neutral-400 underline underline-offset-2 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px] rounded-lg bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-neutral-800" />
                <span className="text-xs uppercase tracking-wide text-neutral-500">or</span>
                <span className="h-px flex-1 bg-neutral-800" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-900 text-sm font-bold text-white hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Continue with Google
              </button>

              <p className="mt-6 text-center text-sm text-neutral-400">
                Don&apos;t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="font-bold text-white underline hover:text-neutral-300"
                >
                  Sign up
                </Link>
              </p>
            </>
          ) : (
            <form
              onSubmit={handleResetSubmit}
              className="flex flex-col gap-4"
              noValidate
            >
              <p className="text-xs leading-relaxed text-neutral-400">
                Signed up with Google? Use the Google button on the sign-in page
                instead.
              </p>

              <div className="min-w-0">
                <label
                  htmlFor="reset-email"
                  className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-400"
                >
                  Email
                </label>
                <input
                  ref={resetEmailRef}
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] min-w-0 bg-black border border-neutral-800 rounded-lg px-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="you@example.com"
                />
              </div>

              <div aria-live="polite" role="status" className="min-w-0">
                {resetMessage && (
                  <div
                    className={
                      resetMessage.kind === "error"
                        ? "rounded-lg border border-red-500 bg-red-900/40 p-3 text-sm text-red-200 break-words"
                        : "rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-200 break-words"
                    }
                  >
                    {resetMessage.text}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={sending || cooldown > 0}
                className="w-full min-h-[44px] rounded-lg bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : "Send reset link"}
              </button>

              {cooldown > 0 && (
                <p className="text-center text-xs text-neutral-400">
                  You can send another link in {cooldown}s.
                </p>
              )}

              <button
                type="button"
                onClick={backToSignIn}
                disabled={sending}
                className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-900 text-sm font-bold text-white hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
