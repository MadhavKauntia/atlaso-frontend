"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import AppShell from "@/components/AppShell";
import {
  Photo,
  getPhotos,
  getPhotoImageUrl,
  rotatePhoto,
  deletePhoto,
  initiateUploads,
  uploadToS3,
  confirmUploads,
  ConfirmUploadRequest,
} from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);
const MAX_CONCURRENT_UPLOADS = 5;

interface PendingCard {
  tempId: string;
  previewUrl: string;
  name: string;
  progress: number;
  error: string | null;
}

export default function UploadPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const initialFetch = useRef(false);

  useEffect(() => {
    if (initialFetch.current) return;
    initialFetch.current = true;
    getPhotos(tripId).then(setPhotos).catch(() => {});
  }, [tripId]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    const invalid = files.filter((f) => !ALLOWED_TYPES.has(f.type));
    if (invalid.length > 0) {
      setError(`Only photos are allowed (JPEG, PNG, WebP, HEIC). Cannot upload: ${invalid.map((f) => f.name).join(", ")}`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const heic2any = (await import("heic2any")).default;
      const exifr = await import("exifr");

      type PreparedFile = { file: File; width: number; height: number; takenAt: number | null };
      const prepared: PreparedFile[] = await Promise.all(files.map(async (f) => {
        let file = f;
        if (HEIC_TYPES.has(f.type)) {
          const converted = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.9 });
          file = new File([converted as Blob], f.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
        }
        const [dims, exif] = await Promise.all([
          new Promise<{ width: number; height: number }>((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
            img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
            img.src = url;
          }),
          exifr.parse(file, ["DateTimeOriginal"]).catch(() => null),
        ]);
        const takenAt = exif?.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal.getTime() : null;
        return { file, width: dims.width, height: dims.height, takenAt };
      }));

      // Get upload URLs
      const initiated = await initiateUploads(tripId, prepared.map((p) => ({
        filename: p.file.name,
        contentType: p.file.type,
        fileSize: p.file.size,
      })));

      // Create pending cards with local previews — show in grid immediately
      const cards: PendingCard[] = prepared.map((p, i) => ({
        tempId: initiated[i].photoId,
        previewUrl: URL.createObjectURL(p.file),
        name: p.file.name,
        progress: 0,
        error: null,
      }));
      setPendingCards((prev) => [...prev, ...cards]);

      // Upload each file; confirm and graduate to real photo card as soon as it finishes
      const queue = prepared.map((p, i) => ({ p, init: initiated[i], card: cards[i] }));

      const processItem = async ({ p, init, card }: typeof queue[0]) => {
        try {
          await uploadToS3(init.uploadUrl, p.file, (pct) => {
            setPendingCards((prev) => prev.map((c) => c.tempId === card.tempId ? { ...c, progress: pct } : c));
          });

          const [photo] = await confirmUploads(tripId, [{
            photoId: init.photoId,
            storageKey: init.storageKey,
            originalFilename: p.file.name,
            contentType: p.file.type,
            fileSize: p.file.size,
            width: p.width,
            height: p.height,
            takenAt: p.takenAt,
          } as ConfirmUploadRequest]);

          URL.revokeObjectURL(card.previewUrl);
          setPendingCards((prev) => prev.filter((c) => c.tempId !== card.tempId));
          setPhotos((prev) => [...prev, photo]);
        } catch (e) {
          setPendingCards((prev) => prev.map((c) =>
            c.tempId === card.tempId ? { ...c, error: e instanceof Error ? e.message : "Upload failed", progress: 0 } : c
          ));
        }
      };

      for (let i = 0; i < queue.length; i += MAX_CONCURRENT_UPLOADS) {
        await Promise.all(queue.slice(i, i + MAX_CONCURRENT_UPLOADS).map(processItem));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [tripId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    onDropRejected: () => setError("Only photos are allowed (JPEG, PNG, WebP, HEIC)."),
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/heic": [".heic"],
      "image/heif": [".heif"],
    },
    disabled: uploading,
    multiple: true,
  });

  if (!ready) return null;

  const markBusy = (id: string) => setBusyIds((prev) => new Set(prev).add(id));
  const clearBusy = (id: string) => setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });

  const handleRotate = async (photo: Photo) => {
    markBusy(photo.id);
    try {
      const updated = await rotatePhoto(tripId, photo.id);
      setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotate failed");
    } finally {
      clearBusy(photo.id);
    }
  };

  const handleDelete = async (photo: Photo) => {
    markBusy(photo.id);
    try {
      await deletePhoto(tripId, photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch {
      clearBusy(photo.id);
    }
  };

  const dismissPending = (tempId: string) => {
    setPendingCards((prev) => {
      const card = prev.find((c) => c.tempId === tempId);
      if (card) URL.revokeObjectURL(card.previewUrl);
      return prev.filter((c) => c.tempId !== tempId);
    });
  };

  const totalCount = photos.length + pendingCards.filter((c) => !c.error).length;

  return (
    <AppShell maxWidth="960px">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "var(--font-fraunces), serif",
          fontSize: 32,
          fontWeight: 300,
          color: "var(--ink)",
          letterSpacing: "-0.02em",
          marginBottom: 6,
        }}>
          Upload your photos
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
          Add all the photos from your trip. You can rotate or remove any before generating.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "var(--blue)" : "rgba(10,26,58,0.2)"}`,
          borderRadius: 14,
          padding: "36px 24px",
          textAlign: "center",
          background: isDragActive ? "rgba(30,82,212,0.04)" : "var(--white)",
          cursor: uploading ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          marginBottom: 12,
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
        {isDragActive ? (
          <p style={{ color: "var(--blue)", fontSize: 15, fontWeight: 500 }}>Drop to upload</p>
        ) : (
          <>
            <p style={{ color: "var(--ink)", fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Drag photos here, or click to select
            </p>
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
              JPEG, PNG, WebP, HEIC
            </p>
          </>
        )}
      </div>

      {error && (
        <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 16 }}>{error}</p>
      )}

      {/* Photo grid */}
      {(photos.length > 0 || pendingCards.length > 0) && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 16px" }}>
            <p style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-soft)", fontWeight: 500 }}>
              {totalCount} photo{totalCount !== 1 ? "s" : ""}
              {uploading && pendingCards.filter((c) => !c.error).length > 0 && (
                <span style={{ marginLeft: 8, color: "var(--blue)" }}>
                  · uploading {pendingCards.filter((c) => !c.error).length}…
                </span>
              )}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 32 }}>
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} tripId={tripId} busy={busyIds.has(photo.id)} onRotate={handleRotate} onDelete={handleDelete} />
            ))}
            {pendingCards.map((card) => (
              <PendingPhotoCard key={card.tempId} card={card} onDismiss={dismissPending} />
            ))}
          </div>
        </>
      )}

      {photos.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => router.push(`/trips/${tripId}/generating`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 32px",
              background: "var(--ink)",
              color: "var(--white)",
              border: "none",
              borderRadius: 100,
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 2px 0 var(--blue-deep), 0 8px 24px rgba(10,26,58,0.15)",
            }}
          >
            Generate my photobook →
          </button>
        </div>
      )}

      <style>{`
        .photo-card:hover .photo-overlay {
          opacity: 1 !important;
          background: rgba(0,0,0,0.35) !important;
        }
        @keyframes shimmer {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .shimmer { animation: shimmer 1.4s ease-in-out infinite; }
      `}</style>
    </AppShell>
  );
}

function CircularProgress({ progress }: { progress: number }) {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress / 100);
  return (
    <svg width="56" height="56" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.15s ease" }}
      />
    </svg>
  );
}

function PendingPhotoCard({ card, onDismiss }: { card: PendingCard; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.previewUrl}
        alt={card.name}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />

      {card.error ? (
        /* Error overlay */
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(185,28,28,0.82)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 8, gap: 6,
        }}>
          <span style={{ color: "white", fontSize: 20, lineHeight: 1 }}>✕</span>
          <span style={{ color: "white", fontSize: 10, textAlign: "center", lineHeight: 1.3, wordBreak: "break-word" }}>
            Upload failed
          </span>
          <button
            onClick={() => onDismiss(card.tempId)}
            style={{
              marginTop: 2,
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 4,
              color: "white",
              fontSize: 10,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      ) : (
        /* Progress overlay */
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.35)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          <CircularProgress progress={card.progress} />
          <span style={{ color: "white", fontSize: 11, fontWeight: 500 }}>{card.progress}%</span>
        </div>
      )}
    </div>
  );
}

function PhotoCard({ photo, tripId, busy, onRotate, onDelete }: {
  photo: Photo;
  tripId: string;
  busy: boolean;
  onRotate: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "var(--wash)", aspectRatio: "1" }} className="photo-card">
      {!loaded && <div style={{ position: "absolute", inset: 0, background: "var(--wash)" }} className="shimmer" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getPhotoImageUrl(tripId, photo.id)}
        alt={photo.originalFilename}
        onLoad={() => setLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `rotate(${photo.rotation}deg)`,
          display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />
      <div style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 6,
        paddingBottom: 8,
        opacity: 0,
        transition: "all 0.2s",
      }} className="photo-overlay">
        <button
          onClick={() => onRotate(photo)}
          disabled={busy}
          title="Rotate 90°"
          style={{ background: "rgba(255,255,255,0.92)", color: "var(--ink)", border: "none", borderRadius: 6, padding: "6px 8px", fontSize: 16, lineHeight: 1, cursor: "pointer" }}
        >
          ↻
        </button>
        <button
          onClick={() => onDelete(photo)}
          disabled={busy}
          title="Delete"
          style={{ background: "rgba(185,28,28,0.9)", color: "white", border: "none", borderRadius: 6, padding: "6px 8px", fontSize: 14, lineHeight: 1, cursor: "pointer" }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}
