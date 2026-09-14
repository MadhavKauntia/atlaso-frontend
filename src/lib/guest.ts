// Guest capability tokens for pre-login (guest) trips. The backend hands one out when a guest
// trip is created and requires it as the `X-Guest-Token` header for guest reads/uploads/claim
// on that trip (until the trip is claimed, after which the owner's JWT is used instead).

const key = (tripId: string) => `atlaso_guest_token:${tripId}`;

export function setGuestToken(tripId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(tripId), token);
  } catch {
    /* storage unavailable — guest ops will fail until re-created */
  }
}

export function getGuestToken(tripId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key(tripId));
  } catch {
    return null;
  }
}

export function removeGuestToken(tripId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key(tripId));
  } catch {
    /* ignore */
  }
}

/** Header object with X-Guest-Token when we hold a token for this trip, else empty. */
export function guestTokenHeader(tripId: string): Record<string, string> {
  const token = getGuestToken(tripId);
  return token ? { "X-Guest-Token": token } : {};
}
