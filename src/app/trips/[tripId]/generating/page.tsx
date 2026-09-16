"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateBook, regenerateBook, updateTrip, getBook, getPhotos, pollBookUntilReady, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { setTabText, flashTabDone, notify } from "@/lib/notify";
import FullPageLoader from "@/components/FullPageLoader";
import CountryCover from "@/components/covers/CountryCover";
import Brand from "@/components/Brand";
import Link from "next/link";

// Each photo gets its own vision call, fanned out across the backend's worker pool (32-wide
// on the upgraded OpenAI tier). Measured ~0.19s/photo for a 64-photo batch; we use 0.25 to
// under-promise. Selection + layout are sub-second now, so the fixed overhead is small and
// mostly covers request round-trip + the client's poll granularity.
const SECONDS_PER_PHOTO = 0.25;
const FIXED_OVERHEAD_SEC = 8;

/** Human-friendly estimate string, rounded to a comfortable number. */
function formatEstimate(sec: number): string {
  if (sec <= 90) return "about a minute";
  const mins = Math.round(sec / 60);
  if (mins < 10) return `about ${mins} minutes`;
  return `about ${Math.round(mins / 5) * 5} minutes`; // round to nearest 5 for long waits
}

// `at` is a fraction (0-1) of the estimated total, so the progress checkpoints
// stretch across the real duration instead of racing through in a minute.
const STEPS = [
  { label: "Analyzing your photos", at: 0.55 },
  { label: "Grouping by location and time", at: 0.72 },
  { label: "Selecting the strongest shots", at: 0.85 },
  { label: "Arranging spreads and pacing", at: 0.95 },
  { label: "Adding captions and finishing", at: Infinity },
];

const TIPS = [
  "Atlaso began with a woman who wanted to gift her boyfriend a photobook of their first trip together, and couldn't find one good enough.",
  "Frequent travellers tend to have a lower risk of dementia.",
  "Some of the oldest surviving photo albums of India are nearly 180 years old.",
  "We remember a printed photo far more vividly than one buried in a camera roll.",
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
  // Set when generation is blocked by the free-preview quota (HTTP 402) — a distinct state
  // from a transient failure, since there's nothing to "resume"; the user must place an order.
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  // Bumped by "Try again" to re-run the generation effect (resuming the existing book).
  const [retryKey, setRetryKey] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  // Estimated generation time (seconds), derived from the photo count.
  const [estimateSec, setEstimateSec] = useState<number | null>(null);
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

  // Estimate generation time from the photo count (one vision call per photo).
  // Regenerate reuses existing analysis, so it stays quick, no need to estimate.
  useEffect(() => {
    if (!ready || regenerateFrom) return;
    getPhotos(tripId)
      .then((photos) => setEstimateSec(FIXED_OVERHEAD_SEC + Math.round(photos.length * SECONDS_PER_PHOTO)))
      .catch(() => {});
  }, [ready, tripId, regenerateFrom]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (generationDoneAt.current === null) return;
    // Small floor so a fast generation doesn't flash this screen; lowered from 8s now that
    // generation typically finishes in ~10-15s on the upgraded OpenAI tier.
    if (elapsed < 5) return;
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
      // On a retry the book already exists and is still being built on the backend, so
      // resume polling it instead of kicking off a fresh generation from scratch.
      // Pass the cover country at creation so it's persisted server-side immediately — before the
      // worker finishes and the ready-email is sent. This makes the cover survive a cold load from
      // the email link even if the user leaves this tab.
      const book =
        bookRef.current ??
        (regenerateFrom
          ? await regenerateBook(regenerateFrom)
          : await generateBook(tripId, { country: prefs?.country, subtitle: prefs?.description || undefined }));
      bookRef.current = book;

      // Wait for the background worker to finish building the pages.
      await pollBookUntilReady(book.id);
      localStorage.removeItem("atlaso_cover_prefs");

      generationDoneAt.current = elapsed;
    };

    run().catch((err) => {
      // 402 = out of free previews: show the dedicated block screen, not the "retry" one.
      if (err instanceof ApiError && err.status === 402) setQuotaBlocked(true);
      else setError(err instanceof Error ? err.message : "Generation failed");
    });
  }, [ready, tripId, regenerateFrom, retryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <FullPageLoader />;

  const displayTitle = existingCover?.title || coverPrefs?.title || "your trip";
  const displayCountry = existingCover?.country ?? coverPrefs?.country ?? null;
  const displayDescription = existingCover?.subtitle ?? coverPrefs?.description ?? "";

  const estimateLabel = regenerateFrom
    ? "about a minute"
    : estimateSec != null
      ? formatEstimate(estimateSec)
      : "a few minutes";
  // Only tie the estimate to image count when it's actually count-derived (a fresh
  // generation with the count loaded), so the user understands a long wait = many photos.
  const hasCountEstimate = !regenerateFrom && estimateSec != null;
  const estimateSentence = hasCountEstimate
    ? `Based on the number of images you've uploaded, this usually takes ${estimateLabel}.`
    : `This usually takes ${estimateLabel}.`;
  // Total used to spread the progress checkpoints across the real duration.
  const totalSec = estimateSec ?? (regenerateFrom ? 60 : 90);
  const stepDoneAt = (i: number) => (STEPS[i].at === Infinity ? Infinity : STEPS[i].at * totalSec);

  if (quotaBlocked) {
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
        <div style={{ fontSize: 40 }}>📖</div>
        <h2 style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 24, fontWeight: 700, color: "var(--sb-cream)" }}>
          You&apos;ve used your free previews
        </h2>
        <p style={{ color: "var(--sb-muted)", fontSize: 15, maxWidth: 420, lineHeight: 1.6 }}>
          You&apos;ve created 3 free book previews. Order any of your books to unlock 3 more.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href="/account"
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
              textDecoration: "none",
            }}
          >
            View my trips
          </Link>
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
        <div style={{ fontSize: 32, color: "var(--sb-muted)" }}>⏳</div>
        <h2 style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 24, fontWeight: 700, color: "var(--sb-cream)" }}>
          This is taking a little longer
        </h2>
        <p style={{ color: "var(--sb-muted)", fontSize: 15, maxWidth: 400 }}>{error}</p>
        <p style={{ color: "var(--sb-cream)", fontSize: 15, maxWidth: 420, lineHeight: 1.6 }}>
          Don&apos;t worry, your photos are safe and your book is still being put together in the
          background. Tap <strong>Resume</strong> and we&apos;ll pick up right where we left off,
          never starting over.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => {
              setError(null);
              // Keep bookRef so run() resumes the existing book instead of regenerating.
              started.current = false;
              setElapsed(0);
              setRetryKey((k) => k + 1);
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
            Resume
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
            Our AI is reading every photo and laying out your book. {estimateSentence} You can leave this tab open and come back.
          </p>

          {/* Progress steps */}
          <div style={{ maxWidth: 380, margin: "0 auto", textAlign: "left" }}>
            {STEPS.map((step, i) => {
              const prevDoneAt = i === 0 ? 0 : stepDoneAt(i - 1);
              const done = elapsed >= stepDoneAt(i) || (generationDoneAt.current !== null && i < STEPS.length - 1);
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
                    <div style={{ fontSize: 12, opacity: 0.6 }}>done</div>
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
