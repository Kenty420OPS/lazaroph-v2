"use client";

import { useEffect, useState, FormEvent } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Sneakers");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [simulateUploadFailure, setSimulateUploadFailure] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        verifyAndLoad();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError(err.message || "Failed to login");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setProducts([]);
  };

  const verifyAndLoad = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId("");
    setName("");
    setBrand("");
    setCategory("Sneakers");
    setPrice("");
    setStock("10");
    setDescription("");
    setImageFile(null);
    setSimulateUploadFailure(false);
    
    const fileInput = document.getElementById("imageUpload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleEditSelect = (p: any) => {
    setEditingId(p.id);
    setName(p.name || p.title || "");
    setBrand(p.brand || "");
    setCategory(p.category || "Sneakers");
    setPrice(p.price?.toString() || "");
    setStock(p.stock?.toString() || "10");
    setDescription(p.description || "");
    setImageFile(null);
  };

  const getAuthHeader = async () => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    return "Bearer " + token;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      alert("Name and price are required");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (editingId) formData.append("id", editingId);
      formData.append("name", name);
      formData.append("brand", brand);
      formData.append("category", category);
      formData.append("price", price);
      formData.append("stock", stock);
      formData.append("description", description);
      formData.append("simulateUploadFailure", simulateUploadFailure.toString());

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/products", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Authorization": authHeader,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        alert(editingId ? "Product updated!" : "Product added!");
        resetForm();
        verifyAndLoad();
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, productName: string) => {
    if (!confirm("Are you sure you want to delete " + productName + "?")) return;
    
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const response = await fetch(`/api/admin/products?id=${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": authHeader,
        }
      });
      const data = await response.json();
      if (data.success) {
        verifyAndLoad();
      } else {
        alert("Error deleting: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete");
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-black flex justify-center items-center text-white">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center text-white p-4">
        <form onSubmit={handleLogin} className="bg-neutral-900 p-8 rounded-xl border border-neutral-800 w-full max-w-md space-y-4">
          <h1 className="text-xl font-bold uppercase tracking-wider text-center">Admin Login</h1>
          {loginError && <div className="text-red-500 text-sm text-center">{loginError}</div>}
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Email</label>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-white" required />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Password</label>
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-white" required />
          </div>
          <button type="submit" className="w-full bg-white text-black font-bold py-2 rounded uppercase tracking-wider">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-mono text-white flex flex-col">
      <header className="border-b border-neutral-800 bg-black sticky top-0 z-10 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black tracking-tighter uppercase leading-none">LAZAROPH<span className="text-neutral-500 ml-2">ADMIN</span></h1>
          <p className="text-[10px] text-neutral-400 hidden sm:block">Server-side Authenticated Mode</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs text-neutral-400">{user.email}</span>
          <button onClick={handleLogout} className="bg-neutral-900 border border-neutral-700 px-4 py-2 text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors">Logout</button>
        </div>
      </header>

      <main className="flex-grow p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <form onSubmit={handleSubmit} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-base font-bold uppercase tracking-wider border-b border-neutral-800 pb-2 mb-4">
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>
              {error && <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-200 text-xs">{error}</div>}
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Product Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Brand</label>
                    <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Category *</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white">
                      <option>Sneakers</option>
                      <option>Bags & Luggage</option>
                      <option>Watches</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Price (?) *</label>
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" step="0.01" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Stock</label>
                    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} min="0" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Product Image</label>
                  <input id="imageUpload" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-400" />
                  <p className="text-[9px] text-neutral-500 mt-1">Image will be uploaded to Firebase Storage</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
                </div>

                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1 mt-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input type="checkbox" checked={simulateUploadFailure} onChange={(e) => setSimulateUploadFailure(e.target.checked)} className="rounded bg-black border-neutral-700 text-white w-4 h-4" />
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Simulate Upload Failure</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="submit" disabled={submitting} className="flex-1 bg-white text-black font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider">
                  {submitting ? "Saving..." : editingId ? "Update" : "Add"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="bg-neutral-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg">Reset</button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Firestore Product Catalog</h2>
              <button onClick={verifyAndLoad} className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg">Refresh ?</button>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-20 bg-neutral-900 rounded-xl animate-pulse"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-500 text-xs">No products found.</div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <div key={p.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-black border border-neutral-800 rounded-lg overflow-hidden flex items-center justify-center">
                        {(p.imageUrl || p.mainImageUrl || p.image) ? (
                          <img src={p.imageUrl || p.mainImageUrl || p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-neutral-600 font-bold">NO IMG</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white">{p.name || p.title}</h3>
                        <p className="text-xs font-bold text-neutral-300 mt-1">?{Number(p.price || 0).toLocaleString("en-PH")}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditSelect(p)} className="px-3 py-1.5 bg-neutral-900 text-xs font-bold text-white rounded-lg">Edit</button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="px-3 py-1.5 bg-red-950 text-xs font-bold text-red-300 rounded-lg">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
