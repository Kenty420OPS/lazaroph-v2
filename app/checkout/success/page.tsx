import { Suspense } from "react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import SuccessContent from "./SuccessContent";

// Static shell — no dynamic APIs used at this level.
// SuccessContent (Client Component) reads useSearchParams inside <Suspense>,
// which allows Next.js to statically pre-render this shell (○).
export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<div className="text-neutral-500 text-sm">Loading...</div>}>
          <SuccessContent />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
