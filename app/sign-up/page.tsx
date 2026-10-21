"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import { auth } from "@/lib/firebase";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  sendEmailVerification,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";

// Generic messages only: never reveal whether an email is already registered
// beyond the single "sign in instead" hint below.
const GENERIC_ERROR = "Unable to create account. Please try again.";
const ALREADY_EXISTS_ERROR = "Unable to create account. If you already have one, sign in.";
const PASSWORD_MISMATCH_ERROR = "Passwords do not match.";
const PASSWORD_LENGTH_ERROR = "Password must be at least 8 characters.";
const GENERIC_POPUP_ERROR = "Google sign-up was cancelled or failed. Please try again.";

const RESEND_COOLDOWN_SECONDS = 60;

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

function errorCode(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    return String((err as { code?: unknown }).code ?? "");
  }
  return "";
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSignInHint, setShowSignInHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Verification screen state
  const [verifySentTo, setVerifySentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Tick the resend cooldown down once per second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setShowSignInHint(false);
    setResendNotice(null);

    if (password.length < 8) {
      setError(PASSWORD_LENGTH_ERROR);
      return;
    }
    if (password !== confirmPassword) {
      setError(PASSWORD_MISMATCH_ERROR);
      return;
    }

    setSubmitting(true);
    const cleanedEmail = email.trim();
    const currentUser = auth.currentUser;

    try {
      if (currentUser?.isAnonymous) {
        // Keep the anonymous uid: link the email credential onto it.
        await linkWithCredential(
          currentUser,
          EmailAuthProvider.credential(cleanedEmail, password)
        );
        await auth.currentUser?.getIdToken(true);
      } else {
        await createUserWithEmailAndPassword(auth, cleanedEmail, password);
      }

      try {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      } catch (sendError) {
        console.error("sendEmailVerification failed", sendError);
      }

      setVerifySentTo(cleanedEmail);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setSubmitting(false);
    } catch (err) {
      const code = errorCode(err);
      if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
        setError(ALREADY_EXISTS_ERROR);
        setShowSignInHint(true);
      } else {
        setError(GENERIC_ERROR);
      }
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (submitting) return;
    setError(null);
    setShowSignInHint(false);
    setResendNotice(null);
    setSubmitting(true);

    const provider = new GoogleAuthProvider();
    const currentUser = auth.currentUser;

    try {
      if (currentUser?.isAnonymous) {
        // Keep the anonymous uid: link the Google credential onto it.
        await linkWithPopup(currentUser, provider);
        await auth.currentUser?.getIdToken(true);
      } else {
        await signInWithPopup(auth, provider);
      }
      router.replace(next);
      return;
    } catch (err) {
      const code = errorCode(err);
      if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
        const credential = GoogleAuthProvider.credentialFromError(
          err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]
        );
        if (credential) {
          try {
            await signInWithCredential(auth, credential);
            await auth.currentUser?.getIdToken(true);
            router.replace(next);
            return;
          } catch (signInError) {
            console.error("signInWithCredential failed", signInError);
          }
        }
      }
      setError(GENERIC_POPUP_ERROR);
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user || cooldown > 0) return;
    setResendNotice(null);
    setError(null);
    try {
      await sendEmailVerification(user);
      setResendNotice("Verification email sent.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error("sendEmailVerification failed", err);
      setResendNotice("Could not send the email. Please try again.");
    }
  };

  // ---- Verification screen ----
  if (verifySentTo) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
        <SiteHeader />

        <main className="flex-1 w-full max-w-md mx-auto px-4 py-12">
          <div className="w-full min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-white text-black font-black flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-extrabold tracking-tight text-white uppercase">
              Check your email to verify your account
            </h1>
            <p className="mt-3 text-sm text-neutral-400">
              We sent a verification link to{" "}
              <span className="font-semibold text-neutral-200 break-all">
                {verifySentTo}
              </span>
              . Open it to finish setting up your account.
            </p>

            {resendNotice && (
              <p className="mt-4 text-sm text-neutral-300" role="status">
                {resendNotice}
              </p>
            )}

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="mt-6 w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-900 text-sm font-bold text-white hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
            </button>

            <Link
              href={next}
              className="mt-4 inline-block text-sm font-bold text-white underline hover:text-neutral-300"
            >
              Continue to storefront
            </Link>

            <p className="mt-6 text-sm text-neutral-400">
              Already verified?{" "}
              <Link
                href="/sign-in"
                className="font-bold text-white underline hover:text-neutral-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </main>

        <SiteFooter />
      </div>
    );
  }

  // ---- Sign-up form ----
  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      <SiteHeader />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase">
            Create account
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Join LAZAROPH to track your orders.
          </p>
        </div>

        <div className="w-full min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-500 bg-red-900/40 p-3 text-sm text-red-200"
            >
              <p>{error}</p>
              {showSignInHint && (
                <Link
                  href="/sign-in"
                  className="mt-2 inline-block font-bold text-white underline hover:text-neutral-300"
                >
                  Go to sign in
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
            <div className="min-w-0">
              <label
                htmlFor="signup-email"
                className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-400"
              >
                Email
              </label>
              <input
                id="signup-email"
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
                htmlFor="signup-password"
                className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-400"
              >
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] min-w-0 bg-black border border-neutral-800 rounded-lg px-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="min-w-0">
              <label
                htmlFor="signup-confirm-password"
                className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-400"
              >
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full min-h-[44px] min-w-0 bg-black border border-neutral-800 rounded-lg px-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] rounded-lg bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-neutral-800" />
            <span className="text-xs uppercase tracking-wide text-neutral-500">or</span>
            <span className="h-px flex-1 bg-neutral-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={submitting}
            className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-900 text-sm font-bold text-white hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-neutral-400">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-bold text-white underline hover:text-neutral-300"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
