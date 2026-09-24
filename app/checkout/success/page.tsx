"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function CheckoutSuccessPage({ searchParams }: { searchParams: { orderId?: string } }) {
  const orderId = searchParams?.orderId;
  const [copied, setCopied] = useState(false);

  // Save to local storage for "Recent Orders" in Cart
  useEffect(() => {
    if (orderId) {
      try {
        const stored = localStorage.getItem("recent_orders");
        let orders = stored ? JSON.parse(stored) : [];
        if (!orders.includes(orderId)) {
          orders = [orderId, ...orders].slice(0, 5); // Keep up to 5 recent orders
          localStorage.setItem("recent_orders", JSON.stringify(orders));
        }
      } catch (err) {
        console.error("Failed to save recent order", err);
      }
    }
  }, [orderId]);

  const copyToClipboard = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-black tracking-tight">ORDER RECEIVED!</h1>
        
        <div className="bg-neutral-900/60 p-6 rounded-xl border border-neutral-800 space-y-4 text-sm text-neutral-300">
          <p>
            Thank you for ordering from <span className="font-bold text-white">LAZAROPH v2</span>.
          </p>
          <p className="px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white font-medium flex flex-col gap-1">
            <span className="text-xs text-neutral-400">Status:</span>
            <span>PENDING PAYMENT</span>
          </p>
          {orderId && (
            <div className="flex flex-col gap-3">
              <div className="px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-left font-mono relative">
                <p className="text-xs text-neutral-400 mb-1 font-sans font-bold uppercase tracking-wider">Your Order ID:</p>
                <div className="flex justify-between items-center">
                  <p className="font-bold truncate mr-4">{orderId}</p>
                  <button
                    onClick={copyToClipboard}
                    className="bg-white text-black px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex-shrink-0"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <Link 
                href={`/track-order?orderId=${orderId}`}
                className="text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white underline underline-offset-4 decoration-neutral-600 transition-colors"
              >
                Track This Order &rarr;
              </Link>
            </div>
          )}
          <p>
            We have securely received your order and proof of payment. Our admin team will manually verify your payment within the next 24 hours. 
          </p>
          <p>
            Once confirmed, we will notify you and process your items for immediate shipping via your chosen courier.
          </p>
        </div>

        <div className="pt-6">
          <Link href="/shop" className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-lg hover:bg-neutral-200 transition-colors inline-block">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
