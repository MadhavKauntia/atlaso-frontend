"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import FlowTopbar from "@/components/layout/FlowTopbar";
import FlowBottomBar from "@/components/layout/FlowBottomBar";
import { draftStore } from "@/lib/draftStore";
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

const GRAIN = "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E";
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

interface DraftPhoto {
  id: string; // previewUrl used as stable identity
  previewUrl: string;
  name: string;
}

interface InferredLocation {
  place: string;
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
      { headers: { "User-Agent": "Atlaso/1.0 (hello@atlaso.com)" } }
    );
    const data = await res.json();
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state;
    const country = data.address?.country;
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
    return place ? { place, coordStr, startDate, endDate } : null;
  } catch {
    return null;
  }
}

export default function UploadPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [draftPhotos, setDraftPhotos] = useState<DraftPhoto[]>([]);
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferred, setInferred] = useState<InferredLocation | null>(null);

  const [isDraftMode, setIsDraftMode] = useState(false);
  const allCoords = useRef<{ lat: number; lon: number }[]>([]);
  const allDates = useRef<number[]>([]);
  const initialFetch = useRef(false);

  useEffect(() => {
    if (initialFetch.current) return;
    initialFetch.current = true;

    const draft = sessionStorage.getItem("atlaso_draft_id") === tripId;
    setIsDraftMode(draft);

    if (draft) {
      // Restore any files already in draftStore (user navigated back)
      const existing = draftStore.getAll();
      if (existing.length > 0) {
        setDraftPhotos(existing.map((d) => ({ id: d.previewUrl, previewUrl: d.previewUrl, name: d.file.name })));
      }
    } else {
      getPhotos(tripId).then(setPhotos).catch(() => {});
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
    // Check sessionStorage directly — avoids any ref/state timing issues
    const isDraft = sessionStorage.getItem("atlaso_draft_id") === tripId;
    setUploading(true);
    setError(null);

    try {
      const heic2any = (await import("heic2any")).default;
      const exifr = await import("exifr");

      type Prepared = { file: File; width: number; height: number; takenAt: number | null; lat?: number; lon?: number };
      const prepared: Prepared[] = await Promise.all(files.map(async (f) => {
        let file = f;
        if (HEIC_TYPES.has(f.type)) {
          const converted = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.9 });
          file = new File([converted as Blob], f.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
        }
        const [dims, exif, gps] = await Promise.all([
          new Promise<{ width: number; height: number }>((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
            img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
            img.src = url;
          }),
          exifr.parse(file, ["DateTimeOriginal"]).catch(() => null),
          exifr.gps(file).catch(() => null),
        ]);
        const takenAt = exif?.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal.getTime() : null;
        return { file, width: dims.width, height: dims.height, takenAt, lat: gps?.latitude, lon: gps?.longitude };
      }));

      // Collect EXIF data for inference
      for (const p of prepared) {
        if (p.lat != null && p.lon != null) allCoords.current.push({ lat: p.lat, lon: p.lon });
        if (p.takenAt) allDates.current.push(p.takenAt);
      }

      if (isDraft) {
        // Draft mode: store in memory, no API calls
        draftStore.add(prepared.map((p) => ({
          file: p.file,
          width: p.width,
          height: p.height,
          takenAt: p.takenAt ?? null,
        })));
        const all = draftStore.getAll();
        setDraftPhotos(all.map((d) => ({ id: d.previewUrl, previewUrl: d.previewUrl, name: d.file.name })));
        runInference();
      } else {
        // Real mode: show pending cards, upload to S3, confirm with backend
        const tempIds = files.map((_, i) => `pending-${Date.now()}-${i}`);
        const initialCards: PendingCard[] = files.map((f, i) => ({
          tempId: tempIds[i],
          previewUrl: HEIC_TYPES.has(f.type) ? "" : URL.createObjectURL(f),
          name: f.name,
          progress: 0,
          error: null,
        }));
        setPendingCards((prev) => [...prev, ...initialCards]);

        const initiated = await initiateUploads(tripId, prepared.map((p) => ({
          filename: p.file.name,
          contentType: p.file.type,
          fileSize: p.file.size,
        })));

        const cards: PendingCard[] = prepared.map((p, i) => ({
          tempId: initiated[i].photoId,
          previewUrl: URL.createObjectURL(p.file),
          name: p.file.name,
          progress: 0,
          error: null,
        }));
        initialCards.forEach((c) => { if (c.previewUrl) URL.revokeObjectURL(c.previewUrl); });
        setPendingCards((prev) => [
          ...prev.filter((c) => !tempIds.includes(c.tempId)),
          ...cards,
        ]);

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
          } catch {
            setPendingCards((prev) => prev.map((c) =>
              c.tempId === card.tempId ? { ...c, error: "Upload failed", progress: 0 } : c
            ));
          }
        };

        for (let i = 0; i < queue.length; i += MAX_CONCURRENT_UPLOADS) {
          await Promise.all(queue.slice(i, i + MAX_CONCURRENT_UPLOADS).map(processItem));
        }

        runInference();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      if (!isDraft) {
        setPendingCards((prev) => prev.map((c) => c.error ? c : { ...c, error: "Upload failed" }));
      }
    } finally {
      setUploading(false);
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
    disabled: uploading,
    multiple: true,
  });

  const confirmedCount = isDraftMode ? draftPhotos.length : photos.length;
  const totalCount = confirmedCount + pendingCards.filter((c) => !c.error).length;
  const canContinue = confirmedCount >= 10 && !uploading;

  const handleContinue = () => {
    if (inferred) {
      sessionStorage.setItem("atlaso_inferred", JSON.stringify(inferred));
    }
    router.push(`/trips/${tripId}/cover`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingBottom: 120, fontFamily: "var(--font-inter-tight, 'Inter Tight'), sans-serif" }}>
      {/* Grain overlay */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, opacity: 0.15, mixBlendMode: "multiply", backgroundImage: `url("${GRAIN}")` }} />

      <FlowTopbar
        currentStep={1}
        rightSlot={
          <span style={{ fontFamily: "var(--font-fraunces), serif", fontStyle: "italic", opacity: 0.7 }}>
            Your work is saved — no sign-in needed yet
          </span>
        }
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 500, color: "var(--blue)", marginBottom: 14 }}>
            Step 1 of 4
          </div>
          <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 54, fontWeight: 300, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 14, color: "var(--ink)" }}>
            Drop in your <span style={{ fontStyle: "italic", color: "var(--blue)" }}>photos</span>.
          </h1>
          <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 540, lineHeight: 1.5 }}>
            Upload the shots from your trip. We'll curate, sequence, and lay them out. Aim for 30–100 photos for the best book.
          </p>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          style={{
            background: "#ffffff",
            border: `2px dashed ${isDragActive ? "var(--blue)" : "var(--sky)"}`,
            borderRadius: 16,
            padding: "72px 32px",
            textAlign: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            transition: "background 0.2s, border-color 0.2s",
            ...(isDragActive && { background: "rgba(111,163,232,0.08)", borderColor: "var(--blue)" }),
          }}
        >
          <input {...getInputProps()} />
          <div style={{
            width: 56, height: 56, margin: "0 auto 20px",
            background: "var(--wash)", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--blue)", fontSize: 24,
          }}>↑</div>
          <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 28, fontWeight: 400, marginBottom: 8, color: "var(--ink)" }}>
            {isDragActive ? "Drop to upload" : "Drop photos here"}
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 24 }}>
            or browse your device · JPG, PNG, HEIC up to 25 MB each
          </div>
          <span style={{
            display: "inline-block", padding: "12px 24px",
            background: "var(--ink)", color: "#ffffff",
            borderRadius: 100, fontWeight: 500, fontSize: 14,
            pointerEvents: "none",
          }}>
            Browse files
          </span>
          <div style={{ marginTop: 20, fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", fontFamily: "var(--font-fraunces), serif" }}>
            We'll read the date and location from each photo to help build your story
          </div>
        </div>

        {error && (
          <p style={{ color: "#b91c1c", fontSize: 14, marginTop: 12 }}>{error}</p>
        )}

        {/* Status + grid */}
        {totalCount > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "40px 0 16px" }}>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>
                <span style={{ color: "var(--blue)", fontWeight: 600 }}>{totalCount}</span> photos uploaded
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                {totalCount < 30
                  ? `${30 - totalCount} more recommended for a richer book`
                  : "Ready when you are"}
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 10,
            }}>
              {isDraftMode ? (
                draftPhotos.map((photo, i) => (
                  <DraftTile key={photo.id} photo={photo} index={i}
                    onDelete={(id) => {
                      draftStore.remove(id);
                      setDraftPhotos(draftStore.getAll().map((d) => ({ id: d.previewUrl, previewUrl: d.previewUrl, name: d.file.name })));
                    }}
                  />
                ))
              ) : (
                photos.map((photo, i) => (
                  <PhotoTile key={photo.id} photo={photo} tripId={tripId} index={i}
                    onDelete={(id) => {
                      deletePhoto(tripId, id).catch(() => {});
                      setPhotos((prev) => prev.filter((p) => p.id !== id));
                    }}
                  />
                ))
              )}
              {pendingCards.map((card) => (
                <PendingTile key={card.tempId} card={card}
                  onDismiss={(id) => {
                    setPendingCards((prev) => {
                      const c = prev.find((x) => x.tempId === id);
                      if (c?.previewUrl) URL.revokeObjectURL(c.previewUrl);
                      return prev.filter((x) => x.tempId !== id);
                    });
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <FlowBottomBar
        leftContent={
          inferred ? (
            <span>
              From what we can tell, your photos were taken around{" "}
              <strong style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--ink)" }}>{inferred.place}</strong>
              {inferred.startDate && (
                <> in{" "}
                  <strong style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--ink)" }}>
                    {inferred.startDate}
                  </strong>
                </>
              )}
            </span>
          ) : confirmedCount >= 10 ? (
            <span>Looking good — ready to design your cover.</span>
          ) : null
        }
        rightButton={
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 26px",
              background: canContinue ? "var(--ink)" : "rgba(10,26,58,0.25)",
              color: "#ffffff", border: "none", borderRadius: 100,
              fontWeight: 500, fontSize: 14, cursor: canContinue ? "pointer" : "not-allowed",
              fontFamily: "inherit", transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => canContinue && ((e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "")}
          >
            Continue
            <span style={{
              width: 24, height: 24, background: "white", color: "var(--ink)",
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
      `}</style>
    </div>
  );
}

function DraftTile({ photo, index, onDelete }: { photo: DraftPhoto; index: number; onDelete: (id: string) => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      style={{
        aspectRatio: "1", borderRadius: 8, overflow: "hidden", position: "relative",
        background: "var(--muted, #e6ecf5)",
        animation: `fadeInScale 0.4s ease-out ${Math.min(index, 7) * 0.05}s backwards`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.previewUrl}
        alt=""
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
      />
      <button
        onClick={() => onDelete(photo.id)}
        style={{
          position: "absolute", top: 6, right: 6,
          width: 22, height: 22, borderRadius: "50%",
          background: "rgba(10,26,58,0.7)", color: "white",
          border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1,
          opacity: 0, transition: "opacity 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        className="remove-btn"
      >×</button>
      <style>{`.remove-btn { opacity: 0 !important; } div:hover > .remove-btn { opacity: 1 !important; }`}</style>
    </div>
  );
}

function PhotoTile({ photo, tripId, index, onDelete }: { photo: Photo; tripId: string; index: number; onDelete: (id: string) => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      style={{
        aspectRatio: "1", borderRadius: 8, overflow: "hidden", position: "relative",
        background: "var(--muted, #e6ecf5)",
        animation: `fadeInScale 0.4s ease-out ${Math.min(index, 7) * 0.05}s backwards`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getPhotoImageUrl(tripId, photo.id)}
        alt=""
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
      />
      <button
        onClick={() => onDelete(photo.id)}
        style={{
          position: "absolute", top: 6, right: 6,
          width: 22, height: 22, borderRadius: "50%",
          background: "rgba(10,26,58,0.7)", color: "white",
          border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1,
          opacity: 0, transition: "opacity 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        className="remove-btn"
      >×</button>
      <style>{`.remove-btn { opacity: 0 !important; } div:hover > .remove-btn { opacity: 1 !important; }`}</style>
    </div>
  );
}

function PendingTile({ card, onDismiss }: { card: PendingCard; onDismiss: (id: string) => void }) {
  return (
    <div style={{
      aspectRatio: "1", borderRadius: 8, overflow: "hidden", position: "relative",
      background: "var(--muted, #e6ecf5)",
    }}>
      {card.previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      )}
      {card.error ? (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(185,28,28,0.8)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <span style={{ color: "white", fontSize: 18 }}>✕</span>
          <button onClick={() => onDismiss(card.tempId)} style={{
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 4, color: "white", fontSize: 10, padding: "3px 8px", cursor: "pointer",
          }}>Dismiss</button>
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)" }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, height: 3,
            width: `${card.progress || 20}%`, background: "var(--blue)", transition: "width 0.1s",
          }} />
        </>
      )}
    </div>
  );
}
