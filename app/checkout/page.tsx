"use client";

import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [courier, setCourier] = useState("Lalamove");
  const [region, setRegion] = useState("Luzon");
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentImage, setPaymentImage] = useState<File | null>(null);

  let shippingFee = 0;
  if (courier === "LBC") {
    if (region === "Luzon") shippingFee = 250;
    else if (region === "Visayas") shippingFee = 320;
    else if (region === "Mindanao") shippingFee = 320;
  }
  const finalTotal = cartTotal + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    if (!name || !contact || !address || !referenceNumber || !paymentImage) {
      setError("Please fill in all required fields and upload proof of payment.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("contact", contact);
      formData.append("address", address);
      formData.append("courier", courier);
      if (courier === "LBC") {
        formData.append("region", region);
        formData.append("shippingFee", shippingFee.toString());
      }
      formData.append("paymentMethod", paymentMethod);
      formData.append("referenceNumber", referenceNumber);
      formData.append("cart", JSON.stringify(cart));
      formData.append("total", finalTotal.toString());
      formData.append("paymentImage", paymentImage);

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Checkout failed");
      }

      clearCart();
      router.push("/checkout/success");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <p className="text-xl font-bold mb-4">Your cart is empty.</p>
        <Link href="/shop" className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-neutral-200">
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/cart" className="text-neutral-400 hover:text-white text-sm flex items-center mb-6">
          &larr; Back to Cart
        </Link>
        <h1 className="text-3xl font-black tracking-tight mb-8">CHECKOUT</h1>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-8 text-sm">
            {error}
          </div>
        )}

        <div className="bg-neutral-900/60 p-6 rounded-xl border border-neutral-800 mb-8">
          <h2 className="text-lg font-bold mb-4 border-b border-neutral-800 pb-2">Order Summary</h2>
          <div className="space-y-2 mb-4">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between text-sm text-neutral-400">
                <span>{item.quantity}x {item.name}</span>
                <span>₱{(item.price * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-neutral-800 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-300">
              <span>Product Subtotal</span>
              <span>₱{cartTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
            
            {courier === "LBC" ? (
              <div className="flex justify-between text-neutral-300">
                <span>Shipping (LBC - {region})</span>
                <span>₱{shippingFee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            ) : (
              <div className="text-xs text-neutral-500 italic mt-1">
                * Delivery fee is separate and will be paid directly to your courier upon delivery.
              </div>
            )}
            
            <div className="flex justify-between font-bold text-white text-lg pt-2 mt-2 border-t border-neutral-800">
              <span>Total</span>
              <span>₱{finalTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Shipping Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold border-b border-neutral-800 pb-2">Shipping Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Full Name *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Contact Number *</label>
                <input required type="tel" value={contact} onChange={e => setContact(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Delivery Address *</label>
              <textarea required value={address} onChange={e => setAddress(e.target.value)} rows={3} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none"></textarea>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Preferred Courier *</label>
                <select value={courier} onChange={e => setCourier(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none">
                  <option value="Lalamove">Lalamove (Metro Manila / Same Day)</option>
                  <option value="LBC">LBC (Nationwide)</option>
                </select>
              </div>
              {courier === "LBC" && (
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Select your region *</label>
                  <select value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none">
                    <option value="Luzon">Luzon</option>
                    <option value="Visayas">Visayas</option>
                    <option value="Mindanao">Mindanao</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold border-b border-neutral-800 pb-2">Payment Details</h2>
            
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-6 mb-6">
              <div className="w-32 h-32 bg-black border border-neutral-700 flex items-center justify-center rounded-lg flex-shrink-0">
                <span className="text-xs text-neutral-500 text-center">QR Code<br/>Placeholder</span>
              </div>
              <div className="text-sm text-neutral-300">
                <p className="font-bold text-white mb-2">Instructions:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Scan the QR code or send payment manually.</li>
                  <li>GCash / Maya: 09123456789 (LAZAROPH)</li>
                  <li>BDO / BPI: Available upon request</li>
                  <li>Please upload a clear screenshot of your transaction receipt.</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Payment Method *</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none">
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="BDO">BDO</option>
                  <option value="BPI">BPI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Reference Number *</label>
                <input required type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none" placeholder="e.g. 000123456789" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Proof of Payment (Screenshot) *</label>
              <input required type="file" accept="image/*" onChange={e => setPaymentImage(e.target.files?.[0] || null)} className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-sm focus:border-white focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white file:text-black hover:file:bg-neutral-200" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-lg bg-white text-black font-black hover:bg-neutral-200 transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {loading ? "Processing Order..." : "Submit Order"}
          </button>
        </form>
      </div>
    </div>
  );
}
