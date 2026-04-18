"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import AppShell from "@/components/AppShell";
import {
  Photo,
  uploadPhotos,
  getPhotos,
  getPhotoImageUrl,
  rotatePhoto,
  deletePhoto,
} from "@/lib/api";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

interface UploadStatus {
  name: string;
  error?: string;
}

export default function UploadPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
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
    setUploadStatuses(files.map((f) => ({ name: f.name })));
    setError(null);
    try {
      const result = await uploadPhotos(tripId, files);
      setPhotos((prev) => [...prev, ...result.uploaded]);
      if (result.failed.length > 0) {
        setUploadStatuses(result.failed.map((f) => ({ name: f.filename, error: f.error })));
      } else {
        setUploadStatuses([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploadStatuses([]);
    } finally {
      setUploading(false);
    }
  }, [tripId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    onDropRejected: () => {
      setError("Only photos are allowed (JPEG, PNG, WebP, HEIC).");
    },
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

  const handleGenerate = () => {
    router.push(`/trips/${tripId}/generating`);
  };

  const failedUploads = uploadStatuses.filter((s) => s.error);

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
        {uploading ? (
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>Uploading…</p>
        ) : isDragActive ? (
          <p style={{ color: "var(--blue)", fontSize: 15, fontWeight: 500 }}>Drop to upload</p>
        ) : (
          <>
            <p style={{ color: "var(--ink)", fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Drag photos here, or click to select
            </p>
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
              JPEG, PNG, WebP, HEIC — up to 20 MB each
            </p>
          </>
        )}
      </div>

      {failedUploads.length > 0 && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2", borderRadius: 10, fontSize: 13, color: "#b91c1c" }}>
          {failedUploads.map((f, i) => (
            <div key={i}>{f.name}: {f.error}</div>
          ))}
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 16px" }}>
            <p style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-soft)", fontWeight: 500 }}>
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 32 }}>
            {photos.map((photo) => {
              const busy = busyIds.has(photo.id);
              return (
                <div key={photo.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "var(--wash)", aspectRatio: "1" }} className="photo-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPhotoImageUrl(tripId, photo.id)}
                    alt={photo.originalFilename}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: `rotate(${photo.rotation}deg)`,
                      display: "block",
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
                      onClick={() => handleRotate(photo)}
                      disabled={busy}
                      title="Rotate 90°"
                      style={{ background: "rgba(255,255,255,0.92)", color: "var(--ink)", border: "none", borderRadius: 6, padding: "6px 8px", fontSize: 16, lineHeight: 1, cursor: "pointer" }}
                    >
                      ↻
                    </button>
                    <button
                      onClick={() => handleDelete(photo)}
                      disabled={busy}
                      title="Delete"
                      style={{ background: "rgba(185,28,28,0.9)", color: "white", border: "none", borderRadius: 6, padding: "6px 8px", fontSize: 14, lineHeight: 1, cursor: "pointer" }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 16 }}>{error}</p>
      )}

      {photos.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleGenerate}
            disabled={photos.length < 1}
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
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AppShell>
  );
}
