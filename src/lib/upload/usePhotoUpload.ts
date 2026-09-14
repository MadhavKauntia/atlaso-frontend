"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPhotos,
  deletePhoto as apiDeletePhoto,
  initiateUploads,
  uploadToS3,
  uploadBlobToS3,
  confirmUploads,
  type Photo,
  type ConfirmUploadRequest,
} from "@/lib/api";
import {
  isAllowedImage,
  isHeic,
  UPLOAD_CONCURRENCY,
  MAX_EDGE,
  JPEG_QUALITY,
  MAX_PHOTOS,
  MAX_FILE_BYTES,
  runPool,
  prepareForUpload,
  convertHeic,
  type PendingCard,
} from "@/lib/upload/pipeline";

export interface UsePhotoUploadOptions {
  tripId: string;
  /** Pool size for the convert→upload pipeline. Lower on mobile (weaker CPU). */
  concurrency?: number;
  /** Fires after every upload batch settles — used to (re)run location inference. */
  onBatchSettled?: () => void;
}

/**
 * Owns the full photo-upload lifecycle for a trip: initial photo fetch, file
 * validation + per-book cap, HEIC conversion, downscaling, S3 upload, and
 * confirm. Shared by the desktop and mobile upload screens so both behave
 * identically. Presentation (inference banner, tab badge, notifications) stays
 * in the pages.
 */
export function usePhotoUpload({ tripId, concurrency = UPLOAD_CONCURRENCY, onBatchSettled }: UsePhotoUploadOptions) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Total files across all in-flight upload batches (reset once everything
  // settles) — drives the overall progress bar.
  const [batchTotal, setBatchTotal] = useState(0);

  // Collected EXIF signals across the session, for location/date inference.
  const coordsRef = useRef<{ lat: number; lon: number }[]>([]);
  const datesRef = useRef<number[]>([]);
  const initialFetch = useRef(false);
  // Number of concurrent upload batches in flight, so adding more photos
  // mid-upload doesn't clobber the `uploading` flag.
  const activeBatches = useRef(0);
  // photoId -> local thumbnail object URL, so confirmed tiles render instantly
  // from memory instead of re-fetching the full image from S3.
  const thumbUrls = useRef<Map<string, string>>(new Map());
  // Current accepted count (confirmed + in-flight), read synchronously in the
  // drop handler to enforce the per-book cap without a stale closure.
  const acceptedCount = useRef(0);

  useEffect(() => {
    if (initialFetch.current) return;
    initialFetch.current = true;
    getPhotos(tripId).then(setPhotos).catch(() => {});
  }, [tripId]);

  const handleFiles = useCallback(async (dropped: File[]) => {
    if (!dropped.length) return;

    // Filter out anything we can't accept, keeping the rest, and summarise what
    // was skipped rather than rejecting the whole drop.
    let files = dropped.filter(isAllowedImage);
    const wrongType = dropped.length - files.length;

    const beforeSize = files.length;
    files = files.filter((f) => f.size <= MAX_FILE_BYTES);
    const tooLarge = beforeSize - files.length;

    const remaining = Math.max(0, MAX_PHOTOS - acceptedCount.current);
    const overflow = Math.max(0, files.length - remaining);
    if (overflow > 0) files = files.slice(0, remaining);

    const skipped: string[] = [];
    if (wrongType) skipped.push(`${wrongType} skipped (only JPG, PNG, WebP or HEIC).`);
    if (tooLarge) skipped.push(`${tooLarge} skipped (each photo must be under 50 MB).`);
    if (overflow) skipped.push(`${overflow} skipped (a book can hold up to ${MAX_PHOTOS} photos).`);
    setError(skipped.length ? skipped.join(" ") : null);

    if (!files.length) return;
    // Reserve the slots immediately so back-to-back drops respect the cap.
    acceptedCount.current += files.length;

    activeBatches.current += 1;
    setUploading(true);
    setBatchTotal((n) => n + files.length);

    const tempIds = files.map((_, i) => `pending-${Date.now()}-${i}`);
    const initialCards: PendingCard[] = files.map((f, i) => ({
      tempId: tempIds[i],
      previewUrl: isHeic(f) ? "" : URL.createObjectURL(f),
      name: f.name,
      progress: 0,
      error: null,
      converting: isHeic(f),
    }));
    setPendingCards((prev) => [...prev, ...initialCards]);

    try {
      const exifr = await import("exifr");

      // Each file runs its own convert(HEIC) → downscale → initiate → upload →
      // confirm pipeline independently, capped by the concurrency pool.
      const processFile = async (f: File, i: number) => {
        let currentTempId = tempIds[i];
        try {
          let file = f;

          if (isHeic(f)) {
            file = await convertHeic(f);
          }

          // Downscale to a print-appropriate size before upload — the biggest
          // lever on upload time. Also gives us the final dimensions and a tiny
          // display thumbnail from the same decode (one pass).
          const prepared = await prepareForUpload(file, MAX_EDGE, JPEG_QUALITY);
          file = prepared.file;
          const dims = { width: prepared.width, height: prepared.height };
          const thumbUrl = prepared.thumbUrl;
          const thumbBlob = prepared.thumbBlob;

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
          if (gps?.latitude != null && gps?.longitude != null) coordsRef.current.push({ lat: gps.latitude, lon: gps.longitude });
          if (takenAt) datesRef.current.push(takenAt);

          const [init] = await initiateUploads(tripId, [{
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
            thumbnailFileSize: thumbBlob?.size ?? null,
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

          // Upload the display thumbnail alongside. Non-fatal: if it fails, the
          // photo still confirms and consumers fall back to the full image.
          let thumbnailStorageKey: string | null = null;
          if (thumbBlob && init.thumbnailUploadUrl && init.thumbnailStorageKey) {
            try {
              await uploadBlobToS3(init.thumbnailUploadUrl, thumbBlob);
              thumbnailStorageKey = init.thumbnailStorageKey;
            } catch { /* skip — full image is the fallback */ }
          }

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
            sharpness: prepared.sharpness ?? null,
            thumbnailStorageKey,
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

      await runPool(files, concurrency, (f, i) => processFile(f, i));
      onBatchSettled?.();
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
  }, [tripId, concurrency, onBatchSettled]);

  const deletePhoto = useCallback((id: string) => {
    apiDeletePhoto(tripId, id).catch(() => {});
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    const t = thumbUrls.current.get(id);
    if (t) { URL.revokeObjectURL(t); thumbUrls.current.delete(id); }
  }, [tripId]);

  const dismissPending = useCallback((id: string) => {
    setPendingCards((prev) => {
      const c = prev.find((x) => x.tempId === id);
      if (c?.previewUrl) URL.revokeObjectURL(c.previewUrl);
      return prev.filter((x) => x.tempId !== id);
    });
  }, []);

  // Keep the accepted-count ref authoritative for the drop handler's cap check.
  useEffect(() => {
    acceptedCount.current = photos.length + pendingCards.filter((c) => !c.error).length;
  }, [photos, pendingCards]);

  // Free all in-memory thumbnail URLs when leaving the page.
  useEffect(() => {
    const urls = thumbUrls.current;
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear(); };
  }, []);

  // Overall upload progress across the in-flight batch. Confirmed files leave
  // pendingCards, so completed = batchTotal - pendingCards.length, plus the
  // partial progress of the files still uploading.
  const activeCards = pendingCards.filter((c) => !c.error);
  const uploadDone = Math.max(0, batchTotal - pendingCards.length);
  const uploadPartial = activeCards.reduce((s, c) => s + (c.converting ? 0 : c.progress) / 100, 0);
  const uploadPct = batchTotal > 0 ? Math.min(100, Math.round(((uploadDone + uploadPartial) / batchTotal) * 100)) : 0;
  const totalCount = photos.length + activeCards.length;

  return {
    photos,
    setPhotos,
    pendingCards,
    uploading,
    error,
    batchTotal,
    uploadPct,
    totalCount,
    handleFiles,
    deletePhoto,
    dismissPending,
    thumbUrls,
    coordsRef,
    datesRef,
  };
}
