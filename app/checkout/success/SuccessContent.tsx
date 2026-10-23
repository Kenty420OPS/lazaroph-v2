"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CopyOrderId from "./CopyOrderId";

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? undefined;
  // Plain-text query params only — rendered as text, never as HTML.
  const courier = (searchParams.get("courier") ?? "").trim();
  const branchName = (searchParams.get("branchName") ?? "").trim().slice(0, 100);
  const isPickup = courier === "Pickup";

  return (
    <div className="max-w-md w-full text-center space-y-6">
      <div className="w-20 h-20 bg-[#0A0A0A] text-white rounded-full flex items-center justify-center mx-auto mb-6 border border-[#0A0A0A]">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-black tracking-tight text-[#0A0A0A]">ORDER RECEIVED!</h1>

      <div className="bg-white p-6 rounded-xl border border-[#0A0A0A]/10 space-y-4 text-sm text-[#0A0A0A]">
        <p>
          Thank you for ordering from <span className="font-bold text-[#0A0A0A]">LAZAROPH v2</span>.
        </p>
        <p className="px-4 py-3 bg-[#0A0A0A]/5 border border-[#0A0A0A]/10 rounded-lg text-[#0A0A0A] font-medium flex flex-col gap-1">
          <span className="text-xs text-[#6B6B6B]">Status:</span>
          <span>PENDING PAYMENT</span>
        </p>
        {orderId && (
          <div className="flex flex-col gap-3">
            <CopyOrderId orderId={orderId} />
            <Link
              href={`/track-order?orderId=${orderId}`}
              className="inline-flex items-center justify-center min-h-11 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-4 decoration-[#0A0A0A]/30 transition-colors"
            >
              Track This Order &rarr;
            </Link>
          </div>
        )}
        <p>
          We have securely received your order and proof of payment. Our admin team will manually
          verify your payment within the next 24 hours.
        </p>
        {isPickup ? (
          <p>
            Once your payment has been confirmed, we will let you know when your order is
            ready for pickup{branchName ? ` at ${branchName}` : ""}.
          </p>
        ) : (
          <p>
            Once confirmed, we will notify you and process your items for immediate shipping via your
            chosen courier.
          </p>
        )}
      </div>

      <p className="text-xs text-[#6B6B6B]">
        Replacement within 7 days for eligible items only.{" "}
        <Link href="/returns" className="underline hover:text-[#0A0A0A] transition-colors">
          See our Return Policy.
        </Link>
      </p>

      <div className="pt-6">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center min-h-11 px-8 py-4 bg-[#0A0A0A] text-white font-black uppercase tracking-widest rounded-lg hover:bg-[#0A0A0A]/90 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
