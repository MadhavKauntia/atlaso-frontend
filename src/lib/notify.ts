// Lightweight "task finished" nudges for long-running work (uploads, book
// generation): a tab-title badge that always works, plus an opt-in OS-level
// Web Notification for when the user has switched away entirely.

let baseTitle: string | null = null;

function getBase(): string {
  if (typeof document === "undefined") return "Atlaso";
  if (baseTitle === null) baseTitle = document.title || "Atlaso";
  return baseTitle;
}

/** Prefix the tab title with a status (e.g. "↑ 62%"), or clear it with null. */
export function setTabText(text: string | null): void {
  if (typeof document === "undefined") return;
  const base = getBase();
  document.title = text ? `${text} · ${base}` : base;
}

/**
 * Show a "done" badge in the tab title while the tab is in the background, and
 * restore the original title as soon as the user comes back.
 */
export function flashTabDone(label: string): void {
  if (typeof document === "undefined") return;
  const base = getBase();
  const focused = document.visibilityState === "visible" && document.hasFocus();
  if (focused) {
    document.title = base;
    return;
  }
  document.title = `✓ ${label}`;
  const restore = () => {
    document.title = base;
    window.removeEventListener("focus", restore);
    document.removeEventListener("visibilitychange", onVis);
  };
  const onVis = () => {
    if (document.visibilityState === "visible") restore();
  };
  window.addEventListener("focus", restore);
  document.addEventListener("visibilitychange", onVis);
}

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Request notification permission (call from a user gesture; no-op if already decided). */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Fire an OS notification, but only if permission is granted and the tab isn't focused. */
export function notify(title: string, body: string): void {
  if (!canNotify() || Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible" && document.hasFocus()) return;
  try {
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}
