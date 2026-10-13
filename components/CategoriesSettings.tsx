"use client";

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from "react";
import { auth } from "@/lib/firebase";
import { CATEGORY_NAME_MAX, CATEGORY_TAGLINE_MAX } from "@/lib/categories";
import { compressImage } from "@/lib/client-image";

// Only the field we need from a product. Counts are exact and case-sensitive,
// matching how the server and the homepage treat a category name.
type ProductLike = { category?: string | null };

type CategoryRow = {
  id: string;
  name: string;
  builtIn: boolean;
  blurb?: string;
  imageUrl: string | null;
  tagline: string;
  showOnHomepage: boolean;
  disabled?: boolean;
};

type CategoriesSettingsProps = {
  products?: ProductLike[];
};

export default function CategoriesSettings({ products = [] }: CategoriesSettingsProps) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");

  // Inline editor state. Only one row is open at a time (editingId).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");
  const [showOnHomepage, setShowOnHomepage] = useState(true);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  // Mirrors previewUrl so the unmount cleanup can revoke the object URL
  // without depending on the latest state value.
  const previewUrlRef = useRef<string | null>(null);

  const getAuthHeader = async () => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    return "Bearer " + token;
  };

  // Replaces the tracked object URL, revoking the previous one if it differs.
  const setPreview = (url: string | null) => {
    if (previewUrlRef.current && previewUrlRef.current !== url) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = url;
    setPreviewUrl(url);
  };

  const revokePreview = () => setPreview(null);

  const loadCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/categories");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setCategories(data.categories || []);
      } else {
        setError("Failed to load categories");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revoke any live object URL when the component goes away.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const productCount = (categoryName: string) =>
    products.filter((p) => p.category === categoryName).length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > CATEGORY_NAME_MAX) {
      setError(`Category name must be 1-${CATEGORY_NAME_MAX} characters`);
      return;
    }

    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setName("");
        setSuccess("Category added.");
        loadCategories();
      } else if (res.status === 400 || res.status === 409) {
        setError(data?.error || "Failed to add category");
      } else {
        setError("Failed to add category");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to add category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: CategoryRow) => {
    if (!confirm("Are you sure you want to delete " + category.name + "?")) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(category.id)}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setSuccess("Category deleted.");
        loadCategories();
      } else if (res.status === 409) {
        setError(data?.error || "Category is used by one or more products");
      } else if (res.status === 400 || res.status === 404) {
        setError(data?.error || "Failed to delete category");
      } else {
        setError("Failed to delete category");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDisabled = async (category: CategoryRow) => {
    const currentlyDisabled = !!category.disabled;
    const count = productCount(category.name);

    if (!currentlyDisabled && count > 0) {
      const ok = confirm(
        `This category has ${count} products. They stay visible in the shop, but you will not be able to add new products to it and it will disappear from the homepage and shop filters. Disable it?`
      );
      if (!ok) return;
    }

    if (!currentlyDisabled && count === 0) {
      const ok = confirm("Disable this category?");
      if (!ok) return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("id", category.id);
      formData.append("disabled", currentlyDisabled ? "false" : "true");

      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { Authorization: authHeader },
        body: formData,
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setSuccess("Category updated.");
        loadCategories();
      } else {
        setError(data?.error || "Failed to update category");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update category");
    } finally {
      setSubmitting(false);
    }
  };

  // Opens the inline editor for a row, discarding any previous draft.
  const openEditor = (category: CategoryRow) => {
    revokePreview();
    setEditingId(category.id);
    setTagline(category.tagline || "");
    setShowOnHomepage(category.showOnHomepage);
    setPickedFile(null);
    setRemoveImage(false);
    setError("");
    setSuccess("");
  };

  // Closes the editor and drops the local draft (and its object URL).
  const closeEditor = () => {
    revokePreview();
    setEditingId(null);
    setTagline("");
    setShowOnHomepage(true);
    setPickedFile(null);
    setRemoveImage(false);
  };

  const handlePickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    e.target.value = "";
    if (!file) return;

    setError("");
    setSuccess("");
    try {
      // compressImage enforces the 1 MB cap (and the accepted types) and
      // returns a new, already-compressed File.
      const compressed = await compressImage(file);
      setPreview(URL.createObjectURL(compressed));
      setPickedFile(compressed);
      setRemoveImage(false);
    } catch (err: any) {
      setError(err?.message || "Failed to process image");
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setPickedFile(null);
    setRemoveImage(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    setSuccess("");

    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      // One multipart PUT. Content-Type is intentionally left to the browser
      // so it can set the boundary.
      const formData = new FormData();
      formData.append("id", editingId);
      formData.append("tagline", tagline.trim());
      formData.append("showOnHomepage", showOnHomepage ? "true" : "false");
      if (pickedFile) {
        formData.append("file", pickedFile);
      } else if (removeImage) {
        formData.append("removeImage", "true");
      }

      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { Authorization: authHeader },
        body: formData,
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setSuccess("Category updated.");
        closeEditor();
        loadCategories();
      } else {
        setError(data?.error || "Failed to update category");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update category");
    } finally {
      setSubmitting(false);
    }
  };

  const editingCategory = categories.find((c) => c.id === editingId) || null;

  // The image the preview and the row currently stand for: a freshly picked
  // file wins, then the saved image, unless the user asked to remove it.
  const previewImage = pickedFile && previewUrl
    ? previewUrl
    : removeImage
      ? null
      : editingCategory?.imageUrl ?? null;

  // Same blurb fallback the homepage uses when a category has no tagline.
  const previewBlurb =
    tagline.trim() ||
    editingCategory?.blurb ||
    (editingCategory ? `Shop ${editingCategory.name}` : "");

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      <div className="max-w-2xl w-full">
        <form onSubmit={handleSubmit} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold uppercase tracking-wider border-b border-neutral-800 pb-2 mb-4">
            Add Category
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
              maxLength={CATEGORY_NAME_MAX}
              className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-black font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Add Category"}
            </button>
          </div>
        </form>
      </div>

      <div className="w-full space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Categories</h2>
          <button onClick={loadCategories} className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg">Refresh</button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-neutral-900 rounded-xl animate-pulse"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-500 text-xs">No categories yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
                  <th className="px-3 py-3 font-bold align-middle">Name</th>
                  <th className="px-3 py-3 font-bold align-middle">Details</th>
                  <th className="px-3 py-3 font-bold align-middle">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => {
                  const count = productCount(c.name);
                  const inUse = count > 0;
                  const isEditing = editingId === c.id;

                  return [
                    <tr key={c.id} className="border-b border-neutral-800 hover:bg-neutral-900/50 transition-colors text-sm">
                      <td className={`px-3 py-3 align-middle font-bold ${c.disabled ? "text-neutral-500" : "text-white"}`}>
                        {c.name}
                        {c.builtIn && (
                          <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-400">Built-in</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-neutral-400">
                            {count} product{count === 1 ? "" : "s"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-400">
                            {c.imageUrl ? "Custom image" : "Using default"}
                          </span>
                          {!c.showOnHomepage && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300">
                              Hidden on homepage
                            </span>
                          )}{c.disabled && (<span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300">Disabled</span>)}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-nowrap gap-1.5 justify-end">
                          <button
                            disabled={submitting}
                            onClick={() => openEditor(c)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-neutral-800 text-neutral-200 rounded-lg whitespace-nowrap disabled:opacity-30"
                          >
                            {isEditing ? "Editing" : "Edit"}
                          </button>
                          <button
                            disabled={submitting}
                            onClick={() => handleToggleDisabled(c)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-neutral-800 text-neutral-200 rounded-lg whitespace-nowrap disabled:opacity-30"
                          >
                            {c.disabled ? "Enable" : "Disable"}
                          </button>
                          {!c.builtIn && (
                            <button
                              disabled={submitting || inUse}
                              title={inUse ? "Cannot delete a category that is used by products" : undefined}
                              onClick={() => handleDelete(c)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-red-950 text-red-300 rounded-lg whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>,
                    isEditing && editingCategory && (
                      <tr key={`${c.id}-editor`} className="border-b border-neutral-800 bg-neutral-900/30">
                        <td colSpan={3} className="px-3 py-4">
                          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                                  Image
                                </label>
                                <div className="flex flex-wrap items-center gap-3">
                                  <label className="inline-flex items-center px-3 py-2 text-[11px] font-bold uppercase tracking-wider bg-neutral-900 border border-neutral-800 rounded-lg cursor-pointer text-neutral-300">
                                    Choose image
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      onChange={handlePickImage}
                                      className="hidden"
                                    />
                                  </label>
                                  {pickedFile && (
                                    <span className="text-[11px] text-neutral-500 truncate max-w-[180px]">{pickedFile.name}</span>
                                  )}
                                  {previewImage && (
                                    <button
                                      type="button"
                                      onClick={handleRemoveImage}
                                      disabled={submitting}
                                      className="px-2.5 py-1 text-[11px] font-bold bg-red-950 text-red-300 rounded-lg whitespace-nowrap disabled:opacity-30"
                                    >
                                      Remove image
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-neutral-500 mt-1">
                                  JPEG, PNG or WebP. Compressed to at most 1 MB.
                                </p>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                                  Tagline
                                </label>
                                <input
                                  type="text"
                                  value={tagline}
                                  onChange={(e) => setTagline(e.target.value)}
                                  maxLength={CATEGORY_TAGLINE_MAX}
                                  className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                                />
                                <div className="text-[10px] text-neutral-500 mt-1">
                                  {tagline.length}/{CATEGORY_TAGLINE_MAX}
                                </div>
                              </div>

                              <label className="flex items-center gap-2 text-xs text-neutral-300">
                                <input
                                  type="checkbox"
                                  checked={showOnHomepage}
                                  onChange={(e) => setShowOnHomepage(e.target.checked)}
                                  className="accent-white"
                                />
                                Show on homepage
                              </label>

                              <div className="flex gap-2 pt-1">
                                <button
                                  type="submit"
                                  disabled={submitting}
                                  className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-white text-black rounded-lg disabled:opacity-50"
                                >
                                  {submitting ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={closeEditor}
                                  disabled={submitting}
                                  className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>

                            {/* Live preview: mirrors the homepage card markup. */}
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                                Homepage preview
                              </label>
                              <div className="max-w-sm rounded-2xl overflow-hidden border border-neutral-800">
                                <div className="relative w-full h-52 flex items-center justify-center">
                                  {previewImage ? (
                                    <img
                                      src={previewImage}
                                      alt={editingCategory.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black flex items-center justify-center">
                                      <span className="text-lg font-bold uppercase tracking-wider text-neutral-200">
                                        {editingCategory.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-4 border-t border-neutral-800 bg-neutral-950">
                                  <h3 className="text-sm font-semibold text-white">
                                    {editingCategory.name}
                                  </h3>
                                  <p className="text-xs text-neutral-400 mt-1">{previewBlurb}</p>
                                </div>
                              </div>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


