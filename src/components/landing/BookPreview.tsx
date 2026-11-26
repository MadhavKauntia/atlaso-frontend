"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import CountryCover from "@/components/covers/CountryCover";
import { coverColors } from "@/lib/covers/countries";
import { isMuted, setMuted, playCover, playPageTurn, preloadPageSounds } from "./pageSound";
import BookPage from "./BookPage";
import { dmDisplay } from "./fonts";
import { SAMPLE_PAGES } from "./samplePages";
import s from "./hero.module.css";

interface Props {
  dest: string;
  coverSlug: string;
  href: string;
  handClass: string;
  /** the hero's closed book: where the book flies from, and back to */
  originRef: React.RefObject<HTMLDivElement | null>;
  onClosed: () => void;
}

/**
 * fly:          the closed book flies from the hero to the middle of the screen
 * cover:        its cover swings open onto the left page
 * open:         the spread; drag (or tap) either page to turn it
 * closingCover: the cover swings shut
 * closingFly:   the closed book flies back to the hero
 */
type Phase = "fly" | "cover" | "open" | "closingCover" | "closingFly";

const FLY_MS = 700;
const COVER_MS = 950;
const EASE_OUT = "cubic-bezier(.2,.8,.2,1)";
const EASE_HINGE = "cubic-bezier(.645,.045,.355,1)";

// Leaves: each carries two pages, front (right-hand) and back (left-hand).
const LEAVES = Array.from({ length: Math.ceil(SAMPLE_PAGES.length / 2) }, (_, i) => ({
  front: SAMPLE_PAGES[i * 2],
  back: SAMPLE_PAGES[i * 2 + 1],
}));
const N = LEAVES.length;

// Page physics: a critically damped spring pulls the page toward where the pointer
// is (while dragging) or toward the side it falls to (after release).
const STIFFNESS = 260;
const DAMPING = 2 * Math.sqrt(STIFFNESS);

// Paper bend: a page that can move is built from thin vertical strips, each hinged to
// the one before it, so it can curve. BEND_MAX is the extra turn at the free edge,
// in degrees, at mid-turn.
const STRIPS = 10;
const BEND_MAX = 42;

interface Rect { left: number; top: number; width: number; height: number }

function px(r: Rect) {
  return { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` };
}

/** The hero book's layout box (before its 3D tilt) and its current tilt. */
function measureOrigin(el: HTMLElement | null): (Rect & { transform: string }) | null {
  const btn = el?.parentElement;
  if (!el || !btn) return null;
  const r = btn.getBoundingClientRect();
  const cs = getComputedStyle(btn);
  const tf = getComputedStyle(el).transform;
  return {
    left: r.left + parseFloat(cs.paddingLeft),
    top: r.top + parseFloat(cs.paddingTop),
    width: el.offsetWidth,
    height: el.offsetHeight,
    transform: tf && tf !== "none" ? tf : "rotateY(22deg) rotateX(5deg) rotateZ(-1deg)",
  };
}

function rectOf(el: HTMLElement | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** Stacking: turned leaves pile up on the left (latest on top), the rest on the right (next on top). */
function zFor(i: number, angle: number): number {
  return angle < -90 ? i + 1 : N - i + 1;
}

export default function BookPreview({ dest, coverSlug, href, handClass, originRef, onClosed }: Props) {
  // Mounted only on the client (after a click), so reading the browser here is safe.
  const [phase, setPhase] = useState<Phase>(() => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "open" : "fly"));
  const [turned, setTurned] = useState(0); // leaves turned over to the left
  const [muted, setMutedState] = useState(isMuted);

  const closeRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  const rightBaseRef = useRef<HTMLDivElement>(null); // never transformed: where the closed book sits
  const leafRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadowL = useRef<HTMLDivElement>(null);
  const shadowR = useRef<HTMLDivElement>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const flyBookRef = useRef<HTMLDivElement>(null);
  const flyCoverRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const turnedRef = useRef(0);
  useEffect(() => { turnedRef.current = turned; }, [turned]);

  const { spine } = coverColors(coverSlug);

  // ─── open / close choreography ───
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    const run = (el: Element | null, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      if (!el) return Promise.resolve();
      const a = el.animate(frames, { fill: "both", ...opts });
      return a.finished.then(() => undefined, () => undefined);
    };

    const target = rectOf(rightBaseRef.current);
    const origin = measureOrigin(originRef.current);
    // Park the flyer over the right-hand page (where the closed book sits in the spread).
    if (target && flyerRef.current) Object.assign(flyerRef.current.style, px(target));

    if (phase === "fly") {
      if (!target || !origin) { void Promise.resolve().then(() => { if (!cancelled) setPhase("open"); }); return; }
      Promise.all([
        run(flyerRef.current, [px(origin), px(target)], { duration: FLY_MS, easing: EASE_OUT }),
        run(flyBookRef.current, [{ transform: origin.transform }, { transform: "none" }], { duration: FLY_MS, easing: EASE_OUT }),
      ]).then(() => { if (!cancelled) setPhase("cover"); });
    } else if (phase === "cover") {
      playCover();
      run(flyCoverRef.current, [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }], { duration: COVER_MS, easing: EASE_HINGE })
        .then(() => { if (!cancelled) setPhase("open"); });
    } else if (phase === "open") {
      closeRef.current?.focus();
    } else if (phase === "closingCover") {
      if (reduce || !target || !origin) { onClosed(); return; }
      playCover();
      run(flyCoverRef.current, [{ transform: "rotateY(-180deg)" }, { transform: "rotateY(0deg)" }], { duration: COVER_MS * 0.85, easing: EASE_HINGE })
        .then(() => { if (!cancelled) setPhase("closingFly"); });
    } else if (phase === "closingFly") {
      if (!target || !origin) { onClosed(); return; }
      Promise.all([
        run(flyerRef.current, [px(target), px(origin)], { duration: FLY_MS, easing: EASE_OUT }),
        run(flyBookRef.current, [{ transform: "none" }, { transform: origin.transform }], { duration: FLY_MS, easing: EASE_OUT }),
        run(backdropRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: FLY_MS, easing: "ease-in" }),
      ]).then(() => { if (!cancelled) onClosed(); });
    }
    // Finished animations hold their end state (fill: both) until the next phase takes over.
    return () => { cancelled = true; };
  }, [phase, originRef, onClosed]);

  // ─── the page in motion (driven directly on the DOM, one frame at a time) ───
  const motion = useRef<{
    idx: number;          // which leaf
    angle: number;        // where it is now
    vel: number;          // degrees per second
    target: number;       // where the spring pulls it
    dragging: boolean;
    start: number;        // the side it set off from (0 or -180)
    bend: number;         // current extra turn at the free edge (degrees, signed)
    sounded: boolean;     // page sound already played for this turn
    raf: number;
    last: number;
  } | null>(null);
  const stripRefs = useRef<(HTMLDivElement | null)[][]>([]);

  /** Draw leaf idx at angle, curved by bend (the free edge turns bend degrees further). */
  const paint = (idx: number, angle: number, bend = 0) => {
    const el = leafRefs.current[idx];
    if (!el) return;
    const lift = Math.sin((Math.abs(angle) * Math.PI) / 180);
    el.style.transform = `rotateY(${angle}deg)`;
    el.style.setProperty("--lift", lift.toFixed(3));
    const strips = stripRefs.current[idx];
    if (strips) {
      // Spread the bend so it grows toward the edge: a smooth arc, flat at the spine.
      let cum = 0;
      for (let i = 0; i < STRIPS; i++) {
        const d = (bend * (2 * i + 1)) / (STRIPS * STRIPS);
        cum += d;
        const st = strips[i];
        if (!st) continue;
        st.style.transform = `rotateY(${d.toFixed(3)}deg)`;
        // Light falls off as each strip turns away from flat, so shading follows the curve.
        const a = Math.abs(angle + cum);
        st.style.setProperty("--s", Math.sin((Math.min(180, a) * Math.PI) / 180).toFixed(3));
      }
    }
    if (shadowR.current) shadowR.current.style.opacity = angle > -90 ? (lift * 0.9).toFixed(3) : "0";
    if (shadowL.current) shadowL.current.style.opacity = angle <= -90 ? (lift * 0.9).toFixed(3) : "0";
  };

  /** Snap the moving page to rest and hand control back to React. */
  const finish = useCallback(() => {
    const m = motion.current;
    if (!m) return;
    cancelAnimationFrame(m.raf);
    motion.current = null;
    const rest = m.target <= -90 ? -180 : 0;
    paint(m.idx, rest, 0);
    const el = leafRefs.current[m.idx];
    if (el) el.style.zIndex = String(zFor(m.idx, rest));
    if (shadowR.current) shadowR.current.style.opacity = "0";
    if (shadowL.current) shadowL.current.style.opacity = "0";
    const nowTurned = rest === -180 ? m.idx + 1 : m.idx;
    // Update the ref now, not after React re-renders: a fast second click starts its turn
    // in this same tick and must see the page that just landed.
    turnedRef.current = nowTurned;
    setTurned(nowTurned);
  }, []);

  const tick = useCallback((now: number) => {
    const m = motion.current;
    if (!m) return;
    const dt = Math.min(0.032, (now - m.last) / 1000 || 0.016);
    m.last = now;
    const acc = STIFFNESS * (m.target - m.angle) - DAMPING * m.vel;
    m.vel += acc * dt;
    m.angle = Math.max(-180, Math.min(0, m.angle + m.vel * dt));

    // How the paper curves: most at mid-turn, more when moving fast. Held by the edge
    // (dragging) the edge leads; swinging free it trails behind, like real paper in air.
    const p = Math.abs(m.angle) / 180;
    const speed = Math.min(1, Math.abs(m.vel) / 700);
    const heading = m.dragging ? (m.target < m.angle ? -1 : m.target > m.angle ? 1 : (m.start === 0 ? -1 : 1)) : Math.sign(m.vel) || (m.start === 0 ? -1 : 1);
    const lead = m.dragging ? 1 : -0.75;
    const want = BEND_MAX * Math.sin(Math.PI * p) * (0.45 + 0.55 * speed) * heading * lead;
    m.bend += (want - m.bend) * Math.min(1, dt * 14);
    paint(m.idx, m.angle, m.bend);

    // The page sound plays as the page goes over the top.
    if (!m.sounded && Math.abs(m.angle - m.start) > 70) {
      m.sounded = true;
      playPageTurn(speed);
    }
    if (!m.dragging && Math.abs(m.target - m.angle) < 0.3 && Math.abs(m.vel) < 8) { finish(); return; }
    m.raf = requestAnimationFrame(tick);
  }, [finish]);

  /** Start moving leaf idx from its resting side. */
  const begin = (idx: number, dragging: boolean, target: number) => {
    if (motion.current) finish(); // a page still landing finishes first
    const start = idx < turnedRef.current ? -180 : 0;
    const el = leafRefs.current[idx];
    if (el) el.style.zIndex = String(N + 2);
    motion.current = { idx, angle: start, vel: 0, target, dragging, start, bend: 0, sounded: false, raf: 0, last: performance.now() };
    motion.current.raf = requestAnimationFrame(tick);
  };

  /** Turn one page with no drag: tap, click or arrow key. */
  const turn = useCallback((dir: 1 | -1) => {
    if (phaseRef.current !== "open") return;
    if (motion.current) finish();
    const t = turnedRef.current;
    if (dir === 1 && t >= N) return;
    if (dir === -1 && t <= 0) return;
    const idx = dir === 1 ? t : t - 1;
    begin(idx, false, dir === 1 ? -180 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish, tick]);

  const drag = useRef<{ id: number; startX: number; idx: number; dir: 1 | -1; offset: number; spineX: number; w: number; moved: boolean; lastX: number; lastT: number; vx: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "open" || !spreadRef.current || e.button > 0) return;
    e.preventDefault(); // no native image drag or text selection
    if (motion.current) finish();
    const r = spreadRef.current.getBoundingClientRect();
    const spineX = r.left + r.width / 2;
    const w = r.width / 2;
    const t = turnedRef.current;
    const dir: 1 | -1 = e.clientX >= spineX ? 1 : -1;
    const idx = dir === 1 ? t : t - 1;
    if (idx < 0 || idx >= N) return;
    // Keep the grab point under the pointer: the page's edge follows it.
    const startAngle = dir === 1 ? 0 : -180;
    const edgeX = spineX + w * Math.cos((startAngle * Math.PI) / 180);
    drag.current = { id: e.pointerId, startX: e.clientX, idx, dir, offset: edgeX - e.clientX, spineX, w, moved: false, lastX: e.clientX, lastT: performance.now(), vx: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const now = performance.now();
    d.vx = d.vx * 0.5 + ((e.clientX - d.lastX) / Math.max(1, now - d.lastT)) * 0.5; // px per ms
    d.lastX = e.clientX;
    d.lastT = now;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < 6) return;
      d.moved = true;
      begin(d.idx, true, d.dir === 1 ? 0 : -180);
    }
    const x = Math.max(-1, Math.min(1, (e.clientX + d.offset - d.spineX) / d.w));
    if (motion.current) motion.current.target = (-Math.acos(x) * 180) / Math.PI;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) { if (e.type === "pointerup") turn(d.dir); return; } // a tap turns the page
    const m = motion.current;
    if (!m) return;
    // A flick decides; otherwise whichever side of the spine the page is on.
    // (A pointer that stopped before letting go isn't flicking.)
    const vx = performance.now() - d.lastT > 80 ? 0 : d.vx;
    const target = vx < -0.35 ? -180 : vx > 0.35 ? 0 : m.angle < -90 ? -180 : 0;
    m.dragging = false;
    m.target = target;
    m.vel += vx * 400; // carry the flick into the fall
  };

  useEffect(() => {
    preloadPageSounds();
    return () => { if (motion.current) cancelAnimationFrame(motion.current.raf); };
  }, []);

  const requestClose = useCallback(() => {
    if (phaseRef.current !== "open") return;
    if (motion.current) finish();
    setPhase("closingCover");
  }, [finish]);

  // Lock scroll, keyboard, and give focus back to the hero book afterwards.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
      if (e.key === "ArrowRight") turn(1);
      if (e.key === "ArrowLeft") turn(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [requestClose, turn]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const showSpread = phase === "open" || phase === "cover" || phase === "closingCover";
  const showFlyer = phase !== "open";
  const chromeOn = phase === "open";
  const pageLabel = turned === 0 ? "page 1" : turned === N ? `page ${N * 2}` : `pages ${turned * 2}–${turned * 2 + 1}`;

  return (
    <div className={`${s.overlay} ${s.vars} ${dmDisplay.variable}`} role="dialog" aria-modal="true" aria-label={`${dest} photo book preview`} onClick={requestClose}>
      <div ref={backdropRef} className={s.backdrop} aria-hidden="true" />

      <div className={`${s.overlayTop} ${chromeOn ? s.chromeOn : s.chromeOff}`} onClick={stop}>
        <p className={`${s.overlayHello} ${handClass}`}>was {dest} fun?</p>
        <div className={s.overlayBtns}>
          <button type="button" className={s.ghost} aria-label={muted ? "Turn page sounds on" : "Turn page sounds off"} aria-pressed={!muted} onClick={toggleSound}>
            {muted ? (
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
            ) : (
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
            )}
          </button>
          <button ref={closeRef} type="button" className={s.ghost} aria-label="Close preview" onClick={requestClose}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      <div className={s.spreadWrap} onClick={stop}>
        <div
          ref={spreadRef}
          className={s.spread}
          style={{ opacity: showSpread ? 1 : 0 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* inside the covers */}
          <div className={`${s.base} ${s.baseL}`} style={{ visibility: phase === "open" ? "visible" : "hidden" }} />
          <div ref={rightBaseRef} className={`${s.base} ${s.baseR}`} />

          {LEAVES.map((leaf, i) => {
            const rest = i < turned ? -180 : 0;
            return (
              <div
                key={i}
                ref={(el) => { leafRefs.current[i] = el; }}
                className={s.leaf}
                style={{
                  transform: `rotateY(${rest}deg)`,
                  zIndex: zFor(i, rest),
                  // Pages already turned close up with the cover: the cover's inside hides
                  // them as the close starts, so they mustn't be left behind on the left.
                  visibility: phase !== "open" && i < turned ? "hidden" : undefined,
                }}
              >
                {i >= turned - 2 && i <= turned + 1 ? (
                  // Pages that can move (and the ones next in line): strips that bend.
                  <Strip leafIdx={i} at={0} front={leaf.front} back={leaf.back} refs={stripRefs} />
                ) : (
                  <>
                    <div className={`${s.face} ${s.faceFront}`}>
                      <BookPage page={leaf.front} side="right" />
                      <span aria-hidden="true" className={s.shade} />
                    </div>
                    {leaf.back && (
                      <div className={`${s.face} ${s.faceBack}`}>
                        <BookPage page={leaf.back} side="left" />
                        <span aria-hidden="true" className={`${s.shade} ${s.shadeL}`} />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* the lifted page's shadow on the page beneath */}
          <div ref={shadowL} aria-hidden="true" className={`${s.castShadow} ${s.castShadowL}`} style={{ zIndex: N + 1 }} />
          <div ref={shadowR} aria-hidden="true" className={`${s.castShadow} ${s.castShadowR}`} style={{ zIndex: N + 1 }} />
        </div>

        <div className={`${s.turnBar} ${chromeOn ? s.chromeOn : s.chromeOff}`}>
          <button type="button" className={s.turnBtn} aria-label="Previous page" disabled={turned === 0} onClick={() => turn(-1)}>←</button>
          <p className={s.turnHint} aria-live="polite">
            <span className={s.srOnly}>{pageLabel} of {N * 2}. </span>
            drag or tap a page to turn it
          </p>
          <button type="button" className={s.turnBtn} aria-label="Next page" disabled={turned === N} onClick={() => turn(1)}>→</button>
        </div>
      </div>

      <Link href={href} className={`${s.cta} ${s.ctaSmall} ${chromeOn ? s.chromeOn : s.chromeOff}`} onClick={stop}>
        <span>start my {dest} book</span>
        <span aria-hidden="true" className={s.ctaArrow}>→</span>
      </Link>

      {/* the closed book in flight; its cover is a hinge that swings open onto the left */}
      {showFlyer && (
        <div ref={flyerRef} className={s.flyer} aria-hidden="true">
          <div ref={flyBookRef} className={s.flyBook}>
            <div className={s.flySpine} style={{ background: spine }} />
            <div
              ref={flyCoverRef}
              className={s.flyCover}
              style={{ transform: phase === "closingCover" ? "rotateY(-180deg)" : undefined }}
            >
              <div className={s.flyFront}>
                <CountryCover country={coverSlug} title={dest} spine={false} style={{ boxShadow: "none", borderRadius: "inherit", width: "100%", height: "100%" }} />
                <div className={s.cloth} />
                <div className={s.sheen} />
              </div>
              <div className={`${s.flyBack} ${s.endpaper}`}>
                <div className={s.gutterR} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One vertical strip of a bendable page, hinged to the previous strip, with the next
 * strip nested inside it. Each face shows its slice of the page (the back face shows
 * the matching slice of the page on the other side).
 */
function Strip({ leafIdx, at, front, back, refs }: {
  leafIdx: number;
  at: number;
  front: (typeof LEAVES)[number]["front"];
  back: (typeof LEAVES)[number]["back"];
  refs: React.RefObject<(HTMLDivElement | null)[][]>;
}) {
  return (
    <div
      className={`${s.strip} ${at === 0 ? s.stripFirst : ""}`}
      ref={(el) => { (refs.current[leafIdx] ??= [])[at] = el; }}
    >
      <div className={s.stripFace}>
        <div className={s.stripPage} style={{ left: `calc(${-at * 100}% + ${at}px)` }}>
          <BookPage page={front} side="right" />
        </div>
        <span aria-hidden="true" className={s.stripShade} />
      </div>
      {back && (
        <div className={`${s.stripFace} ${s.stripBack}`}>
          <div className={s.stripPage} style={{ left: `calc(${-(STRIPS - 1 - at) * 100}% + ${STRIPS - 1 - at}px)` }}>
            <BookPage page={back} side="left" />
          </div>
          <span aria-hidden="true" className={s.stripShade} />
        </div>
      )}
      {at + 1 < STRIPS && <Strip leafIdx={leafIdx} at={at + 1} front={front} back={back} refs={refs} />}
    </div>
  );
}
