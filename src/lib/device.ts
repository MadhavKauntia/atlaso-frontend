/**
 * Best-effort check for a phone browser (client-only; returns false during SSR).
 * Tablets are deliberately excluded: an iPad or Android tablet user may still
 * want to hand off to their phone, where the photos usually live.
 */
export function isPhoneBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  // Chromium exposes a direct signal; it's false for tablets.
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;
  // Android phones include "Mobile" (tablets don't); iPadOS reports as a Mac.
  return /iPhone|iPod|Android.*Mobile|Windows Phone|Mobi/i.test(navigator.userAgent);
}
