"use client";

import { use, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import FlowTopbar from "@/components/layout/FlowTopbar";
import FlowBottomBar from "@/components/layout/FlowBottomBar";
import { getPhotos, googleAuth, claimTrip } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";
import { getGuestToken } from "@/lib/guest";
import { readTripCoverPrefs } from "@/lib/coverPrefs";
import { MAX_PHOTOS } from "@/lib/upload/pipeline";
import { useUploadSession } from "@/components/upload/UploadSession";
import { PhotoTile, PendingTile } from "@/components/upload/UploadTiles";
import PhoneUploadPanel from "@/components/upload/PhoneUploadPanel";
import DriveImport from "@/components/upload/DriveImport";
import { ensureNotifyPermission, canNotify } from "@/lib/notify";
import { isPhoneBrowser } from "@/lib/device";

const noopSubscribe = () => () => {};

export default function UploadPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();

  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | "unsupported">("default");

  // "Upload from your phone" QR panel + live sync of photos arriving from the phone.
  const [phonePanelOpen, setPhonePanelOpen] = useState(false);
  const [phoneUrl, setPhoneUrl] = useState("");
  const [newFromPhone, setNewFromPhone] = useState(0);
  // No phone hand-off when already on a phone. Server snapshot is `false` so the
  // button never flashes on phones; desktop shows it right after hydration.
  const showPhoneHandoff = useSyncExternalStore(noopSubscribe, () => !isPhoneBrowser(), () => false);

  // The upload itself lives in the trip layout (UploadSession), so it keeps going
  // if the user steps back to the cover page mid-upload.
  const { photos, setPhotos, pendingCards, uploading, error, uploadPct, totalCount, handleFiles, deletePhoto, dismissPending, thumbUrls, inferred } = useUploadSession();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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

  const canContinue = photos.length >= 50 && !uploading && !starting;

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

  // Claim the guest trip for the signed-in user, then build the book.
  const startGeneration = async () => {
    setStarting(true);
    setStartError(null);
    try {
      await claimTrip(tripId);
      router.push(`/trips/${tripId}/generating`);
    } catch {
      setStartError("Something went wrong. Please try again.");
      setStarting(false);
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;
    // The cover is chosen on step 1. If this browser has no cover for the trip
    // (resumed on another device, or storage cleared), send them to pick one first.
    if (!readTripCoverPrefs(tripId)) {
      router.push(`/trips/${tripId}/cover`);
      return;
    }
    if (!getToken()) {
      setShowLoginModal(true);
      return;
    }
    startGeneration();
  };

  const handleLoginSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setShowLoginModal(false);
    setStarting(true);
    setStartError(null);
    try {
      const { token } = await googleAuth(response.credential);
      setToken(token);
    } catch {
      setStartError("Sign-in failed. Please try again.");
      setStarting(false);
      return;
    }
    await startGeneration();
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", color: "var(--sb-cream)", paddingBottom: 120, fontFamily: "var(--font-dm-sans), sans-serif" }}>
      {showLoginModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,17,15,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            style={{ background: "var(--sb-panel)", borderRadius: 20, padding: "44px 48px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--sb-cream)", marginBottom: 12, lineHeight: 1.1 }}>
              One last step
            </h2>
            <p style={{ fontSize: 14, color: "var(--sb-muted)", marginBottom: 32, lineHeight: 1.65 }}>
              Your photos and cover are ready. Sign in to generate your photobook. It takes one click.
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={() => {
                  setStartError("Sign-in failed. Please try again.");
                  setShowLoginModal(false);
                }}
                size="large"
                shape="pill"
                text="continue_with"
              />
            </div>
            <button
              onClick={() => setShowLoginModal(false)}
              style={{ background: "none", border: "none", fontSize: 13, color: "var(--sb-muted-2)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <FlowTopbar
        currentStep={2}
        rightSlot={
          <a
            href={`/trips/${tripId}/cover`}
            onClick={(e) => {
              e.preventDefault();
              router.push(`/trips/${tripId}/cover`);
            }}
            style={{ fontSize: 13, color: "var(--sb-muted-2)", textDecoration: "none" }}
          >
            ← back to cover
          </a>
        }
      />

      <div className="flow-page-inner">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 600, color: "var(--sb-gold)", marginBottom: 14, fontFamily: "var(--font-bricolage), sans-serif" }}>
            Step 2 of 4
          </div>
          <h1 className="flow-hero-h1" style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", marginBottom: 14, color: "var(--sb-cream)" }}>
            add your <span style={{ color: "var(--sb-gold)" }}>trip photos</span>
          </h1>
          <p style={{ fontSize: 17, color: "var(--sb-muted)", maxWidth: 680, lineHeight: 1.5 }}>
            <strong style={{ fontWeight: 700, color: "var(--sb-cream)" }}>No need to hand-pick your best. Just add them all.</strong><br />
            Drop in 50 to 1000 photos and we'll curate the highlights into your book. You can't add more later, so upload everything now.
          </p>
        </div>

        <div
          {...getRootProps()}
          style={{
            background: "var(--sb-bg-deep)",
            border: `2px dashed ${isDragActive ? "var(--sb-gold)" : "#5a5249"}`,
            borderRadius: 20,
            padding: "36px 32px",
            textAlign: "center",
            cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s",
            ...(isDragActive && { background: "var(--sb-panel)", borderColor: "var(--sb-gold)" }),
          }}
        >
          <input {...getInputProps()} />
          <div style={{
            width: 56, height: 56, margin: "0 auto 14px",
            background: "var(--sb-panel)", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--sb-gold)", fontSize: 24,
          }}>↑</div>
          <div style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--sb-cream)" }}>
            {isDragActive ? "Drop to upload" : "Drop photos here"}
          </div>
          <div style={{ fontSize: 14, color: "var(--sb-muted)", marginBottom: 18 }}>
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

          {/* OR divider + phone hand-off, kept inside the box so it's actually seen.
              Skipped on phones: the user is already on the device with the photos. */}
          {showPhoneHandoff && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 300, margin: "18px auto" }}>
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
            </>
          )}
        </div>

        <DriveImport onImages={handleFiles} disabled={totalCount >= MAX_PHOTOS} />

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
        {startError && (
          <p style={{ color: "var(--sb-red)", fontSize: 14, marginTop: 12 }}>{startError}</p>
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
          pendingCards.some((c) => c.downloading) ? (
            <span>Downloading your photos from Google Drive. Keep this tab open until they finish.</span>
          ) : pendingCards.some((c) => c.converting) ? (
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
            <span>Looking good. Ready to build your book.</span>
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
            {starting ? "Starting…" : "build my photobook"}
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
