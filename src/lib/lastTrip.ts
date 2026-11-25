// The last unfinished photobook started in this browser, so the site can offer to pick it up
// again ("Continue your photobook") after the tab was closed. Cleared once the trip is claimed
// at "build my photobook", from then on it lives in the user's account.

const KEY = "atlaso_last_trip";
const DISMISSED_KEY = "atlaso_last_trip_dismissed";

export function rememberLastTrip(tripId: string): void {
  try {
    localStorage.setItem(KEY, tripId);
    localStorage.removeItem(DISMISSED_KEY);
  } catch { /* storage blocked */ }
}

export function readLastTrip(): string | null {
  try {
    const id = localStorage.getItem(KEY);
    return id && localStorage.getItem(DISMISSED_KEY) !== id ? id : null;
  } catch {
    return null;
  }
}

/** Forget it only if it's still the remembered trip (a newer start may have replaced it). */
export function forgetLastTrip(tripId?: string): void {
  try {
    if (!tripId || localStorage.getItem(KEY) === tripId) localStorage.removeItem(KEY);
  } catch { /* storage blocked */ }
}

/** Hide the prompt for this trip; a new trip brings it back. */
export function dismissLastTrip(tripId: string): void {
  try { localStorage.setItem(DISMISSED_KEY, tripId); } catch { /* storage blocked */ }
}
