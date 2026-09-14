"use client";

import { useEffect, useState } from "react";

/**
 * A modal that shows a QR code linking to the mobile upload page for this trip.
 * The trip's UUID in the URL is the capability (matching the existing public
 * guest-upload flow), so scanning it lets a phone add photos straight from its
 * camera roll — no AirDrop-to-desktop dance.
 */
export default function PhoneUploadPanel({ url, newFromPhone, onClose }: { url: string; newFromPhone: number; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(url, { width: 440, margin: 1, color: { dark: "#1c1917", light: "#ffffff" } })
      )
      .then((dataUrl) => { if (!cancelled) setQrDataUrl(dataUrl); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(28,25,23,0.72)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--sb-bg-deep)", border: "1px solid #5a5249", borderRadius: 24,
          padding: "36px 32px", maxWidth: 380, width: "100%", textAlign: "center",
          fontFamily: "var(--font-dm-sans), sans-serif", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%",
            background: "var(--sb-panel)", color: "var(--sb-cream)", border: "none", cursor: "pointer",
            fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >×</button>

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 600, color: "var(--sb-gold)", marginBottom: 12, fontFamily: "var(--font-bricolage), sans-serif" }}>
          Upload from your phone
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 10, color: "var(--sb-cream)" }}>
          Scan to add photos
        </h2>
        <p style={{ fontSize: 14, color: "var(--sb-muted)", lineHeight: 1.5, marginBottom: 22 }}>
          Point your phone camera at the code, then pick photos from your camera roll. They&apos;ll appear here automatically.
        </p>

        <div style={{
          background: "#ffffff", borderRadius: 16, padding: 16, width: 240, height: 240,
          margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR code" style={{ width: "100%", height: "100%", display: "block" }} />
          ) : failed ? (
            <span style={{ color: "#1c1917", fontSize: 13, padding: 12 }}>Couldn&apos;t generate a code. Open this link on your phone:<br /><span style={{ wordBreak: "break-all", fontWeight: 700 }}>{url}</span></span>
          ) : (
            <div style={{ width: 26, height: 26, border: "3px solid #ece5d8", borderTopColor: "var(--sb-gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          )}
        </div>

        <div style={{ marginTop: 20, minHeight: 22 }}>
          {newFromPhone > 0 ? (
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--sb-gold)" }}>
              ↑ {newFromPhone} photo{newFromPhone === 1 ? "" : "s"} added from your phone
            </span>
          ) : (
            <span style={{ fontSize: 13, color: "var(--sb-muted-2)" }}>Waiting for photos from your phone…</span>
          )}
        </div>
      </div>
    </div>
  );
}
