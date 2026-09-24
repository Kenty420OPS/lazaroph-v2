"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
  const router = useRouter();
  
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recent_orders");
      if (stored) {
        setRecentOrders(JSON.parse(stored));
      }
    } catch (err) {}
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-neutral-800">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/90 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/shop" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-white text-black font-black flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <span className="text-lg">L</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-neutral-300 transition-colors">
                LAZAROPH <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">v2</span>
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/shop" className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors shadow-sm">
              Continue Shopping
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-black tracking-tight mb-8">YOUR CART</h1>

        {cartCount === 0 ? (
          <div className="text-center py-20 bg-neutral-900/40 rounded-2xl border border-neutral-800">
            <svg className="w-16 h-16 text-neutral-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-neutral-300 font-medium text-lg">Your cart is empty.</p>
            <p className="text-sm text-neutral-500 mt-2 mb-6">Looks like you haven't added any authentic pairs yet.</p>
            <Link href="/shop" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 transition-colors">
              Browse the Catalog
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1 space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 bg-neutral-900/60 rounded-xl border border-neutral-800 items-center">
                  <div className="w-24 h-24 bg-black rounded-lg overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-700">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{item.name}</h3>
                    <p className="text-neutral-400 text-sm mt-1">₱{item.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center bg-black border border-neutral-700 rounded-lg overflow-hidden h-8">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors h-full flex items-center justify-center">
                          -
                        </button>
                        <span className="px-4 text-sm font-medium text-white border-x border-neutral-700 h-full flex items-center justify-center bg-neutral-900">
                          {item.quantity}
                        </span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors h-full flex items-center justify-center">
                          +
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-xs font-semibold text-red-500 hover:text-red-400 underline underline-offset-2">
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-white">₱{(item.price * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-neutral-900/60 p-6 rounded-xl border border-neutral-800 sticky top-24">
                <h2 className="text-lg font-bold mb-4">Order Summary</h2>
                <div className="space-y-3 mb-6 text-sm text-neutral-400 border-b border-neutral-800 pb-6">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartCount} items)</span>
                    <span className="text-white">₱{cartTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-white">Calculated at checkout</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold text-white">Total</span>
                  <span className="text-xl font-black text-white">₱{cartTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
                <button
                  onClick={() => router.push("/checkout")}
                  className="w-full py-3 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 transition-all text-sm uppercase tracking-wide"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}

        {recentOrders.length > 0 && (
          <div className="mt-16 border-t border-neutral-800 pt-12">
            <h2 className="text-xl font-black tracking-tight mb-6 uppercase">Your Recent Orders</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentOrders.map((order) => {
                const isLegacy = typeof order === 'string';
                const orderId = isLegacy ? order : order.id;
                
                return (
                  <div key={orderId} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between group hover:border-neutral-700 transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 block">Order ID</span>
                          <p className="font-mono font-bold text-neutral-300 text-sm truncate group-hover:text-white transition-colors">{orderId}</p>
                        </div>
                        {!isLegacy && order.date && (
                          <span className="text-[10px] text-neutral-500 font-medium">
                            {new Date(order.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {!isLegacy && order.items && order.items.length > 0 && (
                        <div className="mb-6 space-y-3">
                          {order.items.slice(0, 2).map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-black rounded border border-neutral-800 overflow-hidden flex-shrink-0">
                                {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                                <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-xs text-neutral-500 italic">+{order.items.length - 2} more items</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-auto">
                      {!isLegacy && order.total && (
                        <div className="flex justify-between items-center mb-4 pt-4 border-t border-neutral-800/50">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Total</span>
                          <span className="text-sm font-black text-white">₱{order.total.toLocaleString("en-PH")}</span>
                        </div>
                      )}
                      <Link href={`/track-order?orderId=${orderId}`} className="flex items-center justify-center w-full py-2.5 rounded-lg bg-neutral-800 text-white border border-neutral-700 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black hover:border-white transition-colors">
                        Track Status &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
