"use client";

import { useState } from "react";
import {
  DriveImportError,
  isDriveImportEnabled,
  isGooglePhotosLink,
  listDriveImages,
  parseDriveLink,
  type RemoteImage,
} from "@/lib/upload/googleDrive";

type Status =
  | { kind: "idle" }
  | { kind: "listing" }
  | { kind: "error"; message: string }
  | { kind: "done"; message: string };

/**
 * "Paste a Google Drive link" row for the upload page. Lists the folder's photos
 * and hands them to the normal upload pipeline, which downloads each one as its
 * turn comes. Renders nothing when no Google API key is configured.
 */
export default function DriveImport({ onImages, disabled }: { onImages: (images: RemoteImage[]) => void; disabled?: boolean }) {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  if (!isDriveImportEnabled) return null;

  const busy = status.kind === "listing";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || disabled) return;
    if (isGooglePhotosLink(link)) {
      setStatus({ kind: "error", message: "Google Photos links aren't supported. Download the album, or move the photos to a Google Drive folder and paste that link." });
      return;
    }
    const parsed = parseDriveLink(link);
    if (!parsed) {
      setStatus({ kind: "error", message: "That doesn't look like a Google Drive link. It should start with drive.google.com." });
      return;
    }
    setStatus({ kind: "listing" });
    try {
      const { name, images, skipped } = await listDriveImages(parsed);
      if (!images.length) {
        setStatus({ kind: "error", message: skipped
          ? `"${name}" has no photos we can use (only JPG, PNG, WebP or HEIC).`
          : `"${name}" is empty. Check that it's the right folder and that it's shared with "Anyone with the link".` });
        return;
      }
      onImages(images);
      setLink("");
      const extra = skipped ? ` Skipped ${skipped} file${skipped === 1 ? "" : "s"} that aren't photos.` : "";
      setStatus({ kind: "done", message: `Importing ${images.length} photo${images.length === 1 ? "" : "s"} from "${name}".${extra}` });
    } catch (err) {
      console.error("[drive] import failed", err);
      setStatus({ kind: "error", message: err instanceof DriveImportError ? err.message : "Something went wrong reading that link. Please try again." });
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <form onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          type="url"
          inputMode="url"
          value={link}
          onChange={(e) => { setLink(e.target.value); if (status.kind === "error") setStatus({ kind: "idle" }); }}
          placeholder="Or paste a Google Drive folder link"
          aria-label="Google Drive folder link"
          disabled={busy || disabled}
          style={{
            flex: "1 1 280px", minWidth: 0, padding: "13px 18px",
            background: "var(--sb-bg-deep)", color: "var(--sb-cream)",
            border: "1px solid #5a5249", borderRadius: 999, outline: "none",
            fontSize: 14, fontFamily: "var(--font-dm-sans), sans-serif",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--sb-gold)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#5a5249"; }}
        />
        <button
          type="submit"
          disabled={busy || disabled || !link.trim()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "13px 22px", background: "var(--sb-panel)", color: "var(--sb-cream)",
            border: "1px solid #5a5249", borderRadius: 999,
            cursor: busy || disabled || !link.trim() ? "not-allowed" : "pointer",
            opacity: disabled || !link.trim() ? 0.6 : 1,
            fontSize: 14, fontWeight: 700, fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          {busy && (
            <span style={{ width: 14, height: 14, border: "2px solid var(--sb-gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          )}
          {busy ? "Reading folder…" : "Import from Drive"}
        </button>
      </form>
      {status.kind === "error" && (
        <p style={{ color: "var(--sb-red)", fontSize: 13, marginTop: 8 }}>{status.message}</p>
      )}
      {status.kind === "done" && (
        <p style={{ color: "var(--sb-muted)", fontSize: 13, marginTop: 8 }}>{status.message}</p>
      )}
      {status.kind === "idle" && (
        <p style={{ color: "var(--sb-muted-2)", fontSize: 12, marginTop: 8 }}>
          The folder must be shared as &quot;Anyone with the link&quot;. Subfolders are included.
        </p>
      )}
    </div>
  );
}
