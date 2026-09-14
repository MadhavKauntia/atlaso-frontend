"use client";

import { memo, useState } from "react";
import { getPhotoImageUrl, type Photo } from "@/lib/api";
import type { PendingCard } from "@/lib/upload/pipeline";

export const PhotoTile = memo(function PhotoTile({ photo, tripId, index, thumbUrl, onDelete }: { photo: Photo; tripId: string; index: number; thumbUrl?: string; onDelete?: (id: string) => void }) {
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
        src={thumbUrl ?? photo.thumbnailUrl ?? photo.imageUrl ?? getPhotoImageUrl(tripId, photo.id)}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
      />
      {/* Delete is only offered where the user is authenticated (desktop). On
          the phone (guest, no token) it would 401 → redirect to login, so the
          button is omitted; curation happens on the computer. */}
      {onDelete && (
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
      )}
    </div>
  );
});

export const PendingTile = memo(function PendingTile({ card, onDismiss }: { card: PendingCard; onDismiss: (id: string) => void }) {
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
