"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { guestTokenHeader } from "@/lib/guest";
import { readTripCoverPrefs } from "@/lib/coverPrefs";
import { getCountry } from "@/lib/covers/countries";
import { readLastTrip, forgetLastTrip, dismissLastTrip } from "@/lib/lastTrip";
import { IS_MOCK } from "@/lib/mock";
import s from "./site.module.css";

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api`;

// Statuses before a book exists. Anything later lives in the account page instead.
const IN_PROGRESS = new Set(["CREATED", "UPLOADING_PHOTOS", "ANALYZING_PHOTOS", "READY_FOR_BOOK_GENERATION"]);

interface Resume {
  tripId: string;
  href: string;
  name: string | null;
  photos: number;
}

// Plain fetch, not the api.ts helper: that one sends the visitor to /login on a 401, which a
// background check on a marketing page must never do.
async function get<T>(path: string, tripId: string): Promise<T | null> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: { ...guestTokenHeader(tripId), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 404 || res.status === 403) throw new Error("gone");
  return res.ok ? ((await res.json()) as T) : null;
}

/** "Continue your photobook" prompt for a trip started in this browser and left unfinished. */
export default function ResumeBanner() {
  const [resume, setResume] = useState<Resume | null>(null);

  useEffect(() => {
    if (IS_MOCK) return;
    const tripId = readLastTrip();
    if (!tripId) return;
    let cancelled = false;
    (async () => {
      try {
        const trip = await get<{ status: string }>(`/trips/${tripId}`, tripId);
        if (!trip) return; // transient error: try again on the next page view
        if (!IN_PROGRESS.has(trip.status)) { forgetLastTrip(tripId); return; }
        const photos = (await get<unknown[]>(`/trips/${tripId}/photos`, tripId))?.length ?? 0;
        const prefs = readTripCoverPrefs(tripId);
        // Nothing to come back to yet (no cover picked, no photos): don't nag.
        if (!photos && !prefs?.country) return;
        const name = prefs?.title || getCountry(prefs?.country)?.name || null;
        // Cover is step 1: with a cover picked or photos uploaded, they resume on the photo step.
        if (!cancelled) setResume({ tripId, href: `/trips/${tripId}/upload`, name, photos });
      } catch {
        // Deleted (cleanup), claimed by someone else, or the token no longer works.
        forgetLastTrip(tripId);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!resume) return null;
  const what = resume.name ? `Your ${resume.name} photobook` : "Your photobook";
  const detail = resume.photos
    ? `${resume.photos} photo${resume.photos === 1 ? "" : "s"} uploaded`
    : "cover picked, photos next";

  return (
    <div className={s.resumeBar} role="region" aria-label="Unfinished photobook">
      <Link href={resume.href} className={s.resumeLink}>
        <span><strong>{what}</strong> is waiting · {detail}</span>
        <span className={s.resumeCta}>continue →</span>
      </Link>
      <button
        type="button"
        className={s.resumeClose}
        aria-label="Dismiss"
        onClick={() => { dismissLastTrip(resume.tripId); setResume(null); }}
      >
        ×
      </button>
    </div>
  );
}
