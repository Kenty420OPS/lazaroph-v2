"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { getShippingFee, SHIPPING_METHODS, METRO_MANILA_CITIES, type Courier, type Region } from "@/lib/shipping";
import { getBranch, DEFAULT_PICKUP_BRANCH_ID } from "@/lib/branches";

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [courier, setCourier] = useState<Courier | "">("");
  const [region, setRegion] = useState<Region | "">("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [riderFeeAck, setRiderFeeAck] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [methodsUnavailable, setMethodsUnavailable] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentImage, setPaymentImage] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payment-methods", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success || !Array.isArray(data.methods) || data.methods.length === 0) {
          setMethodsUnavailable(true);
          setPaymentMethods([]);
        } else {
          setPaymentMethods(data.methods);
          setPaymentMethod(data.methods[0].name);
          setPaymentMethodId(data.methods[0].id);
        }
      } catch (err) {
        console.error("Failed to load payment methods:", err);
        if (!cancelled) {
          setMethodsUnavailable(true);
          setPaymentMethods([]);
        }
      } finally {
        if (!cancelled) setMethodsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId) || null;

  const shippingFee =
    courier && (courier !== "LBC" || region)
      ? getShippingFee(courier, region)
      : 0;
  const finalTotal = cartTotal + shippingFee;

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const max_size = 1600;

          if (width > height) {
            if (width > max_size) {
              height = Math.round((height *= max_size / width));
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width = Math.round((width *= max_size / height));
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Return a new File object
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                }));
              } else {
                reject(new Error("Image compression failed"));
              }
            },
            "image/jpeg",
            0.8
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    if (!name || !contact || !referenceNumber || !paymentImage) {
      setError("Please fill in all required fields and upload proof of payment.");
      return;
    }

    if (!courier) {
      setError("Please select a shipping method.");
      return;
    }
    if (courier !== "Pickup" && !address) {
      setError("Please fill in all required fields and upload proof of payment.");
      return;
    }
    if (courier === "LBC" && !region) {
      setError("Please select a region for LBC.");
      return;
    }
    if (courier === "Lalamove" && (!deliveryCity || !riderFeeAck)) {
      setError("Please select your delivery city and acknowledge the Lalamove delivery terms.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Compress image to ensure it's under Vercel's 4.5MB limit
      let processedImage = paymentImage;
      try {
        if (paymentImage.type.startsWith('image/')) {
          processedImage = await compressImage(paymentImage);
        }
      } catch (err) {
        console.error("Compression error:", err);
        setError("Failed to process image. Please try uploading a different photo.");
        setLoading(false);
        return;
      }

      // Ensure user has a uid for chat association
      let uid = auth.currentUser?.uid;
      if (!uid) {
        try {
          const userCred = await signInAnonymously(auth);
          uid = userCred.user.uid;
        } catch (authErr) {
          console.error("Failed to sign in anonymously", authErr);
        }
      }

      const formData = new FormData();
      formData.append("name", name);
      formData.append("contact", contact);
      formData.append("address", courier === "Pickup" ? "" : address);
      formData.append("courier", courier);
      if (courier === "LBC") {
        formData.append("region", region);
        formData.append("shippingFee", shippingFee.toString());
      }
      if (courier === "Lalamove") {
        formData.append("city", deliveryCity);
        formData.append("metroManilaAcknowledged", "true");
      }
      if (courier === "Pickup") {
        formData.append("shippingFee", shippingFee.toString());
      }
      formData.append("paymentMethod", paymentMethod);
      formData.append("paymentMethodId", paymentMethodId);
      formData.append("referenceNumber", referenceNumber);
      formData.append("cart", JSON.stringify(cart));
      formData.append("total", finalTotal.toString());
      formData.append("paymentImage", processedImage);
      if (uid) {
        formData.append("uid", uid);
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });

      // Guard 1: surface HTTP-level errors before parsing body
      if (!res.ok) {
        let errMsg = "Checkout failed";
        try { errMsg = (await res.json()).error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Checkout failed");
      }

      // Guard 2: only persist when we have a confirmed orderId
      if (data.orderId) {
        try {
          const stored = localStorage.getItem("recent_orders");
          // Guard 3: inner try/catch so corrupt storage never surfaces as a checkout error
          let orders: any[] = [];
          try { orders = stored ? JSON.parse(stored) : []; } catch { orders = []; }
          const orderSummary = {
            id: data.orderId,
            date: new Date().toISOString(),
            // Only store display-safe fields — NO contact, NO address
            items: cart.map(item => ({ name: item.name, imageUrl: item.imageUrl, quantity: item.quantity })),
            total: finalTotal,
          };
          // Deduplicate and cap at 5 entries
          orders = orders.filter((o: any) => (typeof o === 'string' ? o : o.id) !== data.orderId);
          orders = [orderSummary, ...orders].slice(0, 5);
          localStorage.setItem("recent_orders", JSON.stringify(orders));
        } catch (err) {
          console.error("Failed to save recent order", err);
        }
      }

      clearCart();
      const branchName =
        courier === "Pickup" ? getBranch(DEFAULT_PICKUP_BRANCH_ID)?.name ?? "" : "";
      const branchParam =
        courier === "Pickup" && branchName
          ? `&branchName=${encodeURIComponent(branchName)}`
          : "";
      router.push(
        `/checkout/success?orderId=${data.orderId}&courier=${encodeURIComponent(courier)}${branchParam}`
      );
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
            
            {courier === "Pickup" ? (
              <div className="flex justify-between text-neutral-300">
                <span>Store pickup</span>
                <span>₱0.00</span>
              </div>
            ) : courier === "LBC" && region ? (
              <div className="flex justify-between text-neutral-300">
                <span>Shipping (LBC - {region})</span>
                <span>₱{shippingFee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            ) : courier === "Lalamove" ? (
              <div className="text-xs text-neutral-500 italic mt-1">
                {SHIPPING_METHODS.Lalamove.note}
              </div>
            ) : (
              <div className="text-xs text-neutral-500 italic mt-1">
                Select a shipping method
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
            {courier === "Pickup" ? (
              <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-lg text-sm">
                <p className="font-bold text-white mb-2">{getBranch(DEFAULT_PICKUP_BRANCH_ID)?.name}</p>
                <p className="text-neutral-400 whitespace-pre-line">{getBranch(DEFAULT_PICKUP_BRANCH_ID)?.address}</p>
                <p className="text-neutral-400 mt-2">{getBranch(DEFAULT_PICKUP_BRANCH_ID)?.hours}</p>
                <p className="text-neutral-400">{getBranch(DEFAULT_PICKUP_BRANCH_ID)?.phone}</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Delivery Address *</label>
                <textarea required value={address} onChange={e => setAddress(e.target.value)} rows={3} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none"></textarea>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Preferred Courier *</label>
                <select value={courier} onChange={e => setCourier(e.target.value as Courier)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none">
                  <option value="" disabled>Select shipping method</option>
                  {(Object.keys(SHIPPING_METHODS) as Courier[]).map((c) => (
                    <option key={c} value={c}>{SHIPPING_METHODS[c].label} ({SHIPPING_METHODS[c].description})</option>
                  ))}
                </select>
              </div>
              {courier === "LBC" && (
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Select your region *</label>
                  <select value={region} onChange={e => setRegion(e.target.value as Region)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none">
                    <option value="" disabled>Select region</option>
                    <option value="Luzon">Luzon</option>
                    <option value="Visayas">Visayas</option>
                    <option value="Mindanao">Mindanao</option>
                  </select>
                </div>
              )}
            </div>
            {courier === "Lalamove" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Delivery City (Metro Manila only) *</label>
                  <select required value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none">
                    <option value="" disabled>Select city</option>
                    {METRO_MANILA_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 italic mt-1">Outside Metro Manila? Choose LBC.</p>
                </div>
                <label className="flex items-start gap-3 text-sm text-neutral-300 cursor-pointer">
                  <input required type="checkbox" checked={riderFeeAck} onChange={e => setRiderFeeAck(e.target.checked)} className="mt-1 accent-white" />
                  <span>I understand Lalamove delivery is within Metro Manila only, and I will pay the rider&apos;s delivery fee directly.</span>
                </label>
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold border-b border-neutral-800 pb-2">Payment Details</h2>
            
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-6 mb-6">
              {methodsLoading ? (
                <p className="text-sm text-neutral-400">Loading payment methods...</p>
              ) : methodsUnavailable || !selectedMethod ? (
                <p className="text-sm text-red-400 font-bold">Payment methods are unavailable. Please contact the store.</p>
              ) : (
                <>
                  <div className="w-32 h-32 bg-black border border-neutral-700 flex items-center justify-center rounded-lg flex-shrink-0">
                    {selectedMethod.qrUrl ? (
                      <img src={selectedMethod.qrUrl} alt={`${selectedMethod.name} QR Code`} className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <span className="text-xs text-neutral-500 text-center">No QR<br/>available</span>
                    )}
                  </div>
                  <div className="text-sm text-neutral-300">
                    <p className="font-bold text-white mb-2">{selectedMethod.name}</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Account Name: {selectedMethod.accountName}</li>
                      <li>Account Number: {selectedMethod.accountNumber}</li>
                      {selectedMethod.instructions ? <li>{selectedMethod.instructions}</li> : null}
                      <li>Please upload a clear screenshot of your transaction receipt.</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">Payment Method *</label>
                <select
                  value={paymentMethodId}
                  onChange={(e) => {
                    const m = paymentMethods.find((x) => x.id === e.target.value);
                    setPaymentMethodId(e.target.value);
                    setPaymentMethod(m ? m.name : "");
                  }}
                  className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm focus:border-white focus:outline-none"
                >
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
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
            disabled={loading || methodsLoading || methodsUnavailable || !selectedMethod}
            className="w-full py-4 rounded-lg bg-white text-black font-black hover:bg-neutral-200 transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {loading ? "Processing Order..." : "Submit Order"}
          </button>
        </form>
      </div>
    </div>
  );
}
