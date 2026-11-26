"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import s from "./coverRequest.module.css";

/**
 * "Request a cover": a small form that sends the destination (and an optional email) to
 * our Formspree form. The form ID is public by design, so it lives in
 * NEXT_PUBLIC_COVER_REQUEST_FORM. Without it, falls back to an email to support.
 */
const FORM_ID = process.env.NEXT_PUBLIC_COVER_REQUEST_FORM?.trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function coverRequestMailto(place: string): string {
  const subject = place ? `Cover request: ${place}` : "Cover request";
  const body = `Hi Atlaso, please add a cover for: ${place || "(destination)"}`;
  return `mailto:support@myatlaso.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const coverRequestsEnabled = Boolean(FORM_ID);

interface Props {
  open: boolean;
  initialPlace: string;
  onClose: () => void;
}

export default function CoverRequestDialog({ open, initialPlace, onClose }: Props) {
  const [place, setPlace] = useState(initialPlace);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const placeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const closeCb = useRef(onClose);
  useEffect(() => { closeCb.current = onClose; }, [onClose]);

  // Fresh form each time it opens, focused where typing is needed.
  useEffect(() => {
    if (!open) return;
    setPlace(initialPlace);
    setError(null);
    setSent(false);
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => (initialPlace ? emailRef : placeRef).current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeCb.current(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, initialPlace]);

  if (!open || typeof document === "undefined") return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const where = place.trim();
    const mail = email.trim();
    if (!where) { setError("Which place should we make a cover for?"); return; }
    if (mail && !EMAIL.test(mail)) { setError("That email doesn't look right."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`https://formspree.io/f/${FORM_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          destination: where,
          ...(mail ? { email: mail } : {}),
          _subject: `Cover request: ${where}`,
          page: window.location.pathname,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSent(true);
    } catch {
      setError("Couldn't send it. Please try again, or email support@myatlaso.com.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className={s.overlay} onClick={onClose}>
      <div className={s.panel} role="dialog" aria-modal="true" aria-labelledby="cover-req-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={s.close} aria-label="Close" onClick={onClose}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {sent ? (
          <div className={s.sent} role="status">
            <span className={s.icon} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
            <h2 id="cover-req-title" className={s.title}>Request sent</h2>
            <p className={s.text}>
              Thanks! We&apos;ll look at a {place.trim()} cover{email.trim() ? " and let you know when it's ready" : ""}.
              Pick a theme cover for now; you can switch before you order.
            </p>
            <button type="button" className={s.primary} onClick={onClose}>back to covers</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 id="cover-req-title" className={s.title}>Request a cover</h2>
            <p className={s.text}>Tell us where you went and we&apos;ll design an illustrated cover for it.</p>
            <label className={s.label} htmlFor="cover-req-place">destination</label>
            <input id="cover-req-place" ref={placeRef} className={s.input} value={place} onChange={(e) => setPlace(e.target.value)} maxLength={60} placeholder="e.g. Andaman, Spiti, Lisbon" autoComplete="off" />
            <label className={s.label} htmlFor="cover-req-email">email <span className={s.optional}>(optional, so we can tell you when it&apos;s ready)</span></label>
            <input id="cover-req-email" ref={emailRef} className={s.input} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} placeholder="you@email.com" />
            {error && <p className={s.error} role="alert">{error}</p>}
            <button type="submit" className={s.primary} disabled={busy}>{busy ? "sending…" : "send request"}</button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
