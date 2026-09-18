"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * First-visit spotlight tour for the preview page. Dims the screen and punches a
 * hole around each real editing control in turn (Layout, Replace, reframe drag,
 * Move-to-swap), with a caption card beside it.
 *
 * It locates the live controls by their `data-onboard` marker, scoped to the
 * currently visible spread (`[data-spread-visible="true"]`). A body class forces
 * those normally hover-only buttons to stay visible while the tour is running so
 * they show through the spotlight cutout.
 */

type StepKey = "layout" | "replace" | "reposition" | "swap";

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
    key: "swap",
    title: "Swap two photos",
    body: "Grab the Move handle and drop it onto another photo to trade their spots.",
  },
];

const CARD_W = 288;
const CARD_H_EST = 176;
const PAD = 8; // spotlight padding around the target
const GAP = 18; // gap between spotlight and card

type Rect = { top: number; left: number; width: number; height: number };

function measureTarget(key: StepKey): Rect | null {
  const el = document.querySelector(
    `[data-spread-visible="true"] [data-onboard="${key}"]`
  ) as HTMLElement | null;
  if (!el) return null;
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

export default function PreviewOnboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState<Rect | null>(null);
  const rafRef = useRef<number>(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const remeasure = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    // Wait a frame so the spread switch + force-visible class have applied.
    rafRef.current = requestAnimationFrame(() => setSpot(measureTarget(STEPS[step].key)));
  }, [step]);

  // Keep the tour flagged on the body so the hover-only controls stay visible.
  useEffect(() => {
    document.body.classList.add("preview-onboarding-active");
    return () => document.body.classList.remove("preview-onboarding-active");
  }, []);

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure]);

  useEffect(() => {
    const onChange = () => remeasure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
      cancelAnimationFrame(rafRef.current);
    };
  }, [remeasure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (isLast) onClose();
        else setStep((s) => Math.min(STEPS.length - 1, s + 1));
      } else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isLast, onClose]);

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
          Tip {step + 1} of {STEPS.length}
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
            {STEPS.map((s, i) => (
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
        body.preview-onboarding-active [data-spread-visible="true"] [data-onboard="swap"] {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
