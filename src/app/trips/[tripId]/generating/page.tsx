"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateBook, regenerateBook, saveCoverConfig } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const PHASES = [
  { upTo: 5, label: "Analysing your photos…" },
  { upTo: 15, label: "Finding the best moments…" },
  { upTo: 30, label: "Curating your story…" },
  { upTo: Infinity, label: "Almost there…" },
];

export default function GeneratingPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const regenerateFrom = searchParams.get("regenerateFrom");

  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const phase = PHASES.find((p) => elapsed < p.upTo)?.label ?? "Almost there…";

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = regenerateFrom
      ? regenerateBook(regenerateFrom)
      : generateBook(tripId);

    run
      .then(async (book) => {
        try {
          const raw = localStorage.getItem("atlaso_cover_prefs");
          if (raw) {
            const { templateId, paletteId } = JSON.parse(raw);
            await saveCoverConfig(book.id, templateId, paletteId);
            localStorage.removeItem("atlaso_cover_prefs");
          }
        } catch {
          // cover prefs are best-effort; don't block navigation
        }
        router.push(`/trips/${tripId}/preview?bookId=${book.id}`);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Generation failed"));
  }, [tripId, regenerateFrom, router]);

  if (!ready) return null;

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
        <div style={{ fontSize: 32 }}>✕</div>
        <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 24, fontWeight: 400, color: "var(--ink)" }}>
          Generation failed
        </h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 15, maxWidth: 400 }}>{error}</p>
        <button
          onClick={() => router.push(`/trips/${tripId}/upload`)}
          style={{
            padding: "12px 24px",
            background: "var(--ink)",
            color: "var(--white)",
            border: "none",
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Back to photos
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--paper)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 32,
      padding: 40,
    }}>
      {/* Spinner */}
      <div style={{
        width: 56,
        height: 56,
        border: "2.5px solid rgba(10,26,58,0.12)",
        borderTopColor: "var(--blue)",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />

      {/* Phase label */}
      <div style={{ textAlign: "center" }}>
        <h2 style={{
          fontFamily: "var(--font-fraunces), serif",
          fontSize: 28,
          fontWeight: 300,
          color: "var(--ink)",
          letterSpacing: "-0.02em",
          marginBottom: 10,
          transition: "opacity 0.5s",
        }}>
          {phase}
        </h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
          This usually takes under a minute
        </p>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 8 }}>
        {PHASES.slice(0, -1).map((p, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: elapsed >= (i === 0 ? 0 : PHASES[i - 1].upTo) ? "var(--blue)" : "rgba(10,26,58,0.15)",
              transition: "background 0.5s",
            }}
          />
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
