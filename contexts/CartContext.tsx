"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  size?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string, size?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem("lazaroph_cart");
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const normalized = Array.isArray(parsed)
          ? parsed.map((i: any) => ({ ...i, size: i.size ?? "" }))
          : [];
        setCart(normalized);
      } catch (e) {
        console.error("Failed to parse cart from local storage", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("lazaroph_cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const itemSize = (item as CartItem).size ?? "";
      const existing = prev.find((i) => i.id === item.id && (i.size ?? "") === itemSize);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && (i.size ?? "") === itemSize ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, size: itemSize, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, size: string = "") => {
    setCart((prev) => prev.filter((i) => !(i.id === id && (i.size ?? "") === size)));
  };

  const updateQuantity = (id: string, quantity: number, size: string = "") => {
    setCart((prev) =>
      prev.map((i) => (i.id === id && (i.size ?? "") === size ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
