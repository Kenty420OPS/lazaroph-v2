"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
  const router = useRouter();
  
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recent_orders");
      if (stored) {
        setRecentOrders(JSON.parse(stored));
      }
    } catch (err) {}
  }, []);

  const clearRecentOrders = () => {
    localStorage.removeItem("recent_orders");
    setRecentOrders([]);
  };

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] flex flex-col selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full bg-white text-[#0A0A0A]">
        <h1 className="text-3xl font-black tracking-tight mb-8">YOUR CART</h1>

        {cartCount === 0 ? (
          <div className="text-center py-20 bg-[#0A0A0A]/5 rounded-2xl border border-[#0A0A0A]/10">
            <svg className="w-16 h-16 text-[#6B6B6B] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-[#0A0A0A] font-medium text-lg">Your cart is empty.</p>
            <p className="text-sm text-[#6B6B6B] mt-2 mb-6">Looks like you haven't added any authentic pairs yet.</p>
            <Link href="/shop" className="inline-flex items-center justify-center min-h-11 px-6 py-3 rounded-lg bg-[#0A0A0A] text-white font-bold hover:bg-[#0A0A0A]/90 transition-colors">
              Browse the Catalog
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1 space-y-4">
              {cart.map((item) => {
                const size = item.size ?? "";
                const key = `${item.id}::${size}`;
                return (
                  <div key={key} className="flex gap-4 p-4 bg-white rounded-xl border border-[#0A0A0A]/10 items-center">
                    <div className="w-24 h-24 bg-[#0A0A0A]/5 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#6B6B6B]">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#0A0A0A] truncate">{item.name}</h3>
                      {size ? (
                        <p className="text-[#6B6B6B] text-xs sm:text-sm mt-1">Size: {size}</p>
                      ) : null}
                      <p className="text-[#6B6B6B] text-sm mt-1">₱{item.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center bg-white border border-[#0A0A0A]/20 rounded-lg overflow-hidden min-h-11">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1, size)} className="px-3 text-[#0A0A0A] hover:bg-[#0A0A0A]/5 transition-colors min-h-11 min-w-11 flex items-center justify-center">
                            -
                          </button>
                          <span className="px-4 text-sm font-medium text-[#0A0A0A] border-x border-[#0A0A0A]/20 min-h-11 flex items-center justify-center bg-white">
                            {item.quantity}
                          </span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1, size)} className="px-3 text-[#0A0A0A] hover:bg-[#0A0A0A]/5 transition-colors min-h-11 min-w-11 flex items-center justify-center">
                            +
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.id, size)} className="inline-flex items-center justify-center min-h-11 min-w-11 px-3 text-xs font-semibold text-[#0A0A0A] border border-[#0A0A0A]/20 rounded-lg hover:bg-[#0A0A0A]/5 transition-colors">
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-[#0A0A0A]">₱{(item.price * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white p-6 rounded-xl border border-[#0A0A0A]/10 sticky top-24">
                <h2 className="text-lg font-bold mb-4 text-[#0A0A0A]">Order Summary</h2>
                <div className="space-y-3 mb-6 text-sm text-[#6B6B6B] border-b border-[#0A0A0A]/10 pb-6">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartCount} items)</span>
                    <span className="text-[#0A0A0A]">₱{cartTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-[#0A0A0A]">Calculated at checkout</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold text-[#0A0A0A]">Total</span>
                  <span className="text-xl font-black text-[#0A0A0A]">₱{cartTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
                <button
                  onClick={() => router.push("/checkout")}
                  className="w-full min-h-11 py-3 rounded-lg bg-[#0A0A0A] text-white font-bold hover:bg-[#0A0A0A]/90 transition-all text-sm uppercase tracking-wide"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}

        {recentOrders.length > 0 && (
          <div className="mt-16 border-t border-[#0A0A0A]/10 pt-12">
            <h2 className="text-xl font-black tracking-tight mb-6 uppercase text-[#0A0A0A]">Your Recent Orders</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentOrders.map((order) => {
                const isLegacy = typeof order === 'string';
                const orderId = isLegacy ? order : order.id;
                
                return (
                  <div key={orderId} className="bg-white border border-[#0A0A0A]/10 rounded-xl p-5 flex flex-col justify-between group hover:border-[#0A0A0A]/30 transition-colors">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-4">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-widest mb-1 block">Order ID</span>
                          <p className="font-mono font-bold text-[#0A0A0A] text-sm break-all group-hover:text-[#6B6B6B] transition-colors">{orderId}</p>
                        </div>
                        {!isLegacy && order.date && (
                          <span className="text-[10px] text-[#6B6B6B] font-medium shrink-0">
                            {new Date(order.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {!isLegacy && order.items && order.items.length > 0 && (
                        <div className="mb-6 space-y-3">
                          {order.items.slice(0, 2).map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#0A0A0A]/5 rounded border border-[#0A0A0A]/10 overflow-hidden flex-shrink-0">
                                {item.imageUrl && !failedImages.has(`${order.id}-${i}`) ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    onError={() =>
                                      setFailedImages(prev => new Set(prev).add(`${order.id}-${i}`))
                                    }
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#6B6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#0A0A0A] truncate">{item.name}</p>
                                {item.size ? (
                                  <p className="text-xs sm:text-sm text-[#6B6B6B] truncate">Size: {item.size}</p>
                                ) : null}
                                <p className="text-xs text-[#6B6B6B]">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-xs text-[#6B6B6B] italic">+{order.items.length - 2} more items</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-auto">
                      {!isLegacy && order.total && (
                        <div className="flex justify-between items-center mb-4 pt-4 border-t border-[#0A0A0A]/10">
                          <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-widest">Total</span>
                          <span className="text-sm font-black text-[#0A0A0A]">₱{order.total.toLocaleString("en-PH")}</span>
                        </div>
                      )}
                      <Link href={`/track-order?orderId=${orderId}`} className="flex items-center justify-center w-full min-h-11 py-2.5 rounded-lg bg-white text-[#0A0A0A] border border-[#0A0A0A] text-xs font-bold uppercase tracking-wider hover:bg-[#0A0A0A]/5 transition-colors">
                        Track Status &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={clearRecentOrders}
                className="inline-flex items-center justify-center min-h-11 text-xs text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-2 transition-colors"
              >
                Clear history
              </button>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
