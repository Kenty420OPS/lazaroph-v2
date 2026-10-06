"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import { auth } from "@/lib/firebase";

type PaymentMethodRow = {
  id: string;
  type: "ewallet" | "bank";
  name: string;
  accountName: string;
  accountNumber: string;
  instructions: string | null;
  qrUrl: string | null;
  active: boolean;
  sortOrder: number;
};

  const ACCOUNT_NUMBER_RE = /^[0-9 \-]+$/;

  // Client-side QR prepare step: returns a File ready for upload.
  // <= 1MB files pass through; larger ones are downscaled (max 1024px
  // longest side) and exported as PNG, then JPEG q0.92 if still > 1MB.
  // Does not trust file.type; the server validates via magic bytes.
  const prepareQrFile = async (file: File): Promise<File> => {
    const MAX_BYTES = 1 * 1024 * 1024;
    if (file.size <= MAX_BYTES) return file;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image"));
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load image"));
      el.src = dataUrl;
    });

    const longest = Math.max(img.width, img.height);
    const scale = longest > 1024 ? 1024 / longest : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

    const toBlob = (type: string, quality?: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

    const pngBlob = await toBlob("image/png");
    if (pngBlob && pngBlob.size <= MAX_BYTES) {
      return new File([pngBlob], "qr.png", { type: "image/png" });
    }

    const jpegBlob = await toBlob("image/jpeg", 0.92);
    if (jpegBlob && jpegBlob.size <= MAX_BYTES) {
      return new File([jpegBlob], "qr.jpg", { type: "image/jpeg" });
    }

    throw new Error("Image is too large. Please use a smaller QR image.");
  };

export default function PaymentMethodsSettings() {
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const qrTargetIdRef = useRef<string | null>(null);

  const [type, setType] = useState<"ewallet" | "bank">("ewallet");
  const [name, setName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [instructions, setInstructions] = useState("");
  const [active, setActive] = useState(true);

  const getAuthHeader = async () => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    return "Bearer " + token;
  };

  const loadMethods = async () => {
    setLoading(true);
    setError("");
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) {
        setError("Not authenticated");
        return;
      }
      const res = await fetch("/api/admin/payment-methods", {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (data.success) {
        const sorted = (data.methods || []).slice().sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setMethods(sorted);
      } else {
        setError(data.error || "Failed to load payment methods");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setType("ewallet");
    setName("");
    setAccountName("");
    setAccountNumber("");
    setInstructions("");
    setActive(true);
    setEditingId(null);
  };

  const validateLocal = (): string | null => {
    if (name.trim().length < 1 || name.trim().length > 50) return "Name must be 1-50 characters";
    if (accountName.trim().length < 1 || accountName.trim().length > 80) return "Account name must be 1-80 characters";
    const an = accountNumber.trim();
    if (an.length < 4 || an.length > 40 || !ACCOUNT_NUMBER_RE.test(an)) {
      return "Account number must be 4-40 chars (digits, spaces, dashes only)";
    }
    if (instructions.trim().length > 300) return "Instructions must be at most 300 characters";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const localError = validateLocal();
    if (localError) {
      setError(localError);
      return;
    }

    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const trimmed = {
        type,
        name: name.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        instructions: instructions.trim().length > 0 ? instructions.trim() : null,
        active,
      };

      let res: Response;
      if (editingId) {
        const existing = methods.find((m) => m.id === editingId);
        const changed: Record<string, unknown> = {};
        (Object.keys(trimmed) as Array<keyof typeof trimmed>).forEach((k) => {
          if (!existing || (existing as any)[k] !== trimmed[k]) changed[k] = trimmed[k];
        });
        if (Object.keys(changed).length === 0) {
          setError("No changes to save");
          setSubmitting(false);
          return;
        }
        res = await fetch("/api/admin/payment-methods", {
          method: "PATCH",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...changed }),
        });
      } else {
        const highest = methods.reduce((max, m) => Math.max(max, m.sortOrder ?? 0), 0);
        res = await fetch("/api/admin/payment-methods", {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ ...trimmed, sortOrder: highest + 1 }),
        });
      }

      const data = await res.json();
      if (data.success) {
        setSuccess(editingId ? "Payment method updated." : "Payment method created.");
        resetForm();
        loadMethods();
      } else {
        setError(data.error || (editingId ? "Failed to update payment method" : "Failed to create payment method"));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (m: PaymentMethodRow) => {
    setEditingId(m.id);
    setType(m.type);
    setName(m.name);
    setAccountName(m.accountName);
    setAccountNumber(m.accountNumber);
    setInstructions(m.instructions || "");
    setActive(m.active);
    setError("");
    setSuccess("");
  };

  const patchMethod = async (id: string, payload: Record<string, unknown>, confirmMsg: string, extraWarning?: string) => {
    const fullMsg = extraWarning ? `${confirmMsg}\n\n${extraWarning}` : confirmMsg;
    if (!confirm(fullMsg)) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/payment-methods", {
        method: "PATCH",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Payment method updated.");
        loadMethods();
      } else {
        setError(data.error || "Failed to update payment method");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerQrUpload = (m: PaymentMethodRow) => {
    qrTargetIdRef.current = m.id;
    if (qrInputRef.current) {
      qrInputRef.current.value = "";
      qrInputRef.current.click();
    }
  };

  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = qrTargetIdRef.current;
    e.target.value = "";
    if (!file || !id) return;

    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      let prepared: File;
      try {
        prepared = await prepareQrFile(file);
      } catch (prepErr: any) {
        setError(prepErr.message || "Image is too large. Please use a smaller QR image.");
        return;
      }

      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("id", id);
      formData.append("file", prepared);

      const res = await fetch("/api/admin/payment-methods/qr", {
        method: "POST",
        headers: { Authorization: authHeader },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("QR image updated.");
        loadMethods();
      } else {
        setError(data.error || "Failed to upload QR image");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload QR image");
    } finally {
      setSubmitting(false);
      qrTargetIdRef.current = null;
    }
  };

  const removeQr = async (m: PaymentMethodRow) => {
    if (!confirm(`Remove the QR image for ${m.name}?`)) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/payment-methods/qr", {
        method: "DELETE",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("QR image removed.");
        loadMethods();
      } else {
        setError(data.error || "Failed to remove QR image");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to remove QR image");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = (m: PaymentMethodRow) => {
    const willDeactivate = m.active;
    const activeCount = methods.filter((x) => x.active).length;
    const extraWarning = willDeactivate && activeCount <= 1
      ? "Customers will not be able to place orders until at least one payment method is active."
      : undefined;
    patchMethod(m.id, { active: !m.active }, `${willDeactivate ? "Deactivate" : "Activate"} ${m.name}?`, extraWarning);
  };

  const move = async (index: number, direction: -1 | 1) => {
    const neighborIndex = index + direction;
    if (neighborIndex < 0 || neighborIndex >= methods.length) return;
    const a = methods[index];
    const b = methods[neighborIndex];
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res1 = await fetch("/api/admin/payment-methods", {
        method: "PATCH",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, sortOrder: b.sortOrder }),
      });
      const data1 = await res1.json();
      if (!data1.success) {
        setError(data1.error || "Failed to reorder");
        loadMethods();
        return;
      }

      const res2 = await fetch("/api/admin/payment-methods", {
        method: "PATCH",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, sortOrder: a.sortOrder }),
      });
      const data2 = await res2.json();
      if (!data2.success) {
        setError(data2.error || "Failed to reorder");
        loadMethods();
        return;
      }

      setSuccess("Order updated.");
      loadMethods();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      <input
        ref={qrInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleQrFileChange}
      />
      <div className="max-w-2xl w-full order-2">
        <form onSubmit={handleSubmit} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold uppercase tracking-wider border-b border-neutral-800 pb-2 mb-4">
            {editingId ? "Edit Payment Method" : "Add Payment Method"}
          </h2>

          {error && <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-200 text-xs">{error}</div>}
          {success && <div className="p-3 bg-[#171717] border border-[#262626] rounded-lg text-white text-xs">{success}</div>}

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value as "ewallet" | "bank")} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white">
                <option value="ewallet">E-wallet</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Account Name *</label>
              <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} required maxLength={80} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Account Number *</label>
              <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required maxLength={40} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
              <p className="text-[9px] text-neutral-500 mt-1">Digits, spaces, and dashes only.</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Instructions (optional)</label>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={300} rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div className="flex items-center gap-2">
              <input id="pm-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <label htmlFor="pm-active" className="text-xs text-neutral-300">Active (visible to customers)</label>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button type="submit" disabled={submitting} className="flex-1 bg-white text-black font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider disabled:opacity-50">
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Method"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="px-4 bg-neutral-900 text-xs font-bold text-white rounded-lg">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="w-full order-1 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Payment Methods</h2>
          <button onClick={loadMethods} className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg">Refresh</button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-neutral-900 rounded-xl animate-pulse"></div>
          </div>
        ) : methods.length === 0 ? (
          <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-500 text-xs">No payment methods found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
                  <th className="px-3 py-3 font-bold align-middle">Name</th>
                  <th className="px-3 py-3 font-bold align-middle">Type</th>
                  <th className="px-3 py-3 font-bold align-middle">Account Name</th>
                  <th className="px-3 py-3 font-bold align-middle">Account Number</th>
                  <th className="px-3 py-3 font-bold align-middle">QR</th>
                  <th className="px-3 py-3 font-bold align-middle">Status</th>
                  <th className="px-3 py-3 font-bold align-middle">Order</th>
                  <th className="px-3 py-3 font-bold align-middle">Actions</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m, i) => (
                  <tr key={m.id} className="border-b border-neutral-800 hover:bg-neutral-900/50 transition-colors text-sm">
                    <td className="px-3 py-3 align-middle font-bold text-white">{m.name}</td>
                    <td className="px-3 py-3 align-middle">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${m.type === "ewallet" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "bg-purple-500/10 text-purple-500 border border-purple-500/20"}`}>
                        {m.type === "ewallet" ? "E-wallet" : "Bank"}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-neutral-400 whitespace-nowrap">{m.accountName}</td>
                    <td className="px-3 py-3 align-middle text-neutral-400 whitespace-nowrap">{m.accountNumber}</td>
                    <td className="px-3 py-3 align-middle">
                      {m.qrUrl ? (
                        <a href={m.qrUrl} target="_blank" rel="noopener noreferrer" className="block w-14 h-14 shrink-0 border border-neutral-800 rounded bg-black overflow-hidden flex items-center justify-center">
                          <img
                            src={m.qrUrl}
                            alt="QR code"
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              const parent = e.currentTarget.parentElement;
                              if (parent) parent.innerHTML = '<span class="text-xs text-neutral-500">QR not loading</span>';
                            }}
                          />
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-500">No QR</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${m.active ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                        {m.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-neutral-400">{m.sortOrder}</td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex flex-nowrap gap-1.5 justify-end">
                        <button onClick={() => startEdit(m)} className="px-2.5 py-1 text-[11px] font-bold bg-neutral-900 text-white rounded-lg whitespace-nowrap">Edit</button>
                        <button disabled={submitting} onClick={() => toggleActive(m)} className="px-2.5 py-1 text-[11px] font-bold bg-red-950 text-red-300 rounded-lg whitespace-nowrap disabled:opacity-30">
                          {m.active ? "Deactivate" : "Activate"}
                        </button>
                        <button disabled={submitting || i === 0} onClick={() => move(i, -1)} className="px-2.5 py-1 text-[11px] font-bold bg-neutral-900 text-white rounded-lg whitespace-nowrap disabled:opacity-30">Up</button>
                        <button disabled={submitting || i === methods.length - 1} onClick={() => move(i, 1)} className="px-2.5 py-1 text-[11px] font-bold bg-neutral-900 text-white rounded-lg whitespace-nowrap disabled:opacity-30">Down</button>
                        <button disabled={submitting} onClick={() => triggerQrUpload(m)} className="px-2.5 py-1 text-[11px] font-bold bg-neutral-900 text-white rounded-lg whitespace-nowrap disabled:opacity-30">
                          {m.qrUrl ? "Replace QR" : "Upload QR"}
                        </button>
                        {m.qrUrl && (
                          <button disabled={submitting} onClick={() => removeQr(m)} className="px-2.5 py-1 text-[11px] font-bold bg-red-950 text-red-300 rounded-lg whitespace-nowrap disabled:opacity-30">
                            Remove QR
                          </button>
                        )}
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
