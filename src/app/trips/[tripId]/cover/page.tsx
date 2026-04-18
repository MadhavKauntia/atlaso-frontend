"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import CoverEditor, { type CoverChangePayload } from "@/components/covers/CoverEditor";
import { getTrip, getBook, saveCoverConfig } from "@/lib/api";
import { suggestTemplate } from "@/lib/covers/suggest";
import { sanitizeCoverTitle, sanitizeCoverSubtitle } from "@/lib/covers/text-utils";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { Trip, Book } from "@/lib/api";

export default function CoverPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // latest cover payload, updated on every editor change
  const coverPayloadRef = useRef<CoverChangePayload | null>(null);

  useEffect(() => {
    if (!bookId) return;
    Promise.all([getTrip(tripId), getBook(bookId)])
      .then(([t, b]) => {
        setTrip(t);
        setBook(b);
        if (t.destination) {
          const result = suggestTemplate(t.destination);
          // only suggest if the book doesn't already have a cover configured
          if (!b.coverTemplateId) {
            setSuggestion(t.destination);
            coverPayloadRef.current = {
              templateId: result.templateId,
              paletteId: result.paletteId,
              title: sanitizeCoverTitle(t.destination),
              subtitle: b.subtitle ? sanitizeCoverSubtitle(b.subtitle) : "",
            };
          }
        }
      })
      .catch(() => setError("Could not load your book"))
      .finally(() => setLoading(false));
  }, [tripId, bookId]);

  const handleCoverChange = useCallback((payload: CoverChangePayload) => {
    coverPayloadRef.current = payload;
    setSuggestion(null); // user has interacted — dismiss the suggestion toast
  }, []);

  const handleContinue = async () => {
    const payload = coverPayloadRef.current;
    if (!payload || !bookId) return;
    setSaving(true);
    setError(null);
    try {
      await saveCoverConfig(bookId, payload.templateId, payload.paletteId);
      router.push(`/trips/${tripId}/preview?bookId=${bookId}`);
    } catch {
      setError("Could not save your cover. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return null;

  const initialTitle = trip?.destination
    ? sanitizeCoverTitle(trip.destination)
    : "";
  const initialSubtitle = book?.subtitle
    ? sanitizeCoverSubtitle(book.subtitle)
    : "";

  const suggestion_ = suggestion
    ? suggestTemplate(suggestion)
    : null;

  return (
    <AppShell>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => router.push(`/trips/${tripId}/preview?bookId=${bookId}`)}
            style={{
              background: "none",
              border: "none",
              color: "var(--ink-soft)",
              fontSize: 14,
              cursor: "pointer",
              padding: 0,
              marginBottom: 16,
              fontFamily: "inherit",
            }}
          >
            ← Back to preview
          </button>
          <h1 style={{
            fontFamily: "var(--font-fraunces), serif",
            fontSize: 28,
            fontWeight: 400,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}>
            Design your cover
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 6 }}>
            Customise the style, palette, and text. Changes preview instantly.
          </p>
        </div>

        {/* Suggestion toast */}
        {suggestion && suggestion_ && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "var(--blue, #1A3A6B)",
            color: "#fff",
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 24,
          }}>
            <span>
              We picked a style for {suggestion} — feel free to change it.
            </span>
            <button
              onClick={() => setSuggestion(null)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16, padding: 0, marginLeft: "auto" }}
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 16 }}>{error}</p>
        )}

        {loading ? (
          <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            <CoverEditor
              initialTitle={initialTitle}
              initialSubtitle={initialSubtitle}
              volumeNumber={book?.version}
              coordinates={suggestion_ ? undefined : undefined}
              onCoverChange={handleCoverChange}
            />

            {/* Footer actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32, gap: 12 }}>
              <button
                onClick={() => router.push(`/trips/${tripId}/preview?bookId=${bookId}`)}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid rgba(10,26,58,0.25)",
                  borderRadius: 100,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Skip
              </button>
              <button
                onClick={handleContinue}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  background: saving ? "rgba(10,26,58,0.3)" : "var(--ink)",
                  color: "var(--white)",
                  border: "none",
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Saving…" : "Continue →"}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
