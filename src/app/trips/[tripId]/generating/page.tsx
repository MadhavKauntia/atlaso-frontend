"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateBook, regenerateBook, saveCoverConfig, updateTrip } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import CoverRenderer from "@/components/covers/CoverRenderer";
import { TEMPLATES } from "@/lib/covers/templates";
import { PAIRINGS } from "@/lib/covers/palette";
import Link from "next/link";

const STEPS = [
  { label: "Analyzing your photos", doneAt: 12 },
  { label: "Grouping by location and time", doneAt: 22 },
  { label: "Selecting the strongest shots", doneAt: 38 },
  { label: "Arranging spreads and pacing", doneAt: 58 },
  { label: "Adding captions and finishing", doneAt: Infinity },
];

const TIPS = [
  "Every Atlaso book is printed on archival matte paper rated for 100+ years — the same grade museums use.",
  "Your cover will print at 300 dpi with a 3mm bleed to guarantee perfect edges.",
  "We color-calibrate every book individually before it leaves our studio.",
  "92% of customers finish their book in under 10 minutes.",
  "Books are printed in Bengaluru and ship via DHL Express to 80+ countries.",
];

const DEFAULT_TEMPLATE_ID = "archway";
const DEFAULT_PAIRING_ID = "lisbon-sun";

export default function GeneratingPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const regenerateFrom = searchParams.get("regenerateFrom");

  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [coverPrefs, setCoverPrefs] = useState<{
    title: string; subtitle: string; templateId: string; paletteId: string;
  } | null>(null);
  const started = useRef(false);
  const generationDoneAt = useRef<number | null>(null);
  const bookRef = useRef<{ id: string } | null>(null);

  // Load cover prefs from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("atlaso_cover_prefs");
      if (raw) setCoverPrefs(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Tip rotation every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Redirect when generation done AND minimum 8s elapsed
  useEffect(() => {
    if (generationDoneAt.current === null) return;
    if (elapsed < 8) return;
    const book = bookRef.current;
    if (!book) return;
    router.push(`/trips/${tripId}/preview?bookId=${book.id}`);
  }, [elapsed, tripId, router]);

  // Start generation
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    const run = async () => {
      let prefs: { title: string; subtitle: string; templateId: string; paletteId: string } | null = null;
      try {
        const raw = localStorage.getItem("atlaso_cover_prefs");
        if (raw) prefs = JSON.parse(raw);
      } catch { /* ignore parse errors */ }

      // Update trip name from cover prefs before generating
      try {
        if (prefs?.title) await updateTrip(tripId, prefs.title, prefs.subtitle || undefined);
      } catch { /* best-effort */ }

      const book = regenerateFrom
        ? await regenerateBook(regenerateFrom)
        : await generateBook(tripId);

      // Save cover config — not best-effort, we want this to succeed
      if (prefs?.templateId && prefs?.paletteId) {
        await saveCoverConfig(book.id, prefs.templateId, prefs.paletteId);
        localStorage.removeItem("atlaso_cover_prefs");
      }

      bookRef.current = book;
      generationDoneAt.current = elapsed;
    };

    run().catch((err) => setError(err instanceof Error ? err.message : "Generation failed"));
  }, [ready, tripId, regenerateFrom]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;

  const template = TEMPLATES[coverPrefs?.templateId ?? DEFAULT_TEMPLATE_ID] ?? TEMPLATES[DEFAULT_TEMPLATE_ID];
  const pairing = PAIRINGS[coverPrefs?.paletteId ?? DEFAULT_PAIRING_ID] ?? PAIRINGS[DEFAULT_PAIRING_ID];
  const displayTitle = coverPrefs?.title || "Your Trip";
  const displaySubtitle = coverPrefs?.subtitle || "";

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 40,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 32, color: "var(--ink-soft)" }}>✕</div>
        <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 24, fontWeight: 400, color: "var(--ink)" }}>
          Something went wrong
        </h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 15, maxWidth: 400 }}>{error}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => {
              setError(null);
              started.current = false;
              setElapsed(0);
            }}
            style={{
              padding: "12px 24px",
              background: "var(--blue)",
              color: "#fff",
              border: "none",
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>
          <Link
            href={`/trips/${tripId}/upload`}
            style={{
              padding: "12px 24px",
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid rgba(10,26,58,0.18)",
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 400,
              cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "none",
            }}
          >
            ← Back to photos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--paper)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100,
        opacity: 0.15,
        mixBlendMode: "multiply",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E")`,
      }} />

      {/* Ambient gradients */}
      <div style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: -1,
        background: `
          radial-gradient(ellipse 70% 50% at 85% 15%, rgba(168,197,238,0.4), transparent 60%),
          radial-gradient(ellipse 60% 40% at 10% 90%, rgba(111,163,232,0.25), transparent 60%)
        `,
      }} />

      {/* Topbar */}
      <div style={{
        padding: "24px 48px",
        borderBottom: "1px solid rgba(10,26,58,0.08)",
        background: "#fff",
        display: "flex",
        alignItems: "center",
      }}>
        <Link href="/" style={{
          fontFamily: "var(--font-fraunces), serif",
          fontWeight: 800,
          fontSize: 22,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ink)",
          textDecoration: "none",
        }}>
          <span style={{
            width: 9, height: 9,
            background: "var(--blue)",
            borderRadius: "50%",
            display: "inline-block",
            flexShrink: 0,
          }} />
          Atlaso
        </Link>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
      }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>

          {/* Floating book */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 48,
            perspective: 800,
          }}>
            <div style={{
              filter: "drop-shadow(0 24px 60px rgba(10,26,58,0.25))",
              animation: "bookFloat 4s ease-in-out infinite",
            }}>
              <CoverRenderer
                template={template}
                pairing={pairing}
                title={displayTitle}
                subtitle={displaySubtitle}
                style={{ width: 220, height: 293, display: "block", borderRadius: 2 }}
              />
            </div>
          </div>

          {/* Heading */}
          <div style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            fontWeight: 500,
            color: "var(--blue)",
            marginBottom: 14,
          }}>
            Crafting your book
          </div>

          <h1 style={{
            fontFamily: "var(--font-fraunces), serif",
            fontSize: 38,
            fontWeight: 300,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: 12,
            color: "var(--ink)",
          }}>
            Building{" "}
            <em style={{ fontStyle: "italic", color: "var(--blue)" }}>{displayTitle}</em>.
          </h1>

          <p style={{
            fontSize: 15,
            color: "var(--ink-soft)",
            maxWidth: 420,
            margin: "0 auto 44px",
            lineHeight: 1.55,
          }}>
            Our AI is laying out your photos into a beautiful spread. This usually takes about a minute.
          </p>

          {/* Progress steps */}
          <div style={{ maxWidth: 380, margin: "0 auto", textAlign: "left" }}>
            {STEPS.map((step, i) => {
              const prevDoneAt = i === 0 ? 0 : STEPS[i - 1].doneAt;
              const done = elapsed >= step.doneAt || (generationDoneAt.current !== null && i < STEPS.length - 1);
              const active = !done && elapsed >= prevDoneAt;
              const color = done ? "var(--ink)" : active ? "var(--blue)" : "rgba(10,26,58,0.35)";

              return (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 0",
                  fontSize: 14,
                  color,
                  transition: "color 0.4s",
                }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `1.5px solid ${color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    flexShrink: 0,
                    position: "relative",
                    background: done ? "var(--ink)" : "transparent",
                    color: done ? "#fff" : color,
                  }}>
                    {done ? "✓" : null}
                    {active && (
                      <div style={{
                        position: "absolute",
                        inset: -3,
                        borderRadius: "50%",
                        border: "2px solid var(--blue)",
                        borderRightColor: "transparent",
                        animation: "spin 1s linear infinite",
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>{step.label}</div>
                  {done && i < STEPS.length - 1 && (
                    <div style={{
                      fontSize: 12,
                      opacity: 0.6,
                      fontFamily: "var(--font-fraunces), serif",
                      fontStyle: "italic",
                    }}>
                      {step.doneAt}s
                    </div>
                  )}
                  {active && (
                    <div style={{
                      fontSize: 12,
                      opacity: 0.6,
                      fontFamily: "var(--font-fraunces), serif",
                      fontStyle: "italic",
                    }}>
                      in progress
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Did you know */}
          <div style={{
            marginTop: 56,
            padding: "16px 24px",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid rgba(10,26,58,0.08)",
            fontSize: 13,
            color: "var(--ink-soft)",
            maxWidth: 440,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.55,
          }}>
            <strong style={{
              fontFamily: "var(--font-fraunces), serif",
              color: "var(--ink)",
              fontWeight: 500,
            }}>Did you know?</strong>{" "}
            {TIPS[tipIndex]}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bookFloat {
          0%, 100% { transform: translateY(0) rotateY(-8deg); }
          50% { transform: translateY(-10px) rotateY(-4deg); }
        }
      `}</style>
    </div>
  );
}
