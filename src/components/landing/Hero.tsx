"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/covers/countries";
import { DESTINATIONS } from "@/lib/destinations";
import { BOOK_PRICE_INR, BOOK_LIST_PRICE_INR, BOOK_PAGES, LAUNCH_OFFER_ACTIVE, formatInr } from "@/lib/site";
import OpenableBook from "./OpenableBook";
import { dmDisplay, hand } from "./fonts";
import s from "./hero.module.css";

const PLACES = [
  { name: "Bali", slug: "bali" },
  { name: "Thailand", slug: "thailand" },
  { name: "Japan", slug: "japan" },
  { name: "Sri Lanka", slug: "srilanka" },
  { name: "Paris", slug: "paris" },
];
// Covers for a typed place we have no design for.
const THEME_FALLBACKS = ["mountains", "beach", "hills"];
const CYCLE_MS = 3000;
const HOLD_TICKS_AFTER_PICK = 2; // a picked chip stays for two cycle ticks (~6s)

// ─── typewriter timing (deterministic, so server and client render the same) ───
const TYPE_SPEED = 0.045; // seconds per character
const HELLO = "hello traveller,";
const HEADLINE = "where have you been lately?";

interface Letter { c: string; delay: string; dur: string }

function buildTypewriter() {
  const hello = HELLO.split("").map((c) => ({ c, t: 0 }));
  const words = HEADLINE.split(" ").map((w) => w.split("").map((c, ci) => ({ c, t: 0, endWord: ci === w.length - 1 })));
  const flat = words.flat();
  let t = 0.4;
  hello.forEach((l, i) => { l.t = t; t += TYPE_SPEED * (0.8 + ((i * 29) % 7) / 10); });
  t += 0.45;
  flat.forEach((l, i) => { l.t = t; t += TYPE_SPEED * (0.7 + ((i * 37) % 11) / 18) + (l.endWord ? TYPE_SPEED * 0.5 : 0); });
  const all = [...hello, ...flat];
  const out = new Map<object, Letter>();
  all.forEach((l, i) => {
    out.set(l, { c: l.c, delay: `${l.t.toFixed(3)}s`, dur: i === all.length - 1 ? "0.3s" : `${(all[i + 1].t - l.t).toFixed(3)}s` });
  });
  const end = all[all.length - 1].t + 0.75;
  return {
    hello: hello.map((l) => out.get(l)!),
    words: words.map((w) => w.map((l) => out.get(l)!)),
    bookAt: end,
  };
}
const TW = buildTypewriter();

function TypedLetter({ l }: { l: Letter }) {
  return (
    <span className={s.ch} style={{ animationDelay: l.delay }}>
      {l.c}
      <span className={s.cr} style={{ animationDelay: l.delay, animationDuration: l.dur }} />
    </span>
  );
}

// ─── destination → cover ───
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** A cover design for whatever the visitor typed: a matching destination, else a theme. */
function coverFor(text: string): { slug: string; matched: boolean } {
  const q = text.trim().toLowerCase();
  const squash = q.replace(/[^a-z]/g, "");
  const dest = DESTINATIONS.find((d) => d.name.toLowerCase() === q || d.path.replace(/-/g, "") === squash);
  if (dest) return { slug: dest.cover, matched: true };
  const hit = COUNTRIES.find((c) => c.category === "destination" && !/\d/.test(c.slug) && (c.name.toLowerCase() === q || c.slug === squash));
  if (hit) return { slug: hit.slug, matched: true };
  return { slug: THEME_FALLBACKS[hash(q) % THEME_FALLBACKS.length], matched: false };
}

function capitalise(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export default function Hero() {
  const router = useRouter();
  const autoIdx = useRef(-1); // the chip the cycle is on
  const [picked, setPicked] = useState(0); // the chip shown (before the cycle starts: Bali)
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState(false);
  const [cycled, setCycled] = useState(false); // first doodles wait for the book to land
  const holdTicks = useRef(0);
  const inputFocused = useRef(false);
  const state = useRef({ custom, open });
  useEffect(() => { state.current = { custom, open }; }, [custom, open]);

  // Once the headline has typed itself out, cycle through the chips.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const step = () => {
      const { custom: c, open: o } = state.current;
      if (c.trim() || o || inputFocused.current || document.hidden) return;
      if (holdTicks.current > 0) { holdTicks.current--; return; }
      autoIdx.current = (autoIdx.current + 1) % PLACES.length;
      setPicked(autoIdx.current);
      setCycled(true);
    };
    const start = setTimeout(() => {
      step();
      interval = setInterval(step, CYCLE_MS);
    }, Math.round(TW.bookAt * 1000));
    return () => { clearTimeout(start); if (interval) clearInterval(interval); };
  }, []);

  const typed = custom.trim();
  const chipHit = typed ? PLACES.findIndex((p) => p.name.toLowerCase() === typed.toLowerCase()) : -1;
  const place = typed && chipHit < 0 ? null : PLACES[chipHit >= 0 ? chipHit : picked];
  const dest = place ? place.name : capitalise(typed);
  const cover = place ? { slug: place.slug, matched: true } : coverFor(typed);
  const variant = place ? PLACES.indexOf(place) : hash(dest) % 5;
  const href = place
    ? `/create?cover=${place.slug}&step=cover`
    : `/create?cover=${cover.slug}&title=${encodeURIComponent(dest)}&step=cover`;

  const pick = (i: number) => {
    setCustom("");
    setPicked(i);
    autoIdx.current = i;
    setCycled(true);
    holdTicks.current = HOLD_TICKS_AFTER_PICK;
  };

  return (
    <section className={`${s.hero} ${dmDisplay.variable}`}>
      <div className={s.inner}>
        <div className={s.copy}>
          <div className={s.helloWrap}>
            <p className={`${s.hello} ${hand.className}`}>
              <span className={s.srOnly}>hello traveller,</span>
              <span aria-hidden="true">{TW.hello.map((l, i) => <TypedLetter key={i} l={l} />)}</span>
            </p>
          </div>
          <h1 className={s.h1}>
            <span className={s.srOnly}>{HEADLINE}</span>
            <span aria-hidden="true">
              {TW.words.map((w, wi) => (
                <span key={wi} className={s.word} style={{ marginRight: wi < TW.words.length - 1 ? "0.26em" : 0 }}>
                  {w.map((l, li) => <TypedLetter key={li} l={l} />)}
                </span>
              ))}
            </span>
          </h1>

          <div className={s.picker}>
            <div role="group" aria-label="Destinations" className={s.chips}>
              {PLACES.map((p, i) => {
                const on = place === p;
                return (
                  <button key={p.slug} type="button" className={`${s.chip} ${on ? s.chipOn : ""}`} aria-pressed={on} onClick={() => pick(i)}>
                    {p.name}
                  </button>
                );
              })}
            </div>
            <div className={s.inputRow}>
              <input
                className={s.destInput}
                type="text"
                autoComplete="off"
                maxLength={30}
                aria-label="Or type where you went"
                placeholder="Spain, Vietnam, Italy…"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onFocus={() => { inputFocused.current = true; }}
                onBlur={() => { inputFocused.current = false; }}
                onKeyDown={(e) => { if (e.key === "Enter" && typed) router.push(href); }}
              />
            </div>
          </div>

          <div className={s.ctaRow}>
            <div className={s.ctaStack}>
              <Link href={href} className={s.cta}>
                {/* Hidden copies of every chip's label: the widest holds the button steady while the chips cycle. */}
                <span className={s.ctaLabel}>
                  <span>make my {dest} book</span>
                  {PLACES.map((p) => <span key={p.slug} aria-hidden="true" className={s.ctaSizer}>make my {p.name} book</span>)}
                </span>
                <span aria-hidden="true" className={s.ctaArrow}>→</span>
              </Link>
              <p className={s.ctaSub}>upload free · pay only once you like it</p>
            </div>
            <div className={s.price}>
              <p className={s.priceLine}>
                {LAUNCH_OFFER_ACTIVE && <s className={s.priceWas}>{formatInr(BOOK_LIST_PRICE_INR)}</s>}
                <span className={s.priceNow}>{formatInr(BOOK_PRICE_INR)}</span>
              </p>
              <p className={s.priceSpec}>{BOOK_PAGES} pages · B5 · hardcover</p>
            </div>
          </div>
        </div>

        <OpenableBook
          dest={dest}
          coverSlug={cover.slug}
          href={href}
          doodleVariant={variant}
          enterDelay={TW.bookAt}
          doodleStartAt={cycled || typed ? 0 : TW.bookAt}
          onOpenChange={setOpen}
        />
      </div>
    </section>
  );
}
