import "server-only";
import sharp from "sharp";
import type { Staff } from "../auth/staff-auth";
import { callRpc, type Configuration } from "../inquiries/persistence";
import { PHOTO_ASPECTS } from "@/lib/data/gallery";
import { ContentError } from "./document";

/** Largest uploaded file. Vercel rejects request bodies over 4.5 MB; next.config.ts allows 4 MB with the form fields. */
export const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
/** Matches the database limit on stored photos (2 MiB) once base64-encoded in JSON. */
const MAX_STORED_BYTES = 2 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 3 * 1024 * 1024;
const MAX_PIXELS = 50_000_000;
const ASPECT_RATIOS: Record<(typeof PHOTO_ASPECTS)[number], number> = {
  "aspect-3/2": 3 / 2, "aspect-4/3": 4 / 3, "aspect-square": 1, "aspect-4/5": 4 / 5, "aspect-3/4": 3 / 4,
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isMediaId = (value: string) => UUID.test(value);

export type ProcessedPhoto = { data: Buffer; width: number; height: number; aspect: string };

/** Decodes an upload as a real JPEG, PNG or WebP, applies its rotation, shrinks it to 2000 px and
 * re-encodes it as WebP. Re-encoding drops all metadata (location, camera) and anything hidden in the file.
 */
export async function processPhoto(bytes: Uint8Array): Promise<ProcessedPhoto> {
  if (bytes.byteLength === 0) throw new ContentError("Choose a photo to upload.");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new ContentError("That photo is larger than 3.5 MB. Choose a smaller one.");
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: "error" });
    const { format, width = 0, height = 0 } = await image.metadata();
    if (format !== "jpeg" && format !== "png" && format !== "webp") throw new ContentError("Photos must be JPEG, PNG or WebP files.");
    if (Math.min(width, height) < 400) throw new ContentError("That photo is too small. Use one at least 400 pixels on its shorter side.");
    const { data, info } = await image.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    if (data.byteLength > MAX_STORED_BYTES) throw new ContentError("That photo is too detailed to store. Choose a smaller one.");
    const ratio = info.width / info.height;
    if (ratio < 0.6 || ratio > 1.8) throw new ContentError("That photo is too narrow or too wide for the gallery. Crop it closer to a normal photo shape.");
    const aspect = PHOTO_ASPECTS.reduce((best, key) =>
      Math.abs(ASPECT_RATIOS[key] - ratio) < Math.abs(ASPECT_RATIOS[best] - ratio) ? key : best);
    return { data, width: info.width, height: info.height, aspect };
  } catch (error) {
    if (error instanceof ContentError) throw error;
    throw new ContentError("That file could not be read as a photo. Use a JPEG, PNG or WebP file.");
  }
}

/** The new asset's ID; "full" when the 500-photo cap is reached; undefined when storage is unavailable. */
export async function addMedia(configuration: Configuration, staff: Staff, photo: ProcessedPhoto,
  provenance: { date: string; url?: string }): Promise<string | "full" | undefined> {
  const result = await callRpc(configuration, "staff_add_media", {
    p_staff: staff.userId, p_email: staff.email, p_data: photo.data.toString("base64"), p_width: photo.width,
    p_height: photo.height, p_source_date: provenance.date, p_source_url: provenance.url ?? null,
  }, 1024);
  if (!result || typeof result !== "object" || !("kind" in result)) return undefined;
  if (result.kind === "full") return "full";
  return result.kind === "added" && "id" in result && typeof result.id === "string" && UUID.test(result.id) ? result.id : undefined;
}

/** A stored photo: published ones only (no staff), or any photo (staff). Null when not available to the caller;
 * undefined when storage is unavailable.
 */
export async function readMedia(configuration: Configuration, id: string, staff?: Staff): Promise<{ type: string; data: Buffer } | null | undefined> {
  const result = staff
    ? await callRpc(configuration, "staff_media", { p_staff: staff.userId, p_id: id }, MAX_RESPONSE_BYTES)
    : await callRpc(configuration, "published_media", { p_id: id }, MAX_RESPONSE_BYTES);
  if (result === null) return null;
  if (result && typeof result === "object" && "data" in result && typeof result.data === "string" && "type" in result && result.type === "image/webp") {
    return { type: "image/webp", data: Buffer.from(result.data, "base64") };
  }
  return undefined;
}
