"use client";

import { use, useRef } from "react";
import Brand from "@/components/Brand";
import { MAX_PHOTOS } from "@/lib/upload/pipeline";
import { usePhotoUpload } from "@/lib/upload/usePhotoUpload";
import { PhotoTile, PendingTile } from "@/components/upload/UploadTiles";

// The phone is an input device, not the place the book gets finished — so this
// screen has no 50-photo gate and no "continue" step. It just pushes photos
// into the same trip the desktop is already working on. Lower concurrency than
// desktop: phones have far less CPU/RAM for HEIC decode + downscaling.
const MOBILE_CONCURRENCY = 3;

export default function MobileUploadPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);

  const libraryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const { photos, pendingCards, uploading, error, uploadPct, totalCount, handleFiles, deletePhoto, dismissPending, thumbUrls } =
    usePhotoUpload({ tripId, concurrency: MOBILE_CONCURRENCY });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) handleFiles(files);
    // Reset so picking the same file again re-fires change.
    e.target.value = "";
  };

  const atCap = totalCount >= MAX_PHOTOS;

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", color: "var(--sb-cream)", fontFamily: "var(--font-dm-sans), sans-serif", paddingBottom: 40 }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #3a342d", position: "sticky", top: 0, background: "var(--sb-bg)", zIndex: 10 }}>
        <Brand dark height={24} />
      </div>

      <div style={{ padding: "28px 20px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 600, color: "var(--sb-gold)", marginBottom: 12, fontFamily: "var(--font-bricolage), sans-serif" }}>
          Upload from your phone
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 12, color: "var(--sb-cream)" }}>
          add your <span style={{ color: "var(--sb-gold)" }}>trip photos</span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--sb-muted)", lineHeight: 1.5, marginBottom: 26 }}>
          Pick photos from your camera roll and they&apos;ll upload straight into your book. Keep this page open while they finish, then head back to your computer to design it.
        </p>

        {/* Hidden inputs driven by the two buttons below. `image/*` (not an
            explicit MIME list) is important on iOS: a narrow list greys out
            camera-roll HEIC photos in the picker. The pipeline still validates
            types and converts HEIC after selection. */}
        <input ref={libraryInput} type="file" accept="image/*" multiple onChange={onPick} style={{ display: "none" }} />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: "none" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={() => libraryInput.current?.click()}
            disabled={atCap}
            style={{
              width: "100%", padding: "18px", borderRadius: 16, border: "none",
              background: atCap ? "var(--sb-panel-2)" : "var(--sb-gold)", color: atCap ? "#8a7f6f" : "var(--sb-ink)",
              fontSize: 16, fontWeight: 800, fontFamily: "var(--font-bricolage), sans-serif",
              cursor: atCap ? "not-allowed" : "pointer",
            }}
          >
            🖼️ Choose from library
          </button>
          <button
            onClick={() => cameraInput.current?.click()}
            disabled={atCap}
            style={{
              width: "100%", padding: "18px", borderRadius: 16,
              background: "var(--sb-panel-2)", color: "var(--sb-cream)", border: "1px solid #5a5249",
              fontSize: 16, fontWeight: 700, cursor: atCap ? "not-allowed" : "pointer",
            }}
          >
            📷 Take a photo
          </button>
        </div>

        {error && (
          <p style={{ color: "var(--sb-red)", fontSize: 14, marginTop: 14 }}>{error}</p>
        )}

        {uploading && (
          <div style={{ marginTop: 22 }}>
            <div style={{ height: 6, background: "var(--sb-panel-2)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${uploadPct}%`, background: "var(--sb-gold)", transition: "width 0.2s" }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--sb-muted)", marginTop: 8 }}>Uploading… {uploadPct}%</div>
          </div>
        )}

        {totalCount > 0 && (
          <>
            <div style={{ margin: "28px 0 14px", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--sb-cream)" }}>
              <span style={{ color: "var(--sb-gold)" }}>{totalCount}</span> photo{totalCount === 1 ? "" : "s"} added
              {atCap && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sb-muted)", marginLeft: 8 }}>· limit reached</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
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

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* No hover on touch — keep the delete affordance always visible. */
        .photo-tile .remove-btn { opacity: 1; }
      `}</style>
    </div>
  );
}
