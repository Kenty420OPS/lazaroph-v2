import { Suspense } from "react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import SuccessContent from "./SuccessContent";

// Static shell — no dynamic APIs used at this level.
// SuccessContent (Client Component) reads useSearchParams inside <Suspense>,
// which allows Next.js to statically pre-render this shell (○).
export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex items-center justify-center p-4 bg-white text-[#0A0A0A]">
        <Suspense fallback={<div className="text-[#6B6B6B] text-sm">Loading...</div>}>
          <SuccessContent />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
