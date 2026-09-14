"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateBook, regenerateBook, saveCoverCountry, updateTrip, getBook, pollBookUntilReady } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { setTabText, flashTabDone, notify } from "@/lib/notify";
import FullPageLoader from "@/components/FullPageLoader";
import CountryCover from "@/components/covers/CountryCover";
import Brand from "@/components/Brand";
import Link from "next/link";

const STEPS = [
  { label: "Analyzing your photos", doneAt: 12 },
  { label: "Grouping by location and time", doneAt: 22 },
  { label: "Selecting the strongest shots", doneAt: 38 },
  { label: "Arranging spreads and pacing", doneAt: 58 },
  { label: "Adding captions and finishing", doneAt: Infinity },
];

const TIPS = [
  "Every Atlaso book is printed on high-quality photo paper and hard-bound like a proper coffee-table book.",
  "Your cover prints at high resolution with a clean bleed to guarantee perfect edges.",
  "We colour-calibrate every book individually before it leaves our studio.",
  "Books are 6.9 × 9.8 inches with 50 lay-flat pages, so spreads open completely.",
  "Printed in Bengaluru and delivered across India in about a week.",
];

interface CoverPrefs {
  title: string;
  country: string;
  description: string;
}

export default function GeneratingPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const regenerateFrom = searchParams.get("regenerateFrom");

  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [coverPrefs, setCoverPrefs] = useState<CoverPrefs | null>(null);
  // On regenerate, cover prefs aren't in localStorage — show the existing book's cover.
  const [existingCover, setExistingCover] = useState<{ country: string | null; title: string; subtitle: string } | null>(null);
  const started = useRef(false);
  const generationDoneAt = useRef<number | null>(null);
  const bookRef = useRef<{ id: string } | null>(null);
  const notifiedDone = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("atlaso_cover_prefs");
      if (raw) setCoverPrefs(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Regenerating: fetch the existing book so the animation shows its real cover.
  useEffect(() => {
    if (!regenerateFrom) return;
    getBook(regenerateFrom)
      .then((b) => setExistingCover({ country: b.coverCountry, title: b.title, subtitle: b.subtitle ?? "" }))
      .catch(() => {});
  }, [regenerateFrom]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (generationDoneAt.current === null) return;
    if (elapsed < 8) return;
    const book = bookRef.current;
    if (!book) return;
    router.push(`/trips/${tripId}/preview?bookId=${book.id}`);
  }, [elapsed, tripId, router]);

  // Tab-title badge while building, and a nudge when the book is ready.
  useEffect(() => {
    if (!started.current) return;
    if (generationDoneAt.current !== null) {
      if (!notifiedDone.current) {
        notifiedDone.current = true;
        setTabText(null);
        flashTabDone("Photobook ready");
        notify("Your photobook is ready", "Come back to review and order it.");
      }
    } else if (!error) {
      setTabText("Designing your book…");
    }
  }, [elapsed, error]);

  // Reset any tab badge when leaving the page.
  useEffect(() => () => setTabText(null), []);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    const run = async () => {
      let prefs: CoverPrefs | null = null;
      try {
        const raw = localStorage.getItem("atlaso_cover_prefs");
        if (raw) prefs = JSON.parse(raw);
      } catch {
        /* ignore parse errors */
      }

      try {
        if (prefs?.title) await updateTrip(tripId, prefs.title, prefs.description || undefined);
      } catch {
        /* best-effort */
      }

      // Generation is async: this returns quickly with a book in GENERATING status.
      const book = regenerateFrom ? await regenerateBook(regenerateFrom) : await generateBook(tripId);
      bookRef.current = book;

      // Wait for the background worker to finish building the pages.
      await pollBookUntilReady(book.id);

      // Save cover config only after the book is ready, so it can't race the worker.
      if (prefs?.country) {
        await saveCoverCountry(book.id, prefs.country, prefs.description || undefined);
      }
      localStorage.removeItem("atlaso_cover_prefs");

      generationDoneAt.current = elapsed;
    };

    run().catch((err) => setError(err instanceof Error ? err.message : "Generation failed"));
  }, [ready, tripId, regenerateFrom]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <FullPageLoader />;

  const displayTitle = existingCover?.title || coverPrefs?.title || "your trip";
  const displayCountry = existingCover?.country ?? coverPrefs?.country ?? null;
  const displayDescription = existingCover?.subtitle ?? coverPrefs?.description ?? "";

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--sb-bg)",
          color: "var(--sb-cream)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 40,
          textAlign: "center",
          fontFamily: "var(--font-dm-sans), sans-serif",
        }}
      >
        <div style={{ fontSize: 32, color: "var(--sb-muted)" }}>✕</div>
        <h2 style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 24, fontWeight: 700, color: "var(--sb-cream)" }}>
          Something went wrong
        </h2>
        <p style={{ color: "var(--sb-muted)", fontSize: 15, maxWidth: 400 }}>{error}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => {
              setError(null);
              started.current = false;
              setElapsed(0);
            }}
            style={{
              padding: "13px 24px",
              background: "var(--sb-red)",
              color: "var(--sb-cream)",
              border: "none",
              borderRadius: 999,
              fontSize: 15,
              fontFamily: "var(--font-bricolage), sans-serif",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <Link
            href={`/trips/${tripId}/upload`}
            style={{
              padding: "13px 24px",
              background: "transparent",
              color: "var(--sb-cream)",
              border: "1px solid #5a5249",
              borderRadius: 999,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "var(--font-dm-sans), sans-serif",
              textDecoration: "none",
            }}
          >
            ← back to photos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--sb-bg)",
        color: "var(--sb-cream)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          padding: "14px clamp(16px, 3vw, 34px)",
          borderBottom: "1px solid #ece5d8",
          background: "#fff",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Brand height={26} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          {/* Floating book */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
            <div style={{ animation: "bookFloat 4s ease-in-out infinite" }}>
              <CountryCover country={displayCountry} title={displayTitle} description={displayDescription} style={{ width: 210 }} />
            </div>
          </div>

          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontWeight: 700,
              color: "var(--sb-gold)",
              marginBottom: 14,
            }}
          >
            Crafting your book
          </div>

          <h1
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 38,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              marginBottom: 12,
              color: "var(--sb-cream)",
            }}
          >
            Building <span style={{ color: "var(--sb-gold)" }}>{displayTitle}</span>.
          </h1>

          <p style={{ fontSize: 15, color: "var(--sb-muted)", maxWidth: 420, margin: "0 auto 44px", lineHeight: 1.6 }}>
            Our AI is laying out your photos into a beautiful spread. This usually takes about a minute.
          </p>

          {/* Progress steps */}
          <div style={{ maxWidth: 380, margin: "0 auto", textAlign: "left" }}>
            {STEPS.map((step, i) => {
              const prevDoneAt = i === 0 ? 0 : STEPS[i - 1].doneAt;
              const done = elapsed >= step.doneAt || (generationDoneAt.current !== null && i < STEPS.length - 1);
              const active = !done && elapsed >= prevDoneAt;
              const color = done ? "var(--sb-cream)" : active ? "var(--sb-gold)" : "#6b6156";

              return (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", fontSize: 14, color, transition: "color 0.4s" }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: done ? "none" : `1.5px solid ${color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                      position: "relative",
                      background: done ? "var(--sb-green)" : "transparent",
                      color: done ? "#fff" : color,
                    }}
                  >
                    {done ? "✓" : null}
                    {active && (
                      <div
                        style={{
                          position: "absolute",
                          inset: -3,
                          borderRadius: "50%",
                          border: "2px solid var(--sb-gold)",
                          borderRightColor: "transparent",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>{step.label}</div>
                  {done && i < STEPS.length - 1 && (
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{step.doneAt}s</div>
                  )}
                  {active && <div style={{ fontSize: 12, opacity: 0.6 }}>in progress</div>}
                </div>
              );
            })}
          </div>

          {/* Did you know */}
          <div
            style={{
              marginTop: 56,
              padding: "16px 24px",
              background: "var(--sb-panel)",
              borderRadius: 12,
              fontSize: 13,
              color: "var(--sb-muted)",
              maxWidth: 440,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.55,
            }}
          >
            <strong style={{ color: "var(--sb-cream)", fontWeight: 700 }}>Did you know?</strong> {TIPS[tipIndex]}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bookFloat {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-10px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
