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
    <div className="px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-left font-mono relative">
      <p className="text-xs text-neutral-400 mb-1 font-sans font-bold uppercase tracking-wider">
        Your Order ID:
      </p>
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
  );
}
