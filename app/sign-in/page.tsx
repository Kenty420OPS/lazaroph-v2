"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getAuthErrorMessage } from "@/lib/auth-errors";

// One generic message for every email/password failure so we never reveal
// whether the email exists or the password was wrong.
const GENERIC_EMAIL_ERROR = "Invalid email or password.";
const GENERIC_POPUP_ERROR = "Something went wrong. Please try again.";

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

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      <SiteHeader />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Access your LAZAROPH account.
          </p>
        </div>

        <div className="w-full min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
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
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
