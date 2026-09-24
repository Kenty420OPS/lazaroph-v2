"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const defaultOrderId = searchParams.get("orderId") || "";

  const [orderId, setOrderId] = useState(defaultOrderId);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrderData(null);

    try {
      const res = await fetch("/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim(), contact: contact.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Order not found");
      } else {
        setOrderData(data.order);
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    const s = status === "pending_verification" ? "pending_payment" : status;
    switch(s) {
      case "pending_payment": return 1;
      case "confirmed": return 2;
      case "shipped": return 3;
      case "completed": return 4;
      default: return 0;
    }
  };

  const currentStep = orderData ? getStatusStep(orderData.status) : 0;
  const isCancelled = orderData?.status === "cancelled";

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-neutral-400 hover:text-white text-sm flex items-center mb-6">
          &larr; Back to Home
        </Link>
        <h1 className="text-3xl font-black tracking-tight mb-8">TRACK YOUR ORDER</h1>
        
        {!orderData ? (
          <form onSubmit={handleSubmit} className="bg-neutral-900/60 p-6 rounded-xl border border-neutral-800 space-y-4 max-w-md">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Order ID</label>
              <input required type="text" value={orderId} onChange={e => setOrderId(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none" placeholder="e.g. jX9s8..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Contact Number</label>
              <input required type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none" placeholder="Used during checkout" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-lg bg-white text-black font-black hover:bg-neutral-200 transition-colors uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? "Searching..." : "Track Order"}
            </button>
          </form>
        ) : (
          <div className="space-y-8">
            <button onClick={() => setOrderData(null)} className="text-sm font-bold bg-neutral-900 px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-800">
              Track Another Order
            </button>

            <div className="bg-neutral-900/60 p-6 rounded-xl border border-neutral-800">
              <h2 className="text-xl font-bold mb-6">Order Status</h2>
              
              {isCancelled ? (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg font-bold text-center">
                  THIS ORDER HAS BEEN CANCELLED.
                </div>
              ) : (
                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-0 mt-8 mb-4 px-4 sm:px-10">
                  <div className="hidden sm:block absolute top-1/2 left-12 right-12 h-1 bg-neutral-800 -translate-y-1/2 z-0"></div>
                  <div className={`hidden sm:block absolute top-1/2 left-12 h-1 bg-white -translate-y-1/2 z-0 transition-all duration-500`} style={{ width: `${(Math.max(0, currentStep - 1) / 3) * 100}%` }}></div>

                  {[
                    { step: 1, label: "Pending Payment" },
                    { step: 2, label: "Confirmed" },
                    { step: 3, label: "Shipped" },
                    { step: 4, label: "Completed" },
                  ].map((s) => (
                    <div key={s.step} className="relative z-10 flex sm:flex-col items-center gap-4 sm:gap-2 text-center w-full sm:w-auto">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                        currentStep >= s.step 
                          ? "bg-white border-white text-black" 
                          : "bg-black border-neutral-700 text-neutral-500"
                      }`}>
                        {currentStep > s.step ? "✓" : s.step}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        currentStep >= s.step ? "text-white" : "text-neutral-500"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-neutral-900/60 p-6 rounded-xl border border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Order Summary</h3>
                <div className="space-y-3">
                  {orderData.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black border border-neutral-800 rounded overflow-hidden">
                          {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
                        </div>
                        <span><span className="text-neutral-500">{item.quantity}x</span> {item.name}</span>
                      </div>
                      <span className="text-neutral-400">₱{(item.price * item.quantity).toLocaleString("en-PH")}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">Shipping Fee ({orderData.shipping?.courier})</span>
                  <span className="text-white text-sm">₱{Number(orderData.shipping?.shippingFee || 0).toLocaleString("en-PH")}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-800 flex justify-between items-center">
                  <span className="font-bold text-white uppercase">Total</span>
                  <span className="text-lg font-black text-white">₱{Number(orderData.total || 0).toLocaleString("en-PH")}</span>
                </div>
              </div>

              <div className="bg-neutral-900/60 p-6 rounded-xl border border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Delivery Details</h3>
                <div className="space-y-2 text-sm text-neutral-300">
                  <p><span className="text-neutral-500">Name:</span> {orderData.customer?.name}</p>
                  <p><span className="text-neutral-500">Address:</span> {orderData.customer?.address}</p>
                  <p><span className="text-neutral-500">Courier:</span> {orderData.shipping?.courier}</p>
                  <p><span className="text-neutral-500">Payment:</span> {orderData.payment?.method} (Ref: {orderData.payment?.referenceNumber})</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center font-bold">Loading...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
