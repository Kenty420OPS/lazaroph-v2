"use client";

import { useState } from "react";

export default function CopyOrderId({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 py-3 bg-[#0A0A0A]/5 border border-[#0A0A0A]/10 rounded-lg text-[#0A0A0A] text-left font-mono relative">
      <p className="text-xs text-[#6B6B6B] mb-1 font-sans font-bold uppercase tracking-wider">
        Your Order ID:
      </p>
      <div className="flex justify-between items-center">
        <p className="font-bold truncate mr-4">{orderId}</p>
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center justify-center min-h-11 min-w-11 px-4 rounded bg-[#0A0A0A] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#0A0A0A]/90 transition-colors flex-shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
