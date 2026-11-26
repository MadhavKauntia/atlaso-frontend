"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import s from "./offer.module.css";

/**
 * Black Friday popup (add ?offer to a URL to force it open): leave an email (added to the mailing list via /api/subscribe) and
 * the coupon code is emailed to it. Shows once per browser per offer, a few seconds after
 * landing, and only while /api/offer says an offer is running. The code never reaches the
 * browser at all: only someone with a working inbox gets it.
 */

const DISCOUNT_LABEL = "50% off";
const SHOW_AFTER_MS = 2500;
const SEEN_KEY = "atlaso_offer_seen";

function endsLabel(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const d = new Date(endsAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
}

export default function OfferModal() {
  const [open, setOpen] = useState(false);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seenTag = useRef("1");

  // Decide whether to show it.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tryOpen = () => {
      if (cancelled) return;
      // Don't pop over another dialog (e.g. the book preview); check again shortly.
      if (document.querySelector('[role="dialog"]')) { timer = setTimeout(tryOpen, 1500); return; }
      setOpen(true);
    };
    timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/offer", { cache: "no-store" });
        const data = (await res.json()) as { active?: boolean; endsAt?: string | null };
        if (!data.active) return;
        seenTag.current = data.endsAt ?? "1";
        // ?offer in the URL (e.g. a link from a post) shows it even if this browser has seen it.
        const forced = new URLSearchParams(window.location.search).has("offer");
        try { if (!forced && localStorage.getItem(SEEN_KEY) === seenTag.current) return; } catch { /* storage blocked: show it */ }
        if (cancelled) return;
        setEndsAt(data.endsAt ?? null);
        tryOpen();
      } catch { /* no offer info: stay quiet */ }
    }, SHOW_AFTER_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const markSeen = () => {
    try { localStorage.setItem(SEEN_KEY, seenTag.current); } catch { /* storage blocked */ }
  };
  const close = () => { markSeen(); setOpen(false); };

  // While open: focus the email box, Esc closes, give focus back afterwards.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { markSeen(); setOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; emailed?: boolean };
      if (!res.ok) { setError(data.error ?? "Something went wrong. Please try again."); return; }
      if (!data.emailed) { setError("This offer has just ended. You're on the list for the next one."); return; }
      setSentTo(email.trim());
      markSeen();
    } catch {
      setError("Couldn't reach us. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  const ends = endsLabel(endsAt);

  return (
    <div className={s.overlay} onClick={close}>
      <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="offer-title" onClick={(e) => e.stopPropagation()}>
        {/* ── top of the ticket ── */}
        <div className={s.top}>
          <button type="button" className={s.close} aria-label="Close" onClick={close}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo-white.png" alt="atlaso" className={s.logo} />

          <div className={s.stamps} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/stamps/japan.png" alt="" className={`${s.stamp} ${s.stampL}`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/stamps/bali.png" alt="" className={`${s.stamp} ${s.stampC}`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/stamps/paris.png" alt="" className={`${s.stamp} ${s.stampR}`} />
          </div>

          <span className={s.pill}>black friday</span>
          <h2 id="offer-title" className={s.title}>
            <span className={s.big}>{DISCOUNT_LABEL}</span>
            <span className={s.sub}>your travel photo book</span>
          </h2>
        </div>

        {/* perforation */}
        <div className={s.tear} aria-hidden="true" />

        {/* ── the stub ── */}
        <div className={s.stub}>
          {sentTo ? (
            <div className={s.sentBox} role="status">
              <span className={s.sentIcon} aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              </span>
              <p className={s.sentTitle}>Your code is on its way</p>
              <p className={s.sentText}>We&apos;ve sent it to <strong>{sentTo}</strong>. It can take a minute; check promotions or spam if it&apos;s not there.</p>
              <Link href="/create" className={s.cta} onClick={close}>start my photo book <span aria-hidden="true">→</span></Link>
              {ends && <p className={s.fine}>Use the code at checkout before {ends}.</p>}
            </div>
          ) : (
            <form className={s.form} onSubmit={submit} noValidate>
              <p className={s.lede}>Our biggest sale of the year. Pop in your email and we&apos;ll send you your code.</p>
              <label htmlFor="offer-email" className={s.srOnly}>Email address</label>
              <input
                id="offer-email"
                ref={inputRef}
                className={s.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {/* honeypot: hidden from people, tempting to bots */}
              <input className={s.hp} tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              <button type="submit" className={s.cta} disabled={busy}>{busy ? "sending…" : "email me my code"}</button>
              {error && <p className={s.error} role="alert">{error}</p>}
              <p className={s.fine}>
                {ends ? <>Ends {ends}. </> : null}We&apos;ll also send the occasional offer; unsubscribe anytime. <Link href="/privacy">Privacy</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
