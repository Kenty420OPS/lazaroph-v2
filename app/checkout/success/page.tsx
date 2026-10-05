import { Suspense } from "react";
import SuccessContent from "./SuccessContent";

// Static shell — no dynamic APIs used at this level.
// SuccessContent (Client Component) reads useSearchParams inside <Suspense>,
// which allows Next.js to statically pre-render this shell (○).
export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-neutral-500 text-sm">Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
