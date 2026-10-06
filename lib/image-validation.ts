export type ImageValidationResult =
  | { ok: true; buffer: Buffer; contentType: string; ext: string }
  | { ok: false; error: string };

// Validates an uploaded image file using magic bytes ONLY.
// contentType and ext are derived from the file bytes, never from
// the client-provided file name or file.type.
// JPEG (FF D8 FF), PNG (89 50 4E 47), WEBP (RIFF....WEBP) only.
// No SVG, no GIF.
export async function validateImageUpload(
  file: File,
  maxBytes: number
): Promise<ImageValidationResult> {
  if (file.size > maxBytes) {
    return { ok: false, error: `Image must be under ${Math.floor(maxBytes / (1024 * 1024))}MB` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > 4 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ok: true, buffer, contentType: "image/jpeg", ext: "jpg" };
  }
  if (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return { ok: true, buffer, contentType: "image/png", ext: "png" };
  }
  if (
    buffer.length > 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ok: true, buffer, contentType: "image/webp", ext: "webp" };
  }

  return { ok: false, error: "Image must be a valid image (JPEG, PNG, WEBP)" };
}
