"use client";

import { useEffect, useState, FormEvent } from "react";
import { auth } from "@/lib/firebase";

type AdminRow = {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string | null;
};

type Props = {
  currentUid: string;
};

export default function AdminManagement({ currentUid }: Props) {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "superadmin">("admin");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getAuthHeader = async () => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    return "Bearer " + token;
  };

  const loadAdmins = async () => {
    setLoading(true);
    setError("");
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) {
        setError("Not authenticated");
        return;
      }
      const res = await fetch("/api/admin/admins", {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (data.success) {
        setAdmins(data.admins || []);
      } else {
        setError(data.error || "Failed to load admins");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, role, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Admin account created.");
        setEmail("");
        setDisplayName("");
        setRole("admin");
        setPassword("");
        loadAdmins();
      } else {
        setError(data.error || "Failed to create admin");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create admin");
    } finally {
      setSubmitting(false);
    }
  };

  const patchAdmin = async (uid: string, payload: { role?: string; disabled?: boolean }, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    setError("");
    setSuccess("");
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ uid, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Admin updated.");
        loadAdmins();
      } else {
        setError(data.error || "Failed to update admin");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update admin");
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5">
        <form onSubmit={handleAdd} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold uppercase tracking-wider border-b border-neutral-800 pb-2 mb-4">Add Admin</h2>

          {error && <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-200 text-xs">{error}</div>}
          {success && <div className="p-3 bg-[#171717] border border-[#262626] rounded-lg text-white text-xs">{success}</div>}

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Display Name *</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={100} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Role *</label>
              <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "superadmin")} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white">
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Temporary Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
              <p className="text-[9px] text-neutral-500 mt-1">Minimum 8 characters. Not shown again after creation.</p>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={submitting} className="w-full bg-white text-black font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider">
              {submitting ? "Creating..." : "Add Admin"}
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Admin Accounts</h2>
          <button onClick={loadAdmins} className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg">Refresh</button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-neutral-900 rounded-xl animate-pulse"></div>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-500 text-xs">No admin accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
                  <th className="p-4 font-bold">Name</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold">Role</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Created</th>
                  <th className="p-4 font-bold">Last Sign In</th>
                  <th className="p-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => {
                  const isSelf = a.uid === currentUid;
                  return (
                    <tr key={a.uid} className="border-b border-neutral-800 hover:bg-neutral-900/50 transition-colors text-sm">
                      <td className="p-4 font-bold text-white">{a.displayName || "—"}</td>
                      <td className="p-4 text-neutral-400">{a.email || "—"}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${a.role === "superadmin" ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"}`}>
                          {a.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${a.disabled ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"}`}>
                          {a.disabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-400 whitespace-nowrap">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="p-4 text-neutral-400 whitespace-nowrap">{a.lastSignInAt ? new Date(a.lastSignInAt).toLocaleDateString() : "Never"}</td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <button
                            disabled={isSelf}
                            onClick={() => patchAdmin(a.uid, { role: a.role === "superadmin" ? "admin" : "superadmin" }, `Change role of ${a.email || a.uid} to ${a.role === "superadmin" ? "admin" : "superadmin"}?`)}
                            className="px-3 py-1.5 bg-neutral-900 text-xs font-bold text-white rounded-lg disabled:opacity-30"
                          >
                            {a.role === "superadmin" ? "Demote" : "Promote"}
                          </button>
                          <button
                            disabled={isSelf}
                            onClick={() => patchAdmin(a.uid, { disabled: !a.disabled }, `${a.disabled ? "Reactivate" : "Deactivate"} ${a.email || a.uid}?`)}
                            className="px-3 py-1.5 bg-red-950 text-xs font-bold text-red-300 rounded-lg disabled:opacity-30"
                          >
                            {a.disabled ? "Reactivate" : "Deactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
