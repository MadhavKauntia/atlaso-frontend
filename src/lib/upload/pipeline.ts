// Shared photo-upload pipeline: file validation, HEIC conversion, downscaling,
// thumbnail + sharpness generation, and a small concurrency pool. Used by both
// the desktop upload screen and the mobile ("upload from your phone") screen so
// the two stay byte-for-byte identical in how they prepare and size photos.

import { convertHeicBlob } from "@/lib/heic/heicPool";

export const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
export const HEIC_TYPES = new Set(["image/heic", "image/heif"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

/**
 * Whether we accept a picked file. Prefers the MIME type, but falls back to the
 * filename extension: mobile pickers (esp. iOS) sometimes hand back a HEIC with
 * an empty or unrecognised type, which would otherwise be wrongly rejected.
 */
export function isAllowedImage(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(ext);
}

/** Whether a file should go through HEIC→JPEG conversion (by type or extension). */
export function isHeic(file: File): boolean {
  if (HEIC_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "heic" || ext === "heif";
}

// How many files to run through the convert→upload pipeline at once. Firing all
// of them concurrently (e.g. 1000) floods the CPU (EXIF + decode) and network,
// freezing the UI. A small pool keeps things responsive and roughly matches the
// browser's per-host connection cap and the HEIC worker pool size.
export const UPLOAD_CONCURRENCY = 6;

// Longest-edge cap for uploaded images. A 6.9×9.8" book at ~260dpi needs at
// most ~2560px on the long edge for a full-page photo, and most sit smaller —
// so this keeps print quality while cutting upload bytes (often by half or more
// versus full-res camera files).
export const MAX_EDGE = 2560;
export const JPEG_QUALITY = 0.82;

// A small display thumbnail generated from the same decode, kept in memory for
// this session so grid tiles render instantly without re-fetching the full
// image from S3. ~360px covers a retina ~180px tile; ~20-30KB each.
export const THUMB_EDGE = 360;
export const THUMB_QUALITY = 0.72;

// Upload caps (mirrored server-side). Per-file guards against browser OOM on a
// huge decode; per-book guards vision-analysis cost.
export const MAX_PHOTOS = 1000;
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

/** Run an async worker over items with a fixed concurrency limit. */
export async function runPool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

export async function encodeJpeg(bitmap: ImageBitmap, w: number, h: number, quality: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality)
  );
}

/**
 * A cheap sharpness proxy (variance of the Laplacian on a 128px grayscale).
 * Higher = sharper. Used server-side to keep the sharpest frame of a burst
 * before spending a vision-analysis call. Reuses the already-decoded bitmap.
 */
export function computeSharpness(bitmap: ImageBitmap): number | undefined {
  const w = Math.min(128, bitmap.width || 1);
  const h = Math.min(128, bitmap.height || 1);
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (typeof OffscreenCanvas !== "undefined") {
    ctx = new OffscreenCanvas(w, h).getContext("2d");
  } else {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    ctx = c.getContext("2d");
  }
  if (!ctx) return undefined;
  ctx.drawImage(bitmap, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return undefined;
  }
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  let sum = 0;
  let sum2 = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += lap;
      sum2 += lap * lap;
      count++;
    }
  }
  if (count === 0) return undefined;
  const mean = sum / count;
  return sum2 / count - mean * mean;
}

export interface PreparedFile {
  file: File;
  width: number;
  height: number;
  thumbUrl?: string;
  /** The thumbnail JPEG itself, so it can be uploaded to S3 as a display variant. */
  thumbBlob?: Blob;
  sharpness?: number;
}

/**
 * Downscale an image to MAX_EDGE (re-encoding to JPEG) before upload, and
 * return its final dimensions, a display thumbnail, and a sharpness score.
 * Images already within the cap pass through untouched (no needless re-encode).
 * The single decode here serves dimensions + thumbnail + sharpness.
 */
export async function prepareForUpload(file: File, maxEdge: number, quality: number): Promise<PreparedFile> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { file, width: 0, height: 0 }; // undecodable — upload as-is
  }
  const { width, height } = bitmap;
  const longest = Math.max(width, height) || 1;

  const sharpness = computeSharpness(bitmap);

  // Tiny display thumbnail from the same decode (near-free) for instant tiles.
  // We keep the blob too — it gets uploaded to S3 as a persistent display variant.
  let thumbUrl: string | undefined;
  let thumbBlob: Blob | undefined;
  try {
    const ts = Math.min(THUMB_EDGE, longest) / longest;
    thumbBlob = await encodeJpeg(bitmap, Math.max(1, Math.round(width * ts)), Math.max(1, Math.round(height * ts)), THUMB_QUALITY);
    thumbUrl = URL.createObjectURL(thumbBlob);
  } catch { /* no thumb — tile falls back to the S3 image */ }

  if (longest <= maxEdge) {
    // Within the size cap: JPEG/PNG pass through untouched, but re-encode anything
    // else (e.g. a small WebP) to JPEG at native size — the backend only accepts
    // JPEG/PNG, so the pipeline must always emit one of those regardless of size.
    if (file.type === "image/jpeg" || file.type === "image/png") {
      bitmap.close();
      return { file, width, height, thumbUrl, thumbBlob, sharpness };
    }
    try {
      const blob = await encodeJpeg(bitmap, width, height, quality);
      bitmap.close();
      const name = file.name.replace(/\.(png|webp|jpeg|jpg)$/i, ".jpg");
      return { file: new File([blob], name, { type: "image/jpeg" }), width, height, thumbUrl, thumbBlob, sharpness };
    } catch {
      bitmap.close();
      return { file, width, height, thumbUrl, thumbBlob, sharpness };
    }
  }
  const scale = maxEdge / longest;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  try {
    const blob = await encodeJpeg(bitmap, w, h, quality);
    bitmap.close();
    const name = file.name.replace(/\.(png|webp|jpeg|jpg)$/i, ".jpg");
    return { file: new File([blob], name, { type: "image/jpeg" }), width: w, height: h, thumbUrl, thumbBlob, sharpness };
  } catch {
    bitmap.close();
    return { file, width, height, thumbUrl, thumbBlob, sharpness };
  }
}

/**
 * Convert an iPhone HEIC/HEIF file to a downscaled JPEG. Prefers an
 * off-main-thread worker pool (native decode → heic-to fallback); falls back to
 * main-thread decode, then heic2any, for environments without workers.
 */
export async function convertHeic(f: File): Promise<File> {
  const jpegName = f.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
  try {
    const blob = await convertHeicBlob(f, { maxEdge: MAX_EDGE, quality: JPEG_QUALITY });
    return new File([blob], jpegName, { type: "image/jpeg" });
  } catch {
    try {
      const bitmap = await createImageBitmap(f);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
      return new File([blob], jpegName, { type: "image/jpeg" });
    } catch {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.9 });
      return new File([converted as Blob], jpegName, { type: "image/jpeg" });
    }
  }
}

export interface PendingCard {
  tempId: string;
  previewUrl: string;
  name: string;
  progress: number;
  error: string | null;
  converting?: boolean;
}
