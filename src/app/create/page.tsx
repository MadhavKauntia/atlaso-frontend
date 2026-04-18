"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import CoverRenderer from "@/components/covers/CoverRenderer";
import { TEMPLATES, ArchIllustration, SunIllustration, RidgeIllustration } from "@/lib/covers/templates";
import { PAIRINGS } from "@/lib/covers/palette";
import { sanitizeCoverTitle, sanitizeCoverSubtitle } from "@/lib/covers/text-utils";
import { suggestTemplate } from "@/lib/covers/suggest";
import { createTrip } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { CoverTemplate } from "@/lib/covers/types";
import type { CoverPairing } from "@/lib/covers/palette";

const TEMPLATE_LIST = Object.values(TEMPLATES);

const ILLUSTRATION_MAP: Record<string, React.ComponentType<{ accentColor: string; backgroundColor: string }>> = {
  archway: ArchIllustration,
  "rising-sun": SunIllustration,
  ridgeline: RidgeIllustration,
};

export default function CreatePage() {
  const ready = useRequireAuth();
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_LIST[0].id);
  const [selectedPaletteId, setSelectedPaletteId] = useState(TEMPLATE_LIST[0].paletteId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // tracks whether the user has manually picked a style (suppresses auto-suggest)
  const [userPickedStyle, setUserPickedStyle] = useState(false);

  const template: CoverTemplate = TEMPLATES[selectedTemplateId];
  const pairing: CoverPairing = PAIRINGS[selectedPaletteId];
  const compatiblePairings = template.compatiblePalettes.map((id) => PAIRINGS[id]).filter(Boolean);

  const coverTitle = sanitizeCoverTitle(destination);
  const coverSubtitle = sanitizeCoverSubtitle(subtitle);

  // Auto-suggest template when destination changes
  const handleDestinationChange = useCallback((value: string) => {
    setDestination(value);
    if (userPickedStyle) return;
    const suggestion = suggestTemplate(value.toLowerCase().trim());
    if (TEMPLATES[suggestion.templateId]) {
      setSelectedTemplateId(suggestion.templateId);
      setSelectedPaletteId(suggestion.paletteId);
    }
  }, [userPickedStyle]);

  function handleSelectTemplate(id: string) {
    setUserPickedStyle(true);
    const tmpl = TEMPLATES[id];
    const newPaletteId = tmpl.compatiblePalettes.includes(selectedPaletteId)
      ? selectedPaletteId
      : tmpl.paletteId;
    setSelectedTemplateId(id);
    setSelectedPaletteId(newPaletteId);
  }

  function handleSelectPalette(id: string) {
    setUserPickedStyle(true);
    setSelectedPaletteId(id);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const trip = await createTrip(destination.trim(), destination.trim());
      // persist cover prefs so generating page can apply them after book creation
      localStorage.setItem(
        "atlaso_cover_prefs",
        JSON.stringify({ templateId: selectedTemplateId, paletteId: selectedPaletteId })
      );
      router.push(`/trips/${trip.id}/upload`);
    } catch {
      setError("Failed to create trip. Is the backend running?");
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <AppShell maxWidth="100%">
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{
            fontFamily: "var(--font-fraunces), serif",
            fontSize: 32,
            fontWeight: 300,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            marginBottom: 8,
            lineHeight: 1.1,
          }}>
            Design your cover
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
            Pick a style for your photobook. You can change it later.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "row", gap: 48, alignItems: "flex-start" }}>

            {/* Left: controls */}
            <div style={{ flex: "0 0 320px", display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Destination input */}
              <div>
                <label style={{
                  display: "block", fontSize: 11, textTransform: "uppercase",
                  letterSpacing: "0.12em", color: "var(--ink-soft)", marginBottom: 8, fontWeight: 500,
                }}>
                  Destination <span style={{ color: "var(--blue)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  placeholder="Lisbon, Portugal"
                  required
                  maxLength={100}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid rgba(10,26,58,0.2)",
                    borderRadius: 10,
                    fontSize: 15,
                    background: "var(--white)",
                    color: "var(--ink)",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Subtitle */}
              <div>
                <label style={{
                  display: "block", fontSize: 11, textTransform: "uppercase",
                  letterSpacing: "0.12em", color: "var(--ink-soft)", marginBottom: 8, fontWeight: 500,
                }}>
                  Description <span style={{ opacity: 0.5, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="a week in spring"
                  maxLength={40}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid rgba(10,26,58,0.2)",
                    borderRadius: 10,
                    fontSize: 15,
                    background: "var(--white)",
                    color: "var(--ink)",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Template selector */}
              <div>
                <label style={{
                  display: "block", fontSize: 11, textTransform: "uppercase",
                  letterSpacing: "0.12em", color: "var(--ink-soft)", marginBottom: 10, fontWeight: 500,
                }}>
                  Style
                </label>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                  {TEMPLATE_LIST.map((tmpl) => {
                    const tmplPairing = PAIRINGS[
                      tmpl.compatiblePalettes.includes(selectedPaletteId)
                        ? selectedPaletteId
                        : tmpl.paletteId
                    ];
                    const isActive = tmpl.id === selectedTemplateId;
                    const Illustration = ILLUSTRATION_MAP[tmpl.id];
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tmpl.id)}
                        style={{
                          flexShrink: 0,
                          width: 80,
                          height: 107,
                          padding: 0,
                          border: isActive ? "2px solid var(--ink)" : "1px solid rgba(10,26,58,0.15)",
                          borderRadius: 8,
                          overflow: "hidden",
                          cursor: "pointer",
                          transform: isActive ? "scale(1.04)" : "scale(1)",
                          transition: "transform 150ms ease, border-color 150ms ease",
                          background: "none",
                          outline: "none",
                        }}
                        title={tmpl.name}
                      >
                        <CoverRenderer
                          template={tmpl}
                          pairing={tmplPairing}
                          title={coverTitle || tmpl.name.toUpperCase()}
                          subtitle=""
                          mode="preview"
                          className="w-full h-full"
                          style={{ width: "100%", height: "100%", display: "block" }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Palette selector */}
              <div>
                <label style={{
                  display: "block", fontSize: 11, textTransform: "uppercase",
                  letterSpacing: "0.12em", color: "var(--ink-soft)", marginBottom: 10, fontWeight: 500,
                }}>
                  Palette
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {compatiblePairings.map((p) => {
                    const isActive = p.id === selectedPaletteId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPalette(p.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          border: isActive ? "1.5px solid var(--ink)" : "1px solid rgba(10,26,58,0.18)",
                          borderRadius: 100,
                          background: isActive ? "rgba(10,26,58,0.04)" : "var(--white)",
                          cursor: "pointer",
                          transition: "border-color 150ms",
                          fontFamily: "inherit",
                        }}
                        title={p.name}
                      >
                        <span style={{ width: 14, height: 14, borderRadius: "50%", background: p.background, border: "1px solid rgba(10,26,58,0.1)", flexShrink: 0 }} />
                        <span style={{ width: 14, height: 14, borderRadius: "50%", background: p.accent, border: "1px solid rgba(10,26,58,0.1)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p>}

              <button
                type="submit"
                disabled={loading || !destination.trim()}
                style={{
                  padding: "14px 28px",
                  background: loading || !destination.trim() ? "rgba(10,26,58,0.25)" : "var(--ink)",
                  color: "var(--white)",
                  border: "none",
                  borderRadius: 100,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: loading || !destination.trim() ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.2s",
                  alignSelf: "flex-start",
                }}
              >
                {loading ? "Creating…" : "Continue to upload →"}
              </button>
            </div>

            {/* Right: live preview */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: "100%", maxWidth: 280 }}>
                <CoverRenderer
                  template={template}
                  pairing={pairing}
                  title={coverTitle}
                  subtitle={coverSubtitle}
                  mode="preview"
                  style={{ width: "100%", borderRadius: 12, boxShadow: "0 8px 40px rgba(10,26,58,0.15)" }}
                />
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", textAlign: "center" }}>
                Live preview
              </p>
            </div>

          </div>
        </form>
      </div>
    </AppShell>
  );
}
