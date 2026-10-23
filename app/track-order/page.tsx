"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getStatusStep, getTrackSteps } from "@/lib/order-status";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const defaultOrderId = searchParams.get("orderId") || "";

  const [orderId, setOrderId] = useState(defaultOrderId);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState<any>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingMessage, setRatingMessage] = useState("");
  const [ratingDone, setRatingDone] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim(), contact: contact.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Order not found");
        setOrderData(null);
      } else {
        setOrderData(data.order);
        setSelectedRating(0);
        setRatingMessage("");
        setRatingDone(false);
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const courier = orderData?.shipping?.courier;
  const trackSteps = getTrackSteps(courier);
  const currentStep = orderData ? getStatusStep(courier, orderData.status) : 0;
  const isCancelled = orderData?.status === "cancelled";

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] flex flex-col">
      <SiteHeader />

      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white text-[#0A0A0A]">
        <Link href="/" className="inline-flex items-center min-h-11 text-[#6B6B6B] hover:text-[#0A0A0A] text-sm mb-6">
          &larr; Back to Home
        </Link>
        <h1 className="text-3xl font-black tracking-tight mb-8">TRACK YOUR ORDER</h1>
        
        {!orderData ? (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-[#0A0A0A]/10 space-y-4 max-w-md">
            {error && (
              <div className="bg-[#0A0A0A]/5 border border-[#0A0A0A]/10 text-[#0A0A0A] p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-[#0A0A0A] uppercase tracking-wide mb-1">Order ID</label>
              <input required type="text" value={orderId} onChange={e => setOrderId(e.target.value)} className="w-full min-h-11 bg-white border border-[#0A0A0A]/20 rounded-lg p-3 text-sm text-[#0A0A0A] placeholder-[#6B6B6B] focus:border-[#0A0A0A] focus:outline-none" placeholder="e.g. jX9s8..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0A0A0A] uppercase tracking-wide mb-1">Contact Number</label>
              <input required type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full min-h-11 bg-white border border-[#0A0A0A]/20 rounded-lg p-3 text-sm text-[#0A0A0A] placeholder-[#6B6B6B] focus:border-[#0A0A0A] focus:outline-none" placeholder="Used during checkout" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-11 py-3 mt-2 rounded-lg bg-[#0A0A0A] text-white font-black hover:bg-[#0A0A0A]/90 transition-colors uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? "Searching..." : "Track Order"}
            </button>
          </form>
        ) : (
          <div className="space-y-8">
            <div className="flex gap-4">
              <button onClick={() => setOrderData(null)} className="text-sm font-bold bg-white px-4 py-2 min-h-11 rounded border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A]/5 transition-colors">
                Track Another Order
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="text-sm font-bold bg-white px-4 py-2 min-h-11 rounded border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A]/5 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  "Refresh Status"
                )}
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#0A0A0A]/10">
              <h2 className="text-xl font-bold mb-6 text-[#0A0A0A]">Order Status</h2>

              {isCancelled ? (
                <div className="bg-[#0A0A0A]/5 border border-[#0A0A0A]/10 text-[#0A0A0A] p-4 rounded-lg font-bold text-center">
                  THIS ORDER HAS BEEN CANCELLED.
                </div>
              ) : (
                <div className="relative flex flex-col sm:grid sm:grid-cols-4 items-start gap-6 sm:gap-0 mt-8 mb-4">
                  <div className="hidden sm:block absolute top-4 h-1 bg-[#0A0A0A]/10 -translate-y-1/2 z-0" style={{ left: '12.5%', right: '12.5%' }}></div>
                  <div className="hidden sm:block absolute top-4 h-1 bg-[#0A0A0A] -translate-y-1/2 z-0 transition-all duration-500" style={{ left: '12.5%', width: `${(Math.max(0, currentStep - 1) / Math.max(1, trackSteps.length - 1)) * 75}%` }}></div>

                  {trackSteps.map((s, idx) => {
                    const step = idx + 1;
                    return (
                    <div key={s.status} className="relative z-10 flex sm:flex-col items-center gap-4 sm:gap-2 text-center w-full">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                        currentStep >= step
                          ? "bg-[#0A0A0A] border-[#0A0A0A] text-white"
                          : "bg-[#0A0A0A]/5 border-[#0A0A0A]/20 text-[#6B6B6B]"
                      }`}>
                        {currentStep > step ? "✓" : step}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        currentStep >= step ? "text-[#0A0A0A]" : "text-[#6B6B6B]"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl border border-[#0A0A0A]/10">
                <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider mb-4 border-b border-[#0A0A0A]/10 pb-2">Order Summary</h3>
                <div className="space-y-3">
                  {orderData.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#0A0A0A]/5 border border-[#0A0A0A]/10 rounded overflow-hidden">
                          {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
                        </div>
                        <span><span className="text-[#6B6B6B]">{item.quantity}x</span> {item.name}{typeof item.size === "string" && item.size ? ` (Size: ${item.size})` : ""}</span>
                      </div>
                      <span className="text-[#6B6B6B]">₱{(item.price * item.quantity).toLocaleString("en-PH")}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-[#0A0A0A]/10 flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Shipping Fee ({orderData.shipping?.courier})</span>
                  <span className="text-[#0A0A0A] text-sm">₱{Number(orderData.shipping?.shippingFee || 0).toLocaleString("en-PH")}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-[#0A0A0A]/10 flex justify-between items-center">
                  <span className="font-bold text-[#0A0A0A] uppercase">Total</span>
                  <span className="text-lg font-black text-[#0A0A0A]">₱{Number(orderData.total || 0).toLocaleString("en-PH")}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#0A0A0A]/10">
                <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider mb-4 border-b border-[#0A0A0A]/10 pb-2">{courier === "Pickup" ? "Pickup Details" : "Delivery Details"}</h3>
                <div className="space-y-2 text-sm text-[#0A0A0A]">
                  <p><span className="text-[#6B6B6B]">Name:</span> {orderData.customer?.name}</p>
                  {courier === "Pickup" ? (
                    <p><span className="text-[#6B6B6B]">Pickup at:</span> {orderData.shipping?.branchName}, {orderData.shipping?.branchAddress}</p>
                  ) : orderData.customer?.address ? (
                    <p><span className="text-[#6B6B6B]">Address:</span> {orderData.customer?.address}</p>
                  ) : null}
                  <p><span className="text-[#6B6B6B]">Courier:</span> {orderData.shipping?.courier}</p>
                  <p><span className="text-[#6B6B6B]">Payment:</span> {orderData.payment?.method} (Ref: {orderData.payment?.referenceNumber})</p>
                </div>
              </div>
            </div>

            {(orderData.status === "completed" || orderData.status === "picked_up") && (
              <div className="bg-white p-6 rounded-xl border border-[#0A0A0A]/10">
                <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider mb-4 border-b border-[#0A0A0A]/10 pb-2">
                  Rate Your Order
                </h3>
                {ratingDone ? (
                  <p className="text-sm text-[#0A0A0A]">{ratingMessage}</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedRating(star)}
                          className={`min-h-11 w-11 flex items-center justify-center text-2xl transition-colors ${
                            selectedRating >= star
                              ? "text-[#0A0A0A]"
                              : "text-[#0A0A0A]/20 hover:text-[#0A0A0A]/50"
                          }`}
                          aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                        >
                          &#9733;
                        </button>
                      ))}
                    </div>
                    {ratingMessage && (
                      <p className="text-sm text-[#6B6B6B]">{ratingMessage}</p>
                    )}
                    <button
                      type="button"
                      disabled={selectedRating === 0 || ratingSubmitting}
                      onClick={async () => {
                        setRatingSubmitting(true);
                        setRatingMessage("");
                        try {
                          const res = await fetch("/api/reviews", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              orderId: orderId.trim(),
                              contact: contact.trim(),
                              rating: selectedRating,
                            }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setRatingDone(true);
                            setRatingMessage("Thank you for your rating!");
                          } else {
                            setRatingMessage(data.error || "Could not submit rating. Please try again.");
                          }
                        } catch {
                          setRatingMessage("Could not submit rating. Please try again.");
                        } finally {
                          setRatingSubmitting(false);
                        }
                      }}
                      className="min-h-11 px-6 py-2 rounded-lg bg-[#0A0A0A] text-white text-sm font-bold hover:bg-[#0A0A0A]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {ratingSubmitting ? "Submitting..." : "Submit Rating"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white text-[#0A0A0A] flex items-center justify-center font-bold">Loading...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
