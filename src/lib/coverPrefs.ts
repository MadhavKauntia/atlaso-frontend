// Cover choices made on the cover step (step 1), kept in the browser until the
// book is generated after the photo step (step 2).
//
// Stored per trip so the choices survive going back and forth between the two
// steps and can't be picked up by another trip open in a second tab. A new book
// starts blank; it never inherits another trip's cover. The same value is also
// written to the legacy global key, which only mock mode reads.

export interface CoverPrefs {
  title: string;
  country: string;
  description: string;
  bg: string;
}

const GLOBAL_KEY = "atlaso_cover_prefs";
const tripKey = (tripId: string) => `atlaso_cover_prefs_${tripId}`;

function parse(raw: string | null): CoverPrefs | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? (p as CoverPrefs) : null;
  } catch {
    return null;
  }
}

/** This trip's saved cover choices, or null if the cover step hasn't been completed for it. */
export function readTripCoverPrefs(tripId: string): CoverPrefs | null {
  try {
    return parse(localStorage.getItem(tripKey(tripId)));
  } catch {
    return null;
  }
}

export function saveCoverPrefs(tripId: string, prefs: CoverPrefs): void {
  try {
    const raw = JSON.stringify(prefs);
    localStorage.setItem(tripKey(tripId), raw);
    localStorage.setItem(GLOBAL_KEY, raw);
  } catch {
    /* storage blocked */
  }
}

/** Called once the book exists server-side with these choices applied. */
export function clearCoverPrefs(tripId: string): void {
  try {
    localStorage.removeItem(tripKey(tripId));
    localStorage.removeItem(GLOBAL_KEY);
  } catch {
    /* storage blocked */
  }
}
