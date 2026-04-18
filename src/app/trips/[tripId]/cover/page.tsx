"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FlowTopbar from "@/components/layout/FlowTopbar";
import FlowBottomBar from "@/components/layout/FlowBottomBar";
import CoverRenderer from "@/components/covers/CoverRenderer";
import { TEMPLATES, ArchIllustration, SunIllustration, RidgeIllustration } from "@/lib/covers/templates";
import { PAIRINGS, type CoverPairing } from "@/lib/covers/palette";
import { sanitizeCoverTitle, sanitizeCoverSubtitle } from "@/lib/covers/text-utils";
import { suggestTemplate } from "@/lib/covers/suggest";
import { getTrip, getBook, saveCoverConfig, updateTrip } from "@/lib/api";
import type { CoverTemplate } from "@/lib/covers/types";

const GRAIN = "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E";

const TEMPLATE_LIST = Object.values(TEMPLATES);
const ILLUSTRATION_MAP: Record<string, React.ComponentType<{ accentColor: string; backgroundColor: string }>> = {
  archway: ArchIllustration,
  "rising-sun": SunIllustration,
  ridgeline: RidgeIllustration,
};

export default function CoverPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? null;
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_LIST[0].id);
  const [selectedPaletteId, setSelectedPaletteId] = useState(TEMPLATE_LIST[0].paletteId);
  const [userPickedStyle, setUserPickedStyle] = useState(false);
  const [suggestToast, setSuggestToast] = useState(false);
  const [inferred, setInferred] = useState<{ place: string; coordStr: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const template: CoverTemplate = TEMPLATES[selectedTemplateId] ?? TEMPLATE_LIST[0];
  const pairing: CoverPairing = PAIRINGS[selectedPaletteId] ?? Object.values(PAIRINGS)[0];
  const compatiblePairings = template.compatiblePalettes.map((id) => PAIRINGS[id]).filter(Boolean);

  const coverTitle = sanitizeCoverTitle(destination);
  const coverSubtitle = sanitizeCoverSubtitle(subtitle);

  useEffect(() => {
    const run = async () => {
      try {
        // Read inferred location from sessionStorage (set by upload page)
        const raw = sessionStorage.getItem("atlaso_inferred");
        if (raw) {
          const inf = JSON.parse(raw);
          setInferred(inf);
          if (!userPickedStyle && inf.place) {
            const suggestion = suggestTemplate(inf.place.toLowerCase());
            setSelectedTemplateId(suggestion.templateId);
            setSelectedPaletteId(suggestion.paletteId);
            setSuggestToast(true);
          }
        }

        if (bookId) {
          // With bookId: editing existing cover from preview page
          const [trip, book] = await Promise.all([getTrip(tripId), getBook(bookId)]);
          setDestination(book.title || trip.name || "");
          setSubtitle(book.subtitle || "");
          if (book.coverTemplateId && TEMPLATES[book.coverTemplateId]) {
            setSelectedTemplateId(book.coverTemplateId);
            setSelectedPaletteId(book.coverPaletteId || TEMPLATES[book.coverTemplateId].paletteId);
            setUserPickedStyle(true);
          }
        } else {
          // Without bookId: first-time design before generation
          const trip = await getTrip(tripId);
          const tripName = (trip.name && trip.name !== "Untitled Trip") ? trip.name : "";
          if (raw) {
            const inf = JSON.parse(raw);
            setDestination(inf.place?.split(",")[0]?.trim() || tripName);
          } else {
            setDestination(tripName);
          }
          // Check localStorage for existing prefs (if user came back)
          const prefsRaw = localStorage.getItem("atlaso_cover_prefs");
          if (prefsRaw) {
            const prefs = JSON.parse(prefsRaw);
            if (prefs.title) setDestination(prefs.title);
            if (prefs.subtitle) setSubtitle(prefs.subtitle);
            if (prefs.templateId && TEMPLATES[prefs.templateId]) {
              setSelectedTemplateId(prefs.templateId);
              setSelectedPaletteId(prefs.paletteId || TEMPLATES[prefs.templateId].paletteId);
              setUserPickedStyle(true);
              setSuggestToast(false);
            }
          }
        }
      } catch {
        setError("Could not load your trip. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, bookId]);

  const handleDestChange = useCallback((val: string) => {
    setDestination(val);
    if (!userPickedStyle) {
      const sug = suggestTemplate(val.toLowerCase().trim());
      if (TEMPLATES[sug.templateId]) {
        setSelectedTemplateId(sug.templateId);
        setSelectedPaletteId(sug.paletteId);
      }
    }
  }, [userPickedStyle]);

  const showSaved = () => {
    setSavedIndicator(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedIndicator(false), 2000);
  };

  const handleSelectTemplate = (id: string) => {
    setUserPickedStyle(true);
    setSuggestToast(false);
    const tmpl = TEMPLATES[id];
    const newPalette = tmpl.compatiblePalettes.includes(selectedPaletteId) ? selectedPaletteId : tmpl.paletteId;
    setSelectedTemplateId(id);
    setSelectedPaletteId(newPalette);
  };

  const handleSelectPalette = (id: string) => {
    setUserPickedStyle(true);
    setSuggestToast(false);
    setSelectedPaletteId(id);
  };

  // When bookId exists, auto-save on changes
  useEffect(() => {
    if (!bookId || loading) return;
    const t = setTimeout(async () => {
      try {
        await saveCoverConfig(bookId, selectedTemplateId, selectedPaletteId);
        showSaved();
      } catch { /* silent */ }
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, selectedTemplateId, selectedPaletteId]);

  const handleGenerate = async () => {
    setSaving(true);
    setError(null);
    try {
      const title = sanitizeCoverTitle(destination) || "TRIP";
      // Update trip name now so book.title is set correctly at generation time
      await updateTrip(tripId, title, title);
      localStorage.setItem("atlaso_cover_prefs", JSON.stringify({
        title,
        subtitle: coverSubtitle,
        templateId: selectedTemplateId,
        paletteId: selectedPaletteId,
      }));
      router.push(`/trips/${tripId}/generating`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveThenPreview = async () => {
    if (!bookId) return;
    setSaving(true);
    try {
      await saveCoverConfig(bookId, selectedTemplateId, selectedPaletteId);
      router.push(`/trips/${tripId}/preview?bookId=${bookId}`);
    } catch {
      setError("Could not save cover.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingBottom: 100, fontFamily: "var(--font-inter-tight, 'Inter Tight'), sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, opacity: 0.15, mixBlendMode: "multiply", backgroundImage: `url("${GRAIN}")` }} />

      <FlowTopbar
        currentStep={2}
        rightSlot={
          <a href="#" onClick={(e) => { e.preventDefault(); router.push(`/trips/${tripId}/upload`); }}
            style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            ← Back to photos
          </a>
        }
      />

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <div style={{ width: 32, height: 32, border: "2px solid rgba(10,26,58,0.12)", borderTopColor: "var(--blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "start" }}>

          {/* LEFT: Controls */}
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 500, color: "var(--blue)", marginBottom: 14 }}>Step 2 of 4</div>
            <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 44, fontWeight: 300, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 12, color: "var(--ink)" }}>
              Name your <span style={{ fontStyle: "italic", color: "var(--blue)" }}>trip</span>, design its cover.
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-soft)", marginBottom: 36, lineHeight: 1.5 }}>
              This is the first thing you'll see when you open your book. Every keystroke shows up on the right.
            </p>

            {suggestToast && inferred && (
              <div style={{
                marginBottom: 20, padding: "10px 14px",
                background: "rgba(30,82,212,0.06)", border: "1px solid rgba(30,82,212,0.2)",
                borderRadius: 8, fontSize: 12, color: "var(--blue)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>✨ We picked a style for {inferred.place.split(",")[0]} — feel free to change it</span>
                <button onClick={() => setSuggestToast(false)} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", marginLeft: "auto", opacity: 0.7, fontSize: 16, padding: 0 }}>×</button>
              </div>
            )}

            {error && <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 16 }}>{error}</p>}

            {/* Destination */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 500, color: "var(--ink-soft)", marginBottom: 10 }}>
                <span>Destination</span>
                <span style={{ opacity: 0.6 }}>{destination.length} / 12</span>
              </div>
              <input
                value={destination}
                onChange={(e) => handleDestChange(e.target.value)}
                maxLength={12}
                placeholder="LISBON"
                style={{
                  width: "100%", padding: "14px 16px", fontSize: 17,
                  border: "1px solid rgba(10,26,58,0.15)", borderRadius: 10,
                  background: "#ffffff", fontFamily: "inherit", color: "var(--ink)",
                  textTransform: "uppercase", outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--blue)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,82,212,0.12)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(10,26,58,0.15)"; e.target.style.boxShadow = "none"; }}
              />
              {inferred && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--blue)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", background: "rgba(30,82,212,0.08)", borderRadius: 100, fontSize: 11 }}>Detected from photos</span>
                  {inferred.coordStr}
                </div>
              )}
            </div>

            {/* Subtitle */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 500, color: "var(--ink-soft)", marginBottom: 10 }}>
                <span>Subtitle</span>
                <span style={{ opacity: 0.6 }}>{subtitle.length} / 40</span>
              </div>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={40}
                placeholder="a week in spring, 2025"
                style={{
                  width: "100%", padding: "14px 16px", fontSize: 15,
                  border: "1px solid rgba(10,26,58,0.15)", borderRadius: 10,
                  background: "#ffffff", fontFamily: "inherit", color: "var(--ink)",
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--blue)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,82,212,0.12)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(10,26,58,0.15)"; e.target.style.boxShadow = "none"; }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", fontFamily: "var(--font-fraunces), serif" }}>
                Try a date range, a mood, or a short tagline
              </div>
            </div>

            {/* Template selector */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 500, color: "var(--ink-soft)", marginBottom: 14 }}>Template style</div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "thin" }}>
                {TEMPLATE_LIST.map((tmpl) => {
                  const tmplPairing = PAIRINGS[tmpl.compatiblePalettes.includes(selectedPaletteId) ? selectedPaletteId : tmpl.paletteId];
                  const isActive = tmpl.id === selectedTemplateId;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl.id)}
                      style={{
                        flexShrink: 0, width: 68, height: 90,
                        borderRadius: 4, border: `2px solid ${isActive ? "var(--blue)" : "transparent"}`,
                        cursor: "pointer", overflow: "hidden",
                        transition: "transform 0.15s, border-color 0.15s",
                        transform: "translateY(0)",
                        padding: 0, background: "none",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
                    >
                      <CoverRenderer
                        template={tmpl}
                        pairing={tmplPairing}
                        title={coverTitle || "TRIP"}
                        subtitle=""
                        mode="preview"
                        style={{ width: "100%", height: "100%", display: "block" }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Palette selector */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 500, color: "var(--ink-soft)", marginBottom: 14 }}>Color pairing</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {compatiblePairings.map((p) => {
                  const isActive = p.id === selectedPaletteId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPalette(p.id)}
                      title={p.name}
                      style={{
                        display: "flex", cursor: "pointer",
                        borderRadius: 50, border: `2px solid ${isActive ? "var(--blue)" : "transparent"}`,
                        padding: 2,
                        transition: "transform 0.15s, border-color 0.15s",
                        background: "none",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: p.background, flexShrink: 0 }} />
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: p.accent, marginLeft: -8, border: "2px solid white", flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div style={{ position: "sticky", top: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
            {savedIndicator && (
              <div style={{ position: "absolute", top: -32, fontSize: 12, color: "var(--blue)", opacity: savedIndicator ? 1 : 0, transition: "opacity 0.3s" }}>
                Saved
              </div>
            )}
            <div
              style={{ filter: "drop-shadow(0 20px 50px rgba(10,26,58,0.2))", transition: "transform 0.4s cubic-bezier(0.2,0.8,0.2,1)", cursor: "default" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px) rotate(-1deg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; }}
            >
              <CoverRenderer
                template={template}
                pairing={pairing}
                title={coverTitle}
                subtitle={coverSubtitle}
                mode="preview"
                style={{ width: 360, height: 480, display: "block", borderRadius: 2 }}
              />
            </div>
            <div style={{ marginTop: 24, fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic", fontFamily: "var(--font-fraunces), serif", textAlign: "center" }}>
              Live preview · updates as you type
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 24, padding: "14px 20px", background: "#ffffff", borderRadius: 12, border: "1px solid rgba(10,26,58,0.08)" }}>
              {[["Size", "8 × 10 inch"], ["Paper", "Archival matte"], ["Print", "300 dpi"]].map(([lbl, val]) => (
                <div key={lbl} style={{ fontSize: 12, textAlign: "center" }}>
                  <div style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontSize: 10, color: "var(--ink-soft)", marginBottom: 4 }}>{lbl}</div>
                  <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500, fontSize: 14 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <FlowBottomBar
        leftContent={
          !bookId ? (
            <span>Next: we'll use AI to generate your photobook — <strong style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--ink)", fontWeight: 500 }}>you'll need to sign in to save it</strong></span>
          ) : null
        }
        rightButton={
          <button
            onClick={bookId ? handleSaveThenPreview : handleGenerate}
            disabled={saving || loading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 26px",
              background: saving || loading ? "rgba(10,26,58,0.25)" : "var(--ink)",
              color: "#ffffff", border: "none", borderRadius: 100,
              fontWeight: 500, fontSize: 14,
              cursor: saving || loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {bookId ? (saving ? "Saving…" : "Continue →") : (saving ? "Starting…" : "Generate my photobook")}
            {!saving && (
              <span style={{ width: 24, height: 24, background: "white", color: "var(--ink)", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>→</span>
            )}
          </button>
        }
      />
    </div>
  );
}
