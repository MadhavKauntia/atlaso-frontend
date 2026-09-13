"use client";

import { use, useCallback, useEffect, useRef, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import FlowTopbar from "@/components/layout/FlowTopbar";
import FlowBottomBar from "@/components/layout/FlowBottomBar";
import {
  getPhotos,
  getPhotoImageUrl,
  deletePhoto,
  initiateUploads,
  uploadToS3,
  confirmUploads,
  type Photo,
  type ConfirmUploadRequest,
} from "@/lib/api";
import { convertHeicBlob } from "@/lib/heic/heicPool";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

// How many files to run through the convert→upload pipeline at once. Firing all
// of them concurrently (e.g. 1000) floods the CPU (EXIF + decode) and network,
// freezing the UI. A small pool keeps things responsive and roughly matches the
// browser's per-host connection cap and the HEIC worker pool size.
const UPLOAD_CONCURRENCY = 6;

/** Run an async worker over items with a fixed concurrency limit. */
async function runPool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

// Longest-edge cap for uploaded images. A 6.9×9.8" book at ~260dpi needs at
// most ~2560px on the long edge for a full-page photo, and most sit smaller —
// so this keeps print quality while cutting upload bytes (often by half or more
// versus full-res camera files).
const MAX_EDGE = 2560;
const JPEG_QUALITY = 0.82;

// A small display thumbnail generated from the same decode, kept in memory for
// this session so grid tiles render instantly without re-fetching the full
// image from S3. ~360px covers a retina ~180px tile; ~20-30KB each.
const THUMB_EDGE = 360;
const THUMB_QUALITY = 0.72;

async function encodeJpeg(bitmap: ImageBitmap, w: number, h: number, quality: number): Promise<Blob> {
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
 * Downscale an image to MAX_EDGE (re-encoding to JPEG) before upload, and
 * return its final dimensions. Images already within the cap pass through
 * untouched (no needless re-encode). Also serves as the single decode we need
 * for dimensions, so there's no separate decode step.
 */
async function prepareForUpload(file: File, maxEdge: number, quality: number): Promise<{ file: File; width: number; height: number; thumbUrl?: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { file, width: 0, height: 0 }; // undecodable — upload as-is
  }
  const { width, height } = bitmap;
  const longest = Math.max(width, height) || 1;

  // Tiny display thumbnail from the same decode (near-free) for instant tiles.
  let thumbUrl: string | undefined;
  try {
    const ts = Math.min(THUMB_EDGE, longest) / longest;
    const thumbBlob = await encodeJpeg(bitmap, Math.max(1, Math.round(width * ts)), Math.max(1, Math.round(height * ts)), THUMB_QUALITY);
    thumbUrl = URL.createObjectURL(thumbBlob);
  } catch { /* no thumb — tile falls back to the S3 image */ }

  if (longest <= maxEdge) {
    bitmap.close();
    return { file, width, height, thumbUrl };
  }
  const scale = maxEdge / longest;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  try {
    const blob = await encodeJpeg(bitmap, w, h, quality);
    bitmap.close();
    const name = file.name.replace(/\.(png|webp|jpeg|jpg)$/i, ".jpg");
    return { file: new File([blob], name, { type: "image/jpeg" }), width: w, height: h, thumbUrl };
  } catch {
    bitmap.close();
    return { file, width, height, thumbUrl };
  }
}

interface PendingCard {
  tempId: string;
  previewUrl: string;
  name: string;
  progress: number;
  error: string | null;
  converting?: boolean;
}

interface InferredLocation {
  place: string;
  country: string;
  coordStr: string;
  startDate: string | null;
  endDate: string | null;
}

async function inferLocationFromPhotos(
  coords: { lat: number; lon: number }[],
  dates: number[]
): Promise<InferredLocation | null> {
  if (!coords.length) return null;
  const sortedLat = [...coords.map((c) => c.lat)].sort((a, b) => a - b);
  const sortedLon = [...coords.map((c) => c.lon)].sort((a, b) => a - b);
  const lat = sortedLat[Math.floor(sortedLat.length / 2)];
  const lon = sortedLon[Math.floor(sortedLon.length / 2)];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { "User-Agent": "Atlaso/1.0 (support@myatlaso.com)" } }
    );
    const data = await res.json();
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state;
    const country = data.address?.country || "";
    const place = [city, country].filter(Boolean).join(", ");
    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";
    const coordStr = `${Math.abs(lat).toFixed(2)}° ${latDir} / ${Math.abs(lon).toFixed(2)}° ${lonDir}`;
    let startDate: string | null = null;
    let endDate: string | null = null;
    if (dates.length) {
      const sorted = [...dates].sort((a, b) => a - b);
      const fmt = (ts: number) => new Date(ts).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      startDate = fmt(sorted[0]);
      endDate = fmt(sorted[sorted.length - 1]);
    }
    return (place || country) ? { place: place || country, country, coordStr, startDate, endDate } : null;
  } catch {
    return null;
  }
}

export default function UploadPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferred, setInferred] = useState<InferredLocation | null>(null);
  // Total files across all in-flight upload batches (reset once everything
  // settles) — drives the overall progress bar.
  const [batchTotal, setBatchTotal] = useState(0);

  const allCoords = useRef<{ lat: number; lon: number }[]>([]);
  const allDates = useRef<number[]>([]);
  const initialFetch = useRef(false);
  // Number of concurrent upload batches in flight, so adding more photos
  // mid-upload doesn't clobber the `uploading` flag.
  const activeBatches = useRef(0);
  // photoId -> local thumbnail object URL, so confirmed tiles render instantly
  // from memory instead of re-fetching the full image from S3.
  const thumbUrls = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (initialFetch.current) return;
    initialFetch.current = true;
    getPhotos(tripId).then(setPhotos).catch(() => {});
    // Keyed per-trip so one trip's inferred location never leaks into another.
    const raw = sessionStorage.getItem(`atlaso_inferred_${tripId}`);
    if (raw) {
      try { setInferred(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, [tripId]);

  const runInference = useCallback(async () => {
    const result = await inferLocationFromPhotos(allCoords.current, allDates.current);
    if (result) setInferred(result);
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const invalid = files.filter((f) => !ALLOWED_TYPES.has(f.type));
    if (invalid.length) {
      setError(`Only photos are allowed (JPEG, PNG, WebP, HEIC).`);
      return;
    }
    activeBatches.current += 1;
    setUploading(true);
    setBatchTotal((n) => n + files.length);
    setError(null);

    const tempIds = files.map((_, i) => `pending-${Date.now()}-${i}`);
    const initialCards: PendingCard[] = files.map((f, i) => ({
      tempId: tempIds[i],
      previewUrl: HEIC_TYPES.has(f.type) ? "" : URL.createObjectURL(f),
      name: f.name,
      progress: 0,
      error: null,
      converting: HEIC_TYPES.has(f.type),
    }));
    setPendingCards((prev) => [...prev, ...initialCards]);

    try {
      const exifr = await import("exifr");

      async function convertHeic(f: File): Promise<File> {
        const jpegName = f.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
        // Preferred: off-main-thread worker pool (native decode → heic-to fallback),
        // downscaled so uploads stay small and the UI stays responsive.
        try {
          const blob = await convertHeicBlob(f, { maxEdge: MAX_EDGE, quality: JPEG_QUALITY });
          return new File([blob], jpegName, { type: "image/jpeg" });
        } catch {
          // Fallback for environments without workers: convert on the main thread.
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

      // Each file runs its own convert(HEIC) → downscale → initiate → upload →
      // confirm pipeline independently, capped by the concurrency pool.
      const processFile = async (f: File, i: number) => {
        let currentTempId = tempIds[i];
        try {
          let file = f;

          if (HEIC_TYPES.has(f.type)) {
            file = await convertHeic(f);
          }

          // Downscale to a print-appropriate size before upload — the biggest
          // lever on upload time. Also gives us the final dimensions and a tiny
          // display thumbnail from the same decode (one pass).
          const prepared = await prepareForUpload(file, MAX_EDGE, JPEG_QUALITY);
          file = prepared.file;
          const dims = { width: prepared.width, height: prepared.height };
          const thumbUrl = prepared.thumbUrl;

          // Show the lightweight thumbnail as soon as it exists (also clears the
          // HEIC "converting" state), replacing any instant placeholder preview.
          if (thumbUrl) {
            setPendingCards((prev) => prev.map((c) => {
              if (c.tempId !== tempIds[i]) return c;
              if (c.previewUrl && c.previewUrl !== thumbUrl) URL.revokeObjectURL(c.previewUrl);
              return { ...c, converting: false, previewUrl: thumbUrl };
            }));
          }

          const [exif, gps] = await Promise.all([
            // Read EXIF from the ORIGINAL file — conversion/downscaling strips it,
            // and exifr can read HEIC metadata directly.
            exifr.parse(f, ["DateTimeOriginal"]).catch(() => null),
            exifr.gps(f).catch(() => null),
          ]);

          const takenAt = exif?.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal.getTime() : null;
          if (gps?.latitude != null && gps?.longitude != null) allCoords.current.push({ lat: gps.latitude, lon: gps.longitude });
          if (takenAt) allDates.current.push(takenAt);

          const [init] = await initiateUploads(tripId, [{
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          }]);

          // Re-key the placeholder card to the real photo id, keeping its thumbnail.
          setPendingCards((prev) => {
            const idx = prev.findIndex((c) => c.tempId === tempIds[i]);
            if (idx < 0) return prev;
            const next = [...prev];
            next[idx] = { ...next[idx], tempId: init.photoId, name: file.name, progress: 0, error: null, converting: false };
            return next;
          });
          currentTempId = init.photoId;
          if (thumbUrl) thumbUrls.current.set(init.photoId, thumbUrl);

          await uploadToS3(init.uploadUrl, file, (pct) => {
            setPendingCards((prev) => prev.map((c) => c.tempId === init.photoId ? { ...c, progress: pct } : c));
          });

          const [photo] = await confirmUploads(tripId, [{
            photoId: init.photoId,
            storageKey: init.storageKey,
            originalFilename: file.name,
            contentType: file.type,
            fileSize: file.size,
            width: dims.width,
            height: dims.height,
            takenAt,
            latitude: gps?.latitude ?? null,
            longitude: gps?.longitude ?? null,
          } as ConfirmUploadRequest]);

          // Keep the thumbnail URL alive — the confirmed tile now renders from it.
          setPendingCards((prev) => prev.filter((c) => c.tempId !== init.photoId));
          setPhotos((prev) => [...prev, photo]);
        } catch {
          setPendingCards((prev) => prev.map((c) =>
            c.tempId === currentTempId ? { ...c, error: "Upload failed", progress: 0, converting: false } : c
          ));
        }
      };

      await runPool(files, UPLOAD_CONCURRENCY, (f, i) => processFile(f, i));
      runInference();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      activeBatches.current -= 1;
      // Only clear the progress bar once every concurrent batch has settled.
      if (activeBatches.current <= 0) {
        activeBatches.current = 0;
        setUploading(false);
        setBatchTotal(0);
      }
    }
  }, [tripId, runInference]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/heic": [".heic"],
      "image/heif": [".heif"],
    },
    multiple: true,
  });

  const totalCount = photos.length + pendingCards.filter((c) => !c.error).length;
  const canContinue = photos.length >= 50 && !uploading;

  // Overall upload progress across the in-flight batch. Confirmed files leave
  // pendingCards, so completed = batchTotal - pendingCards.length, plus the
  // partial progress of the files still uploading.
  const activeCards = pendingCards.filter((c) => !c.error);
  const uploadDone = Math.max(0, batchTotal - pendingCards.length);
  const uploadPartial = activeCards.reduce((s, c) => s + (c.converting ? 0 : c.progress) / 100, 0);
  const uploadPct = batchTotal > 0 ? Math.min(100, Math.round(((uploadDone + uploadPartial) / batchTotal) * 100)) : 0;

  const handleContinue = () => {
    if (inferred && photos.length > 0) {
      sessionStorage.setItem(`atlaso_inferred_${tripId}`, JSON.stringify(inferred));
    } else {
      sessionStorage.removeItem(`atlaso_inferred_${tripId}`);
    }
    router.push(`/trips/${tripId}/cover`);
  };

  // Stable handlers so memoized tiles don't re-render on every progress tick.
  const handleDeletePhoto = useCallback((id: string) => {
    deletePhoto(tripId, id).catch(() => {});
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    const t = thumbUrls.current.get(id);
    if (t) { URL.revokeObjectURL(t); thumbUrls.current.delete(id); }
  }, [tripId]);

  // Free all in-memory thumbnail URLs when leaving the page.
  useEffect(() => {
    const urls = thumbUrls.current;
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear(); };
  }, []);

  const handleDismissPending = useCallback((id: string) => {
    setPendingCards((prev) => {
      const c = prev.find((x) => x.tempId === id);
      if (c?.previewUrl) URL.revokeObjectURL(c.previewUrl);
      return prev.filter((x) => x.tempId !== id);
    });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", color: "var(--sb-cream)", paddingBottom: 120, fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <FlowTopbar
        currentStep={1}
        rightSlot={
          <span style={{ fontFamily: "var(--font-dm-sans), sans-serif", color: "var(--sb-muted)" }}>
            Your work is saved as you go
          </span>
        }
      />

      <div className="flow-page-inner">
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 600, color: "var(--sb-gold)", marginBottom: 14, fontFamily: "var(--font-bricolage), sans-serif" }}>
            Step 1 of 4
          </div>
          <h1 className="flow-hero-h1" style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", marginBottom: 14, color: "var(--sb-cream)" }}>
            add your <span style={{ color: "var(--sb-gold)" }}>trip photos</span>
          </h1>
          <p style={{ fontSize: 17, color: "var(--sb-muted)", maxWidth: 540, lineHeight: 1.5 }}>
            The moment they're in, they're automatically arranged into a photo book. You need at least 50 photos to get started, and more than that allows us to curate the best ones.
          </p>
        </div>

        <div
          {...getRootProps()}
          style={{
            background: "var(--sb-bg-deep)",
            border: `2px dashed ${isDragActive ? "var(--sb-gold)" : "#5a5249"}`,
            borderRadius: 20,
            padding: "72px 32px",
            textAlign: "center",
            cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s",
            ...(isDragActive && { background: "var(--sb-panel)", borderColor: "var(--sb-gold)" }),
          }}
        >
          <input {...getInputProps()} />
          <div style={{
            width: 56, height: 56, margin: "0 auto 20px",
            background: "var(--sb-panel)", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--sb-gold)", fontSize: 24,
          }}>↑</div>
          <div style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--sb-cream)" }}>
            {isDragActive ? "Drop to upload" : "Drop photos here"}
          </div>
          <div style={{ fontSize: 14, color: "var(--sb-muted)", marginBottom: 24 }}>
            or browse your device · JPG, PNG or HEIC up to 25 MB each
          </div>
          <span style={{
            display: "inline-block", padding: "14px 26px",
            background: "var(--sb-gold)", color: "var(--sb-ink)",
            borderRadius: 999, fontWeight: 800, fontSize: 14,
            fontFamily: "var(--font-bricolage), sans-serif",
            pointerEvents: "none",
          }}>
            choose photos
          </span>
          <div style={{ marginTop: 20, fontSize: 12, color: "var(--sb-muted-2)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
            We'll read the date and location from each photo to help build your story
          </div>
        </div>

        {error && (
          <p style={{ color: "var(--sb-red)", fontSize: 14, marginTop: 12 }}>{error}</p>
        )}

        {totalCount > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "40px 0 16px" }}>
              <div style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--sb-cream)" }}>
                <span style={{ color: "var(--sb-gold)", fontWeight: 800 }}>{totalCount}</span> photos uploaded
              </div>
              <div style={{ fontSize: 13, color: "var(--sb-muted)" }}>
                {totalCount < 50
                  ? `${50 - totalCount} more needed to continue`
                  : totalCount < 100
                  ? `${100 - totalCount} more for fuller pages`
                  : "Ready when you are"}
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 10,
            }}>
              {photos.map((photo, i) => (
                <PhotoTile key={photo.id} photo={photo} tripId={tripId} index={i} thumbUrl={thumbUrls.current.get(photo.id)} onDelete={handleDeletePhoto} />
              ))}
              {pendingCards.map((card) => (
                <PendingTile key={card.tempId} card={card} onDismiss={handleDismissPending} />
              ))}
            </div>
          </>
        )}
      </div>

      <FlowBottomBar
        progress={uploading ? uploadPct : null}
        leftContent={
          pendingCards.some((c) => c.converting) ? (
            <span>Converting your iPhone photos to JPEG before uploading. This only takes a moment.</span>
          ) : inferred && photos.length > 0 ? (
            <span>
              From what we can tell, your photos were taken around{" "}
              <strong style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 800, color: "var(--sb-cream)" }}>{inferred.place}</strong>
              {inferred.startDate && (
                <> in{" "}
                  <strong style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 800, color: "var(--sb-cream)" }}>
                    {inferred.startDate}
                  </strong>
                </>
              )}
            </span>
          ) : photos.length >= 50 ? (
            <span>Looking good. Ready to design your cover.</span>
          ) : null
        }
        rightButton={
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 26px",
              background: canContinue ? "var(--sb-red)" : "var(--sb-panel-2)",
              color: canContinue ? "var(--sb-cream)" : "#8a7f6f", border: "none", borderRadius: 999,
              fontWeight: 800, fontSize: 14, cursor: canContinue ? "pointer" : "not-allowed",
              fontFamily: "var(--font-bricolage), sans-serif", transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => canContinue && ((e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "")}
          >
            Continue
            <span style={{
              width: 24, height: 24, background: canContinue ? "var(--sb-cream)" : "#8a7f6f", color: "var(--sb-red)",
              borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 12,
            }}>→</span>
          </button>
        }
      />

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .photo-tile .remove-btn { opacity: 0; transition: opacity 0.15s ease; }
        .photo-tile:hover .remove-btn { opacity: 1; }
      `}</style>
    </div>
  );
}

const PhotoTile = memo(function PhotoTile({ photo, tripId, index, thumbUrl, onDelete }: { photo: Photo; tripId: string; index: number; thumbUrl?: string; onDelete: (id: string) => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="photo-tile"
      style={{
        aspectRatio: "1", borderRadius: 12, overflow: "hidden", position: "relative",
        background: "var(--sb-panel)",
        animation: `fadeInScale 0.4s ease-out ${Math.min(index, 7) * 0.05}s backwards`,
      }}
    >
      {/* A fixed square placeholder loader until the image decodes. */}
      {!loaded && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <div style={{ width: 18, height: 18, border: "2px solid var(--sb-panel-2)", borderTopColor: "var(--sb-gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbUrl ?? photo.imageUrl ?? getPhotoImageUrl(tripId, photo.id)}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
      />
      <button
        onClick={() => onDelete(photo.id)}
        style={{
          position: "absolute", top: 6, right: 6,
          width: 22, height: 22, borderRadius: "50%",
          background: "rgba(28,25,23,0.78)", color: "var(--sb-cream)",
          border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        className="remove-btn"
      >×</button>
    </div>
  );
});

const PendingTile = memo(function PendingTile({ card, onDismiss }: { card: PendingCard; onDismiss: (id: string) => void }) {
  return (
    <div style={{
      aspectRatio: "1", borderRadius: 12, overflow: "hidden", position: "relative",
      background: "var(--sb-panel)",
    }}>
      {card.previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.previewUrl} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      )}
      {card.error ? (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(201,53,44,0.82)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <span style={{ color: "var(--sb-cream)", fontSize: 18 }}>✕</span>
          <button onClick={() => onDismiss(card.tempId)} style={{
            background: "rgba(243,234,216,0.2)", border: "1px solid rgba(243,234,216,0.45)",
            borderRadius: 6, color: "var(--sb-cream)", fontSize: 10, padding: "3px 8px", cursor: "pointer",
          }}>Dismiss</button>
        </div>
      ) : card.converting ? (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
          background: "rgba(28,25,23,0.82)",
        }}>
          <div style={{ width: 20, height: 20, border: "2px solid var(--sb-gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--sb-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Converting</span>
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.55)" }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, height: 3,
            width: `${card.progress || 20}%`, background: "var(--sb-gold)", transition: "width 0.1s",
          }} />
        </>
      )}
    </div>
  );
});
