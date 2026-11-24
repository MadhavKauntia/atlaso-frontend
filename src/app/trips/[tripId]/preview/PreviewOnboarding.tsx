"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * First-visit spotlight tour for the preview page. Dims the screen and punches a
 * hole around each real editing control in turn (Layout, Replace, reframe drag,
 * Move-to-swap), with a caption card beside it.
 *
 * It locates the live controls by their `data-onboard` marker, scoped to the
 * currently visible spread (`[data-spread-visible="true"]`), except page-level
 * targets (the swap-pages button and the rail) which are looked up page-wide. A body class forces
 * those normally hover-only buttons to stay visible while the tour is running so
 * they show through the spotlight cutout.
 */

type StepKey = "layout" | "replace" | "reposition" | "rotate" | "zoom" | "swap" | "reset" | "swap-pages" | "rearrange";

/** Targets that live outside the visible spread (looked up page-wide). */
const PAGE_LEVEL: ReadonlySet<StepKey> = new Set<StepKey>(["swap-pages", "rearrange"]);

const STEPS: { key: StepKey; title: string; body: string }[] = [
  {
    key: "layout",
    title: "Change the layout",
    body: "Hit Layout to rearrange how many photos sit on a page and how they are framed.",
  },
  {
    key: "replace",
    title: "Replace a photo",
    body: "Not the right shot? Hit Replace to pick any other photo from your trip.",
  },
  {
    key: "reposition",
    title: "Drag to reframe",
    body: "Click and drag directly on a photo to move what shows inside the frame.",
  },
  {
    key: "rotate",
    title: "Rotate a photo",
    body: "Hit the rotate button to turn a sideways photo upright, 90° at a time.",
  },
  {
    key: "zoom",
    title: "Zoom in on a photo",
    body: "Use the − / + control to zoom into a photo, then drag to reframe the closer crop.",
  },
  {
    key: "swap",
    title: "Swap two photos",
    body: "Grab the Move handle and drop it onto another photo to trade their spots.",
  },
  {
    key: "reset",
    title: "Reset the framing",
    body: "Changed your mind? Reset restores the photo's original crop, zoom and rotation.",
  },
  {
    key: "swap-pages",
    title: "Swap facing pages",
    body: "Hit this button in the middle of the book to flip the left and right pages. It shows whenever you hover the book.",
  },
  {
    key: "rearrange",
    title: "Rearrange spreads",
    body: "Drag any two-page spread in this panel to move it to a different spot in your book.",
  },
];

// The left panel (and so the rearrange tip) is hidden at phone widths; mirrors globals.css.
const RAIL_VISIBLE_QUERY = "(min-width: 769px)";

const CARD_W = 288;
const CARD_H_EST = 176;
const PAD = 8; // spotlight padding around the target
const GAP = 18; // gap between spotlight and card

type Rect = { top: number; left: number; width: number; height: number };

function measureTarget(key: StepKey): Rect | null {
  const selector = PAGE_LEVEL.has(key)
    ? `[data-onboard="${key}"]`
    : `[data-spread-visible="true"] [data-onboard="${key}"]`;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  // The rail may be scrolled past its first spread; bring the target into view (a no-op when it
  // already is). The resulting scroll event re-measures, so the spotlight lands on it.
  if (PAGE_LEVEL.has(key)) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Place the card beside the spotlight, choosing the side with the most room. */
function placeCard(spot: Rect): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampTop = (t: number) => Math.max(16, Math.min(t, vh - CARD_H_EST - 16));
  const clampLeft = (l: number) => Math.max(16, Math.min(l, vw - CARD_W - 16));
  const midY = spot.top + spot.height / 2 - CARD_H_EST / 2;

  // Prefer right, then left, then below, then above.
  if (spot.left + spot.width + GAP + CARD_W <= vw - 16) {
    return { left: spot.left + spot.width + GAP, top: clampTop(midY) };
  }
  if (spot.left - GAP - CARD_W >= 16) {
    return { left: spot.left - GAP - CARD_W, top: clampTop(midY) };
  }
  const midX = spot.left + spot.width / 2 - CARD_W / 2;
  if (spot.top + spot.height + GAP + CARD_H_EST <= vh - 16) {
    return { left: clampLeft(midX), top: spot.top + spot.height + GAP };
  }
  return { left: clampLeft(midX), top: Math.max(16, spot.top - GAP - CARD_H_EST) };
}

export default function PreviewOnboarding({ onClose, includeSwapPages, includeRearrange }: {
  onClose: () => void;
  /** The tour's spread has two facing pages, so the swap-pages button exists. */
  includeSwapPages: boolean;
  /** The book has at least two draggable spreads. Also needs the left panel on screen. */
  includeRearrange: boolean;
}) {
  // Decided once when the tour opens, so the step count can't change mid-tour.
  const [steps] = useState(() => STEPS.filter((s) =>
    s.key === "swap-pages" ? includeSwapPages
    : s.key === "rearrange" ? includeRearrange && window.matchMedia(RAIL_VISIBLE_QUERY).matches
    : true
  ));
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState<Rect | null>(null);
  const rafRef = useRef<number>(0);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  // Measure the current step's target. Retries across a few frames because on
  // first load the target spread may not have mounted its DOM yet (the page
  // grows its mounted-spread window in a passive effect after the tour opens).
  const remeasure = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    let attempts = 0;
    const tick = () => {
      const r = measureTarget(steps[step].key);
      if (r || attempts >= 12) {
        setSpot(r);
        return;
      }
      attempts += 1;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [step, steps]);

  // Keep the tour flagged on the body so the hover-only controls stay visible.
  useEffect(() => {
    document.body.classList.add("preview-onboarding-active");
    return () => document.body.classList.remove("preview-onboarding-active");
  }, []);

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure]);

  // Track viewport changes. This effect re-subscribes whenever `remeasure`
  // changes (i.e. per step); its cleanup must NOT touch `rafRef`, or it would
  // cancel the measurement the layout effect just scheduled and freeze the
  // spotlight on the previous step's target.
  useEffect(() => {
    const onChange = () => remeasure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [remeasure]);

  // Cancel any pending measurement only when the tour actually closes.
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (isLast) onClose();
        else setStep((s) => Math.min(steps.length - 1, s + 1));
      } else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isLast, onClose, steps.length]);

  const next = () => (isLast ? onClose() : setStep((s) => s + 1));

  const card = spot
    ? placeCard(spot)
    : { left: window.innerWidth / 2 - CARD_W / 2, top: window.innerHeight / 2 - CARD_H_EST / 2 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, fontFamily: "var(--font-dm-sans)" }}>
      {/* Transparent catcher so the page underneath can't be clicked mid-tour
          (e.g. a rail thumbnail switching the spread out from under the spotlight). */}
      <div style={{ position: "fixed", inset: 0 }} onMouseDown={(e) => e.preventDefault()} />

      {/* Spotlight: a transparent window with a huge dark box-shadow dimming the rest.
          When no target is found we fall back to a plain full-screen dim. */}
      {spot ? (
        <div
          style={{
            position: "fixed",
            top: spot.top - PAD,
            left: spot.left - PAD,
            width: spot.width + PAD * 2,
            height: spot.height + PAD * 2,
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(20,17,15,0.74)",
            outline: "2px solid var(--sb-gold)",
            outlineOffset: 2,
            pointerEvents: "none",
            transition: "top 0.28s ease, left 0.28s ease, width 0.28s ease, height 0.28s ease",
          }}
        />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,15,0.74)" }} />
      )}

      {/* Caption card */}
      <div
        style={{
          position: "fixed",
          left: card.left,
          top: card.top,
          width: CARD_W,
          background: "var(--sb-panel)",
          border: "1px solid #46403a",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
          color: "var(--sb-cream)",
          transition: "left 0.28s ease, top 0.28s ease",
        }}
      >
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            fontWeight: 800,
            color: "var(--sb-gold)",
            marginBottom: 8,
          }}
        >
          Tip {step + 1} of {steps.length}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.01em" }}>
          {current.title}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--sb-muted)", margin: 0 }}>
          {current.body}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 18,
          }}
        >
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {steps.map((s, i) => (
              <span
                key={s.key}
                style={{
                  width: i === step ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i === step ? "var(--sb-gold)" : "#5a5249",
                  transition: "width 0.2s, background 0.2s",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--sb-muted)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "8px 6px",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                background: "var(--sb-gold)",
                color: "var(--sb-bg)",
                border: "none",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                padding: "9px 18px",
                fontFamily: "var(--font-bricolage)",
              }}
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 12,
            background: "transparent",
            border: "none",
            color: "#7c7267",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          Skip tour
        </button>
      </div>

      <style>{`
        body.preview-onboarding-active [data-spread-visible="true"] [data-onboard="layout"],
        body.preview-onboarding-active [data-spread-visible="true"] [data-onboard="replace"],
        body.preview-onboarding-active [data-spread-visible="true"] [data-onboard="swap"],
        /* The framing pill holds the rotate/zoom/reset spotlight targets; force the whole pill visible
           so those children (which can't out-opacity a transparent parent) show through the cutout. */
        body.preview-onboarding-active [data-spread-visible="true"] .slot-controls,
        /* The swap-pages button is hover-only; keep it visible for its tip. */
        body.preview-onboarding-active .spread-swap-btn {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
