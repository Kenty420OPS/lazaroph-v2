"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name?: string;
  title?: string;
  brand?: string;
  category?: string;
  price?: number | string;
  stock?: number;
  description?: string;
  imageUrl?: string;
  mainImageUrl?: string;
  image?: string;
}

const DEFAULT_ADMIN_KEY = "lazaroph-admin-secret-2026";
const CATEGORIES = ["Sneakers", "Bags & Luggage", "Watches"];

export default function AdminPage() {
  // Auth state
  const [adminKey, setAdminKey] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [category, setCategory] = useState<string>("Sneakers");
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("10");
  const [description, setDescription] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [simulateUploadFailure, setSimulateUploadFailure] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Check saved admin token on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("admin_token") || getCookie("admin_token");
    if (savedKey) {
      setAdminKey(savedKey);
      verifyAndLoad(savedKey);
    }
  }, []);

  function getCookie(cname: string) {
    if (typeof document === "undefined") return "";
    const name = cname + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  function setAdminCookie(token: string) {
    document.cookie = `admin_token=${token}; path=/; max-age=86400; SameSite=Strict`;
    localStorage.setItem("admin_token", token);
  }

  function clearAdminCookie() {
    document.cookie = "admin_token=; path=/; max-age=0;";
    localStorage.removeItem("admin_token");
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    verifyAndLoad(adminKey.trim());
  };

  const verifyAndLoad = async (keyToTest: string) => {
    setLoading(true);
    setAuthError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/products", {
        headers: {
          "x-admin-key": keyToTest,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsAuthorized(false);
        setAuthError(data.error || "Authentication failed. Invalid Admin Key.");
        clearAdminCookie();
      } else {
        setIsAuthorized(true);
        setAdminCookie(keyToTest);
        setProducts(data.products || []);
      }
    } catch (err: any) {
      setIsAuthorized(false);
      setAuthError(err.message || "Failed to reach Admin API route.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAdminCookie();
    setIsAuthorized(false);
    setAdminKey("");
    setProducts([]);
    setStatusMessage({ type: "success", text: "Logged out successfully." });
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setBrand("");
    setCategory("Sneakers");
    setPrice("");
    setStock("10");
    setDescription("");
    setImageUrl("");
    setImageFile(null);
    setSimulateUploadFailure(false);
  };

  const handleEditSelect = (p: Product) => {
    setEditingId(p.id);
    setName(p.name || p.title || "");
    setBrand(p.brand || "");
    setCategory(p.category || "Sneakers");
    setPrice(String(p.price || ""));
    setStock(String(p.stock || "10"));
    setDescription(p.description || "");
    setImageUrl(p.imageUrl || p.mainImageUrl || p.image || "");
    setImageFile(null);
    setSimulateUploadFailure(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMessage({ type: "error", text: "Product Name is required." });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      if (editingId) formData.append("id", editingId);
      formData.append("name", name.trim());
      formData.append("brand", brand.trim());
      formData.append("category", category.trim());
      formData.append("price", price || "0");
      formData.append("stock", stock || "10");
      formData.append("description", description.trim());
      formData.append("imageUrl", imageUrl.trim());
      if (simulateUploadFailure) formData.append("simulateUploadFailure", "true");
      if (imageFile) formData.append("image", imageFile);

      const url = "/api/admin/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "x-admin-key": adminKey,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save product.");
      }

      setStatusMessage({
        type: "success",
        text: editingId ? "Product updated successfully!" : "Product added successfully!",
      });

      resetForm();
      // Reload products list
      verifyAndLoad(adminKey);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "An error occurred while saving product.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete "${prodName}"?`)) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": adminKey,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete product.");
      }

      setStatusMessage({ type: "success", text: `Product "${prodName}" deleted successfully.` });
      verifyAndLoad(adminKey);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to delete product." });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/90 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-white text-black font-black flex items-center justify-center shadow-md">
              <span className="text-lg">A</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                LAZAROPH <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">Admin</span>
              </span>
              <p className="text-[10px] text-neutral-400">Products & Inventory Management</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              target="_blank"
              className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              View Shop ↗
            </Link>

            {isAuthorized && (
              <button
                onClick={handleLogout}
                className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Auth Gate view if not authorized */}
        {!isAuthorized ? (
          <div className="max-w-md mx-auto my-12 bg-neutral-950 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-xl mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Admin Authentication</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Enter your Admin Secret Key to access the dashboard. Server-side verification is enforced.
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-300 text-center font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Admin Key
                </label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter secret key..."
                  className="w-full bg-black border border-neutral-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                  required
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Default key: <code className="text-neutral-400 bg-neutral-900 px-1 py-0.5 rounded">{DEFAULT_ADMIN_KEY}</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-neutral-200 text-black font-bold text-xs py-2.5 rounded-lg transition-colors shadow-md disabled:opacity-50 uppercase tracking-wider"
              >
                {loading ? "Verifying Admin Access..." : "Authenticate & Access Admin"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Status Banner */}
            {statusMessage && (
              <div
                className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
                  statusMessage.type === "success"
                    ? "bg-neutral-900 border-neutral-700 text-white"
                    : "bg-red-950/70 border-red-800 text-red-200"
                }`}
              >
                <span>{statusMessage.text}</span>
                <button
                  onClick={() => setStatusMessage(null)}
                  className="text-neutral-400 hover:text-white ml-4 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Grid Layout: Form on top/left, Products list on bottom/right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Product Form Column (5 cols) */}
              <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 rounded-2xl p-6 h-fit sticky top-24">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    {editingId ? "Edit Product" : "Add New Product"}
                  </h2>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs text-neutral-400 hover:text-white underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Nike Air Max 90"
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                      required
                    />
                  </div>

                  {/* Brand & Category row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g. Nike"
                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Price & Stock row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Price (PHP) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Stock
                      </label>
                      <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="10"
                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  {/* Image Upload File */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                      Product Image File (Firebase Storage Server Upload)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-neutral-400 bg-black border border-neutral-800 rounded-lg p-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-white file:text-black hover:file:bg-neutral-200"
                    />
                  </div>

                  {/* Image URL fallback */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                      Or Image URL
                    </label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter product description..."
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white resize-none"
                    />
                  </div>

                  {/* Verification Helper: Simulate Upload Failure */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simulateUploadFailure}
                        onChange={(e) => setSimulateUploadFailure(e.target.checked)}
                        className="rounded bg-black border-neutral-700 text-white focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                        Simulate Upload Failure (Test Verification)
                      </span>
                    </label>
                    <p className="text-[10px] text-neutral-400">
                      When checked, the server API handler forces an image upload failure and confirms no orphaned product doc is saved to Firestore.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-white hover:bg-neutral-200 text-black font-bold text-xs py-2.5 rounded-lg transition-colors shadow-md disabled:opacity-50 uppercase tracking-wider"
                    >
                      {submitting
                        ? "Coordinating Upload & Saving..."
                        : editingId
                        ? "Update Product"
                        : "Add Product"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Product List Column (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Firestore Product Catalog ({products.length})
                  </h2>
                  <button
                    onClick={() => verifyAndLoad(adminKey)}
                    className="text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg"
                  >
                    Refresh List ↻
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-neutral-900 rounded-xl border border-neutral-800 animate-pulse"></div>
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-500 text-xs">
                    No products in Firestore yet. Use the form to add your first product.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((p) => {
                      const displayImg = p.imageUrl || p.mainImageUrl || p.image || "";
                      const displayPrice = Number(p.price || 0).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      });

                      return (
                        <div
                          key={p.id}
                          className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors"
                        >
                          <div className="flex items-center space-x-4 min-w-0">
                            <div className="w-14 h-14 bg-black border border-neutral-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {displayImg && displayImg.startsWith("http") ? (
                                <img
                                  src={displayImg}
                                  alt={p.name || "Product"}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <span className="text-[10px] text-neutral-600 font-bold">NO IMG</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                {p.brand && (
                                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                    {p.brand}
                                  </span>
                                )}
                                <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded uppercase">
                                  {p.category || "Sneakers"}
                                </span>
                              </div>
                              <h3 className="text-xs font-bold text-white truncate mt-0.5">
                                {p.name || p.title || "Untitled"}
                              </h3>
                              <p className="text-xs font-bold text-neutral-300 mt-1">
                                ₱{displayPrice} <span className="text-[10px] text-neutral-500 font-normal ml-2">Stock: {p.stock ?? 10}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button
                              onClick={() => handleEditSelect(p)}
                              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-white rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.name || p.title || "Product")}
                              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-xs font-bold text-red-300 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-neutral-800 bg-black py-6 text-center text-xs text-neutral-500">
        <p>© 2026 LAZAROPH Admin Panel — Server-side Auth Protected.</p>
      </footer>
    </div>
  );
}
