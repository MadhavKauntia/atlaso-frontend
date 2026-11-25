"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { usePhotoUpload } from "@/lib/upload/usePhotoUpload";
import { setTabText, flashTabDone, notify } from "@/lib/notify";

// The photo upload for a trip lives here, above the cover and photo pages, rather
// than inside the photo page. The [tripId] layout keeps this mounted while the
// user moves between /cover and /upload, so going back to the cover step in the
// middle of an upload doesn't drop the upload, its progress, or its tiles.

export interface InferredLocation {
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

type UploadState = ReturnType<typeof usePhotoUpload>;
export type UploadSessionValue = UploadState & { inferred: InferredLocation | null };

const UploadSessionContext = createContext<UploadSessionValue | null>(null);

/** The trip's upload session. Only usable on the cover (new book) and photo steps. */
export function useUploadSession(): UploadSessionValue {
  const ctx = useContext(UploadSessionContext);
  if (!ctx) throw new Error("useUploadSession must be used inside the trip's upload session");
  return ctx;
}

/** Same, but null where no session is running (e.g. editing a finished book's cover). */
export function useOptionalUploadSession(): UploadSessionValue | null {
  return useContext(UploadSessionContext);
}

function Session({ tripId, children }: { tripId: string; children: React.ReactNode }) {
  // Restore a location inferred earlier in this browser session (e.g. after a reload).
  // Safe to read on the first client render: nothing shows it until photos have loaded.
  const [inferred, setInferred] = useState<InferredLocation | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(`atlaso_inferred_${tripId}`);
      return raw ? (JSON.parse(raw) as InferredLocation) : null;
    } catch {
      return null;
    }
  });

  // usePhotoUpload memoises its drop handler on this callback, so keep it stable
  // and point it at the latest inference function through a ref.
  const onSettledRef = useRef<() => void>(() => {});
  const onBatchSettled = useCallback(() => onSettledRef.current(), []);
  const upload = usePhotoUpload({ tripId, onBatchSettled });
  const { coordsRef, datesRef, uploading, uploadPct, photos } = upload;

  useEffect(() => {
    onSettledRef.current = async () => {
      const result = await inferLocationFromPhotos(coordsRef.current, datesRef.current);
      if (!result) return;
      setInferred(result);
      // Keyed per trip so one trip's location never leaks into another.
      try { sessionStorage.setItem(`atlaso_inferred_${tripId}`, JSON.stringify(result)); } catch { /* storage blocked */ }
    };
  }, [tripId, coordsRef, datesRef]);

  // Tab badge while uploading and a nudge when it finishes, on whichever step the user is on.
  const wasUploading = useRef(false);
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

  useEffect(() => () => setTabText(null), []);

  // Reloading or closing the tab would cut the upload off, so ask first.
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  return (
    <UploadSessionContext.Provider value={{ ...upload, inferred }}>
      {children}
    </UploadSessionContext.Provider>
  );
}

/**
 * Runs the upload session on the two steps that share it: /trips/{id}/upload and
 * /trips/{id}/cover for a new book. Editing a finished book's cover (?bookId=)
 * and every other trip page render without it.
 */
export default function UploadSessionBoundary({ tripId, children }: { tripId: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = `/trips/${tripId}`;
  const path = pathname.replace(/\/$/, "");
  const active = path === `${base}/upload` || (path === `${base}/cover` && !searchParams.get("bookId"));
  if (!active) return <>{children}</>;
  return <Session tripId={tripId}>{children}</Session>;
}
