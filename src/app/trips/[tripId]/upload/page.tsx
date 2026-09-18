"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import FlowTopbar from "@/components/layout/FlowTopbar";
import FlowBottomBar from "@/components/layout/FlowBottomBar";
import { getPhotos } from "@/lib/api";
import { getGuestToken } from "@/lib/guest";
import { MAX_PHOTOS } from "@/lib/upload/pipeline";
import { usePhotoUpload } from "@/lib/upload/usePhotoUpload";
import { PhotoTile, PendingTile } from "@/components/upload/UploadTiles";
import PhoneUploadPanel from "@/components/upload/PhoneUploadPanel";
import { setTabText, flashTabDone, ensureNotifyPermission, notify, canNotify } from "@/lib/notify";

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

  const [inferred, setInferred] = useState<InferredLocation | null>(null);
  const wasUploading = useRef(false);
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | "unsupported">("default");

  // "Upload from your phone" QR panel + live sync of photos arriving from the phone.
  const [phonePanelOpen, setPhonePanelOpen] = useState(false);
  const [phoneUrl, setPhoneUrl] = useState("");
  const [newFromPhone, setNewFromPhone] = useState(0);

  const upload = usePhotoUpload({ tripId, onBatchSettled: () => runInference() });
  const { photos, setPhotos, pendingCards, uploading, error, uploadPct, totalCount, handleFiles, deletePhoto, dismissPending, thumbUrls, coordsRef, datesRef } = upload;

  const runInference = useCallback(async () => {
    const result = await inferLocationFromPhotos(coordsRef.current, datesRef.current);
    if (result) setInferred(result);
  }, [coordsRef, datesRef]);

  useEffect(() => {
    // Keyed per-trip so one trip's inferred location never leaks into another.
    const raw = sessionStorage.getItem(`atlaso_inferred_${tripId}`);
    if (raw) {
      try { setInferred(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, [tripId]);

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

  const canContinue = photos.length >= 50 && !uploading;

  // Badge the tab with upload progress, and nudge the user when it finishes.
  useEffect(() => {
    if (uploading) {
      wasUploading.current = true;
      setTabText(`↑ ${uploadPct}%`);
    } else if (wasUploading.current) {
      wasUploading.current = false;
      setTabText(null);
      flashTabDone("Photos uploaded");
      // OS notification only fires when the tab isn't focused (suppressed otherwise).
      notify("Upload complete", `${photos.length} photo${photos.length === 1 ? "" : "s"} finished uploading.`);
    }
  }, [uploading, uploadPct, photos.length]);

  // Reset any tab badge when leaving the page.
  useEffect(() => () => setTabText(null), []);

  // Reflect current notification permission (client-only, no SSR mismatch).
  useEffect(() => {
    setNotifyPerm(canNotify() ? Notification.permission : "unsupported");
  }, []);

  const openPhonePanel = () => {
    // Hand the guest capability token to the phone via the URL fragment (never sent
    // to the server or logged), so the phone — a different device with empty local
    // storage — can authorize its guest uploads. Without this the backend now
    // rejects the phone's uploads with "Invalid or missing guest token".
    const base = `${window.location.origin}/trips/${tripId}/upload/mobile`;
    const token = getGuestToken(tripId);
    setPhoneUrl(token ? `${base}#t=${encodeURIComponent(token)}` : base);
    setNewFromPhone(0);
    setPhonePanelOpen(true);
  };

  // While the phone panel is open, poll for photos the phone has uploaded and
  // merge any new ones in so tiles appear live. Stops when the panel closes.
  useEffect(() => {
    if (!phonePanelOpen) return;
    const iv = setInterval(async () => {
      try {
        const latest = await getPhotos(tripId);
        setPhotos((prev) => {
          const known = new Set(prev.map((p) => p.id));
          const added = latest.filter((p) => !known.has(p.id));
          if (!added.length) return prev;
          setNewFromPhone((n) => n + added.length);
          return [...prev, ...added];
        });
      } catch { /* transient — try again next tick */ }
    }, 4000);
    return () => clearInterval(iv);
  }, [phonePanelOpen, tripId, setPhotos]);

  const enableNotifications = async () => {
    await ensureNotifyPermission();
    setNotifyPerm(canNotify() ? Notification.permission : "unsupported");
  };

  const handleContinue = () => {
    if (inferred && photos.length > 0) {
      sessionStorage.setItem(`atlaso_inferred_${tripId}`, JSON.stringify(inferred));
    } else {
      sessionStorage.removeItem(`atlaso_inferred_${tripId}`);
    }
    router.push(`/trips/${tripId}/cover`);
  };

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
            The moment they're in, they're automatically arranged into a photo book. You need at least 50 photos to get started, and adding more, up to 1000, lets us curate the best ones.
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
            or browse your device · JPG, PNG or HEIC up to 50 MB each
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

          {/* OR divider + phone hand-off, kept inside the box so it's actually seen. */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 300, margin: "24px auto" }}>
            <div style={{ flex: 1, height: 1, background: "#46403a" }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "var(--sb-muted-2)", fontFamily: "var(--font-dm-sans), sans-serif" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#46403a" }} />
          </div>
          {/* Hand off to the phone so users skip the AirDrop-to-desktop step.
              stopPropagation: the whole box is a dropzone, so without it a tap here
              would also pop the OS file picker. */}
          <button
            onClick={(e) => { e.stopPropagation(); openPhonePanel(); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 22px", background: "var(--sb-panel)", color: "var(--sb-cream)",
              border: "1px solid #5a5249", borderRadius: 999, cursor: "pointer",
              fontSize: 14, fontWeight: 700, fontFamily: "var(--font-dm-sans), sans-serif",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sb-panel-2)"; e.currentTarget.style.borderColor = "var(--sb-gold)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--sb-panel)"; e.currentTarget.style.borderColor = "#5a5249"; }}
          >
            📱 Upload from your phone
          </button>

          <div style={{ marginTop: 24, fontSize: 12, color: "var(--sb-muted-2)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
            We'll read the date and location from each photo to help build your story
          </div>
        </div>

        {/* Opt-in: notify when uploads finish (only fires if this tab isn't focused). */}
        {notifyPerm === "default" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 16 }}>
            <button
              onClick={enableNotifications}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "11px 18px", background: "var(--sb-panel-2)", color: "var(--sb-cream)",
                border: "1px solid #5a5249", borderRadius: 999, cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              🔔 Notify me when uploads finish
            </button>
          </div>
        )}
        {notifyPerm === "granted" && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--sb-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            🔔 You&apos;ll get a notification when your uploads finish (if this tab isn&apos;t focused).
          </div>
        )}
        {notifyPerm === "denied" && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--sb-muted-2)" }}>
            Notifications are blocked for this site. Enable them in your browser to be alerted when uploads finish.
          </div>
        )}

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
                {totalCount >= MAX_PHOTOS
                  ? `${MAX_PHOTOS} photo limit reached`
                  : totalCount < 50
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
                <PhotoTile key={photo.id} photo={photo} tripId={tripId} index={i} thumbUrl={thumbUrls.current.get(photo.id)} onDelete={deletePhoto} />
              ))}
              {pendingCards.map((card) => (
                <PendingTile key={card.tempId} card={card} onDismiss={dismissPending} />
              ))}
            </div>
          </>
        )}
      </div>

      {phonePanelOpen && phoneUrl && (
        <PhoneUploadPanel url={phoneUrl} newFromPhone={newFromPhone} onClose={() => setPhonePanelOpen(false)} />
      )}

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
