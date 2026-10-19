"use client";

import { useEffect, useState, FormEvent } from "react";
import { auth } from "@/lib/firebase";
import { compressImage } from "@/lib/client-image";

type BrandRow = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

export default function BrandsSettings() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  // Per-brand status + in-flight flag for the logo upload in each row.
  const [logoStatus, setLogoStatus] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);

  const getAuthHeader = async () => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    return "Bearer " + token;
  };

  const loadBrands = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/brands");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setBrands(data.brands || []);
      } else {
        setError("Failed to load brands");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      setError("Brand name must be 1-60 characters");
      return;
    }

    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setName("");
        setSuccess("Brand added.");
        loadBrands();
      } else if (res.status === 400 || res.status === 409 || res.status === 404) {
        setError(data?.error || "Failed to add brand");
      } else {
        setError("Failed to add brand");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to add brand");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (brand: BrandRow) => {
    if (!confirm("Are you sure you want to delete " + brand.name + "?")) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res = await fetch(`/api/admin/brands?id=${encodeURIComponent(brand.id)}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setSuccess("Brand deleted.");
        loadBrands();
      } else if (res.status === 400 || res.status === 409 || res.status === 404) {
        setError(data?.error || "Failed to delete brand");
      } else {
        setError("Failed to delete brand");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete brand");
    } finally {
      setSubmitting(false);
    }
  };

  // Compresses the picked file (client-side only — Rule #1: this component
  // never touches Storage or Firestore) and POSTs it to the admin logo route.
  const handleLogoChange = async (brand: BrandRow, file: File) => {
    setLogoStatus((prev) => {
      const next = { ...prev };
      delete next[brand.id];
      return next;
    });
    setUploadingLogoId(brand.id);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      // compressImage rejects anything but JPEG/PNG/WebP and enforces the
      // size cap; the server re-validates by magic bytes with a 2MB cap.
      const compressed = await compressImage(file);

      const formData = new FormData();
      formData.append("file", compressed);

      const res = await fetch(`/api/admin/brands/${encodeURIComponent(brand.id)}/logo`, {
        method: "POST",
        headers: { Authorization: authHeader },
        body: formData,
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setBrands((prev) =>
          prev.map((b) => (b.id === brand.id ? { ...b, logoUrl: data.logoUrl } : b))
        );
        setLogoStatus((prev) => ({
          ...prev,
          [brand.id]: { type: "success", message: "Logo uploaded." },
        }));
      } else {
        setLogoStatus((prev) => ({
          ...prev,
          [brand.id]: {
            type: "error",
            message:
              data?.error ||
              (res.status === 401 || res.status === 403
                ? "Not authorized"
                : "Failed to upload logo"),
          },
        }));
      }
    } catch (err: any) {
      setLogoStatus((prev) => ({
        ...prev,
        [brand.id]: { type: "error", message: err?.message || "Failed to upload logo" },
      }));
    } finally {
      setUploadingLogoId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      <div className="max-w-2xl w-full">
        <form onSubmit={handleSubmit} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold uppercase tracking-wider border-b border-neutral-800 pb-2 mb-4">
            Add Brand
          </h2>

          {error && <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-200 text-xs">{error}</div>}
          {success && <div className="p-3 bg-[#171717] border border-[#262626] rounded-lg text-white text-xs">{success}</div>}

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
              className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-black font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Add Brand"}
            </button>
          </div>
        </form>
      </div>

      <div className="w-full space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Brands</h2>
          <button onClick={loadBrands} className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg">Refresh</button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-neutral-900 rounded-xl animate-pulse"></div>
          </div>
        ) : brands.length === 0 ? (
          <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-500 text-xs">No brands yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
                  <th className="px-3 py-3 font-bold align-middle">Name</th>
                  <th className="px-3 py-3 font-bold align-middle">Logo</th>
                  <th className="px-3 py-3 font-bold align-middle">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b) => (
                  <tr key={b.id} className="border-b border-neutral-800 hover:bg-neutral-900/50 transition-colors text-sm">
                    <td className="px-3 py-3 align-middle font-bold text-white">{b.name}</td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        {b.logoUrl ? (
                          <img
                            src={b.logoUrl}
                            alt={b.name + " logo"}
                            className="h-8 w-8 shrink-0 object-contain bg-white border border-neutral-800 rounded-lg"
                          />
                        ) : (
                          <span className="h-8 w-8 shrink-0 flex items-center justify-center bg-neutral-900 border border-neutral-800 rounded-lg text-[10px] text-neutral-600">
                            —
                          </span>
                        )}
                        <div className="flex flex-col gap-1 min-w-0">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={uploadingLogoId !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) handleLogoChange(b, file);
                            }}
                            className="block max-w-[200px] text-[11px] text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border file:border-neutral-800 file:bg-neutral-900 file:text-white file:text-[10px] file:font-bold file:uppercase file:tracking-wider disabled:opacity-50"
                          />
                          {uploadingLogoId === b.id ? (
                            <span className="text-[10px] text-neutral-400">Uploading...</span>
                          ) : (
                            logoStatus[b.id] && (
                              <span
                                className={
                                  logoStatus[b.id].type === "success"
                                    ? "p-1.5 bg-[#171717] border border-[#262626] rounded-lg text-white text-[10px]"
                                    : "p-1.5 bg-red-950/50 border border-red-900 rounded-lg text-red-200 text-[10px]"
                                }
                              >
                                {logoStatus[b.id].message}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex flex-nowrap gap-1.5 justify-end">
                        <button
                          disabled={submitting}
                          onClick={() => handleDelete(b)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-red-950 text-red-300 rounded-lg whitespace-nowrap disabled:opacity-30"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
