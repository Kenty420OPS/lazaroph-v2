"use client";

// Browser-only image helper for the admin product form.
// Compresses a picked photo down to a size the server will accept, without
// pulling in any dependency. Never import this from server code: it relies on
// DOM APIs (Image, canvas, File, URL).

import { MAX_PRODUCT_IMAGE_BYTES } from "@/lib/product";

// Only these types may be uploaded. No SVG, no GIF (they either can't be
// rasterized safely or would bloat storage).
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Long-side cap for the first compression pass.
const MAX_LONG_SIDE = 1600;
// Never shrink the long side below this; if it still doesn't fit, we give up.
const MIN_LONG_SIDE = 800;
// Each shrink pass reduces the long side by 15%.
const SHRINK_FACTOR = 0.85;
// Quality ladder tried at each long-side size.
const QUALITIES = [0.8, 0.7, 0.6, 0.5];

// Loads a File into an <img> via an object URL. The URL is always revoked.
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file could not be read as an image"));
    };
    img.src = url;
  });
}

// Wraps canvas.toBlob in a promise. Resolves null when the browser can't
// encode the requested type (so the caller can fall back to JPEG).
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

// True when the browser can actually encode WebP from a canvas.
function supportsWebp(): boolean {
  try {
    return document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

// Renders the image onto a canvas with its long side at most `targetLongSide`
// (never upscales), then encodes it at the given type/quality.
async function renderAndEncode(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  targetLongSide: number,
  type: string,
  quality: number
): Promise<Blob> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image compression is not supported in this browser");

  const naturalLongSide = Math.max(img.naturalWidth, img.naturalHeight);
  const effectiveLongSide = Math.min(naturalLongSide, targetLongSide);
  const scale = naturalLongSide > 0 ? effectiveLongSide / naturalLongSide : 1;

  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToBlob(canvas, type, quality);
  if (!blob) throw new Error("Image compression is not supported in this browser");
  return blob;
}

// Builds the output File, keeping the original base name and swapping the
// extension to match what the browser actually produced.
function toCompressedFile(blob: Blob, originalName: string, ext: string): File {
  const base = originalName.replace(/\.[^./\\]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, {
    type: blob.type || (ext === "webp" ? "image/webp" : "image/jpeg"),
    lastModified: Date.now(),
  });
}

// Compresses a single product photo. Returns a new File named .webp (or .jpg
// when WebP encoding is unavailable) that is at or below
// MAX_PRODUCT_IMAGE_BYTES, or throws a readable Error.
export async function compressImage(file: File): Promise<File> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed");
  }

  const webp = supportsWebp();
  const outputType = webp ? "image/webp" : "image/jpeg";
  const ext = webp ? "webp" : "jpg";

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");

  let longSide = MAX_LONG_SIDE;
  while (true) {
    for (const quality of QUALITIES) {
      const blob = await renderAndEncode(img, canvas, longSide, outputType, quality);
      if (blob.size <= MAX_PRODUCT_IMAGE_BYTES) {
        return toCompressedFile(blob, file.name, ext);
      }
    }

    // Exhausted the quality ladder at this size; if we're already at the
    // smallest allowed long side there is nothing left to try.
    if (longSide <= MIN_LONG_SIDE) {
      throw new Error("This image is too large even after compression");
    }
    longSide = Math.max(Math.round(longSide * SHRINK_FACTOR), MIN_LONG_SIDE);
  }
}
