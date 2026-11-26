/**
 * The current email-for-a-code offer, configured with server-only environment variables
 * (never NEXT_PUBLIC_, so none of this reaches the browser bundle):
 *   OFFER_CODE         the coupon code emailed to people who subscribe (blank: no offer)
 *   OFFER_ENDS_AT      ISO date-time the offer ends, e.g. 2026-12-01T23:59:59+05:30
 *   OFFER_DESCRIPTION  one line for the email, e.g. "50% off your travel photo book"
 *   OFFER_TAG          optional label above it in the email, e.g. "Black Friday"
 * Swap these for the next offer; the subscribe endpoint itself stays the same.
 */
export interface Offer {
  code: string;
  endsAt: string | null;
  description: string | null;
  tag: string | null;
}

export function currentOffer(now = new Date()): Offer | null {
  const code = process.env.OFFER_CODE?.trim();
  if (!code) return null;
  const endsAt = process.env.OFFER_ENDS_AT?.trim() || null;
  if (endsAt) {
    const end = new Date(endsAt);
    if (Number.isNaN(end.getTime()) || now >= end) return null;
  }
  return {
    code,
    endsAt,
    description: process.env.OFFER_DESCRIPTION?.trim() || null,
    tag: process.env.OFFER_TAG?.trim() || null,
  };
}

/** "1 December, 11:59 pm" in India time. */
export function endsLabel(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const d = new Date(endsAt);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  return `${day}, ${time}`;
}
