import { Suspense } from "react";
import Link from "next/link";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0A0A0A]">
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          We can’t find the page you are looking for.
        </h1>
        <p className="mt-2 text-base text-[#6B6B6B] sm:text-lg">
          Sorry for the inconvenience.
        </p>
        <Link
          href="/shop"
          className="mt-8 rounded-full bg-black px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#333333]"
        >
          Back to shop
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
