"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FlowTopbar from "@/components/layout/FlowTopbar";
import FlowBottomBar from "@/components/layout/FlowBottomBar";
import CountryCover from "@/components/covers/CountryCover";
import { COUNTRIES, getCountry, stampUrl, PALETTE, inkFor, type CoverCategory } from "@/lib/covers/countries";
import { capitalizeFirstLetter } from "@/lib/covers/text-utils";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { getToken, setToken } from "@/lib/auth";
import { googleAuth, getTrip, getBook, saveCoverCountry, claimTrip } from "@/lib/api";

/** How many designs to show per category before the "Show all" toggle. */
const GRID_CAP = 8;

/** Best-effort: preselect a country when we inferred a place from the photos. */
function matchCountry(...hints: (string | undefined)[]): string | null {
  const hay = hints.filter(Boolean).join(" ").toLowerCase();
  if (!hay) return null;
  const hit = COUNTRIES.find((c) => hay.includes(c.name.toLowerCase()) || hay.includes(c.slug));
  return hit?.slug ?? null;
}

export default function CoverPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? null;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string | null>(null); // background override → book.coverPaletteId
  const [category, setCategory] = useState<CoverCategory>("destination");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [inferred, setInferred] = useState<{ place: string; country?: string; coordStr: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Whether the user has typed their own title (preserved across country switches).
  const titleCustom = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search spans ALL designs (never capped); otherwise show the active category,
  // capped to GRID_CAP until "Show all". The selected design is floated to the
  // front so it's always visible even when collapsed.
  const q = query.trim().toLowerCase();
  let base = q
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q))
    : COUNTRIES.filter((c) => c.category === category);
  if (!q && country) {
    base = [...base].sort((a, b) => (a.slug === country ? -1 : b.slug === country ? 1 : 0));
  }
  const collapsed = !q && !showAll && base.length > GRID_CAP;
  const visible = collapsed ? base.slice(0, GRID_CAP) : base;

  useEffect(() => {
    const run = async () => {
      try {
        const raw = sessionStorage.getItem(`atlaso_inferred_${tripId}`);
        let inf: { place: string; country?: string; coordStr: string } | null = null;
        if (raw) {
          inf = JSON.parse(raw);
          setInferred(inf);
        }

        if (bookId) {
          const [trip, book] = await Promise.all([getTrip(tripId), getBook(bookId)]);
          const pickedCountry = book.coverCountry || matchCountry(inf?.country, inf?.place);
          setCountry(pickedCountry);
          setBgColor(book.coverPaletteId || null);
          setCategory(getCountry(pickedCountry)?.category ?? "destination");
          setDescription(book.subtitle || "");
          // Never surface the "Untitled Trip" placeholder as an editable value; fall back
          // to the country name (like a fresh cover) so a blank/never-set title auto-heals.
          const real = book.title && book.title !== "Untitled Trip"
            ? book.title
            : (trip.name && trip.name !== "Untitled Trip" ? trip.name : "");
          if (real) {
            setTitle(real);
            titleCustom.current = true;
          } else {
            setTitle(getCountry(pickedCountry)?.name || "");
            titleCustom.current = false;
          }
        } else {
          const trip = await getTrip(tripId);
          const tripName = trip.name && trip.name !== "Untitled Trip" ? trip.name : "";

          const prefsRaw = localStorage.getItem("atlaso_cover_prefs");
          const prefs = prefsRaw ? JSON.parse(prefsRaw) : {};

          const pickedCountry = prefs.country || matchCountry(inf?.country, inf?.place);
          setCountry(pickedCountry);
          setBgColor(prefs.bg || null);
          setCategory(getCountry(pickedCountry)?.category ?? "destination");
          setDescription(prefs.description || "");
          // A saved/trip title is treated as custom; otherwise default to the country.
          const custom = prefs.title || tripName;
          if (custom) {
            setTitle(custom);
            titleCustom.current = true;
          } else {
            setTitle(getCountry(pickedCountry)?.name || "");
            titleCustom.current = false;
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

  // Preload every stamp once so switching covers is instant (no flash/delay
  // while the newly-selected stamp downloads).
  useEffect(() => {
    COUNTRIES.forEach((c) => {
      const url = stampUrl(c);
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, []);

  const selectCountry = (slug: string) => {
    setCountry(slug);
    setBgColor(null); // a new design resets to its own default background
    // Only fill the title from the country when the user hasn't typed their own.
    if (!titleCustom.current) setTitle(getCountry(slug)?.name || "");
  };

  const onTitleChange = (val: string) => {
    setTitle(val);
    // A non-empty value is the user's custom title; clearing it re-enables the
    // country default on the next country pick.
    titleCustom.current = val.trim().length > 0;
  };

  const showSaved = () => {
    setSavedIndicator(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedIndicator(false), 2000);
  };

  // Auto-save when editing an existing book.
  useEffect(() => {
    if (!bookId || loading || !country) return;
    const t = setTimeout(async () => {
      try {
        await saveCoverCountry(bookId, country, description, capitalizeFirstLetter(title), bgColor);
        showSaved();
      } catch {
        /* silent */
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, country, description, title, bgColor]);

  const persistPrefs = () => {
    localStorage.setItem(
      "atlaso_cover_prefs",
      JSON.stringify({ title: capitalizeFirstLetter(title), country: country ?? "", description: description.trim(), bg: bgColor ?? "" })
    );
  };

  const handleGenerate = async () => {
    persistPrefs();
    if (!getToken()) {
      setShowLoginModal(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await claimTrip(tripId);
      router.push(`/trips/${tripId}/generating`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLoginSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setSaving(true);
    setShowLoginModal(false);
    setError(null);
    try {
      const { token } = await googleAuth(response.credential);
      setToken(token);
      await claimTrip(tripId);
      router.push(`/trips/${tripId}/generating`);
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveThenPreview = async () => {
    if (!bookId) return;
    setSaving(true);
    try {
      if (country) await saveCoverCountry(bookId, country, description, capitalizeFirstLetter(title), bgColor);
      router.push(`/trips/${tripId}/preview?bookId=${bookId}`);
    } catch {
      setError("Could not save cover.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-dm-sans), sans-serif",
    fontSize: 15,
    color: "var(--sb-cream)",
    background: "var(--sb-bg)",
    border: "1px solid var(--sb-panel-2)",
    borderRadius: 12,
    padding: "13px 16px",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 700,
    color: "var(--sb-muted-2)",
    marginBottom: 10,
  };

  const segBtn = (active: boolean): React.CSSProperties => ({
    border: "none",
    background: active ? "var(--sb-gold)" : "transparent",
    color: active ? "var(--sb-ink)" : "var(--sb-muted)",
    fontFamily: "var(--font-dm-sans), sans-serif",
    fontWeight: 700,
    fontSize: 13,
    padding: "8px 18px",
    borderRadius: 999,
    cursor: "pointer",
    transition: "all 140ms ease",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--sb-bg)",
        color: "var(--sb-cream)",
        paddingBottom: 110,
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
      {showLoginModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,17,15,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            style={{
              background: "var(--sb-panel)",
              borderRadius: 20,
              padding: "44px 48px",
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--sb-cream)",
                marginBottom: 12,
                lineHeight: 1.1,
              }}
            >
              One last step
            </h2>
            <p style={{ fontSize: 14, color: "var(--sb-muted)", marginBottom: 32, lineHeight: 1.65 }}>
              Your photos and cover are ready. Sign in to generate your photobook. It takes one click.
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={() => {
                  setError("Sign-in failed. Please try again.");
                  setShowLoginModal(false);
                }}
                size="large"
                shape="pill"
                text="continue_with"
              />
            </div>
            <button
              onClick={() => setShowLoginModal(false)}
              style={{ background: "none", border: "none", fontSize: 13, color: "var(--sb-muted-2)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <FlowTopbar
        currentStep={2}
        rightSlot={
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              router.push(`/trips/${tripId}/upload`);
            }}
            style={{ fontSize: 13, color: "var(--sb-muted-2)", textDecoration: "none" }}
          >
            ← back to photos
          </a>
        }
      />

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "2px solid #46403a",
              borderTopColor: "var(--sb-gold)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="flow-cover-grid">
          {/* LEFT: Controls */}
          <div>
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
              Step 2 of 4
            </div>
            <h1
              className="flow-hero-h1"
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.035em",
                marginBottom: 12,
                color: "var(--sb-cream)",
              }}
            >
              name your book
            </h1>
            <p style={{ fontSize: 15, color: "var(--sb-muted)", marginBottom: 32, lineHeight: 1.6, maxWidth: "48ch" }}>
              Pick a cover design, choose a background, then give it a title and short description.
            </p>

            {error && <p style={{ color: "#ef8b7f", fontSize: 14, marginBottom: 16 }}>{error}</p>}

            {/* 1. Design picker */}
            <div style={{ marginBottom: 30 }}>
              <div style={fieldLabel}>1 · choose a design</div>
              <div style={{ display: "inline-flex", background: "var(--sb-panel)", borderRadius: 999, padding: 4, marginBottom: 14 }}>
                <button type="button" style={segBtn(category === "destination")} onClick={() => { setCategory("destination"); setShowAll(false); }}>
                  Destinations
                </button>
                <button type="button" style={segBtn(category === "theme")} onClick={() => { setCategory("theme"); setShowAll(false); }}>
                  Themes
                </button>
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all designs"
                aria-label="Search designs"
                style={{ ...inputStyle, marginBottom: 14 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {visible.map((c) => {
                  const on = country === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => selectCountry(c.slug)}
                      aria-pressed={on}
                      title={c.name}
                      style={{
                        cursor: "pointer",
                        padding: 0,
                        borderRadius: 12,
                        overflow: "hidden",
                        border: `2px solid ${on ? "var(--sb-gold)" : "transparent"}`,
                        background: "var(--sb-panel)",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <span style={{ aspectRatio: "1", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={stampUrl(c) ?? ""} alt="" style={{ width: "74%", height: "auto", filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.28))" }} />
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", padding: "6px 4px 8px", color: "var(--sb-cream)", background: "rgba(0,0,0,0.14)" }}>
                        {c.name}
                      </span>
                    </button>
                  );
                })}
                {visible.length === 0 && (
                  <span style={{ fontSize: 14, color: "var(--sb-muted-2)" }}>No designs match “{query}”.</span>
                )}
              </div>
              {(collapsed || (!q && showAll && base.length > GRID_CAP)) && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  style={{
                    marginTop: 12,
                    background: "none",
                    border: "1px solid var(--sb-panel-2)",
                    color: "var(--sb-cream)",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "9px 16px",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  {collapsed ? `Show all ${base.length} →` : "Show fewer"}
                </button>
              )}
            </div>

            {/* 2. Background */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ ...fieldLabel, display: "flex", justifyContent: "space-between" }}>
                <span>2 · background</span>
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.7 }}>
                  {country ? "tap a colour" : "pick a design first"}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {(() => {
                  const def = getCountry(country);
                  const swatches: { hex: string; isDefault: boolean }[] = def
                    ? [{ hex: def.bg, isDefault: true }, ...PALETTE.filter((c) => c.toLowerCase() !== def.bg.toLowerCase()).map((hex) => ({ hex, isDefault: false }))]
                    : PALETTE.map((hex) => ({ hex, isDefault: false }));
                  return swatches.map(({ hex, isDefault }) => {
                    const active = (isDefault && !bgColor) || (!!bgColor && bgColor.toLowerCase() === hex.toLowerCase());
                    return (
                      <button
                        key={hex + (isDefault ? "-d" : "")}
                        type="button"
                        disabled={!country}
                        title={isDefault ? "Default" : hex}
                        onClick={() => setBgColor(isDefault ? null : hex)}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: hex,
                          cursor: country ? "pointer" : "not-allowed",
                          opacity: country ? 1 : 0.4,
                          border: `2px solid ${active ? "var(--sb-gold)" : "rgba(255,255,255,0.14)"}`,
                          boxShadow: active ? "0 0 0 2px rgba(232,179,44,0.35)" : "none",
                          color: inkFor(hex),
                          fontWeight: 800,
                          fontSize: 15,
                        }}
                      >
                        {active ? "✓" : ""}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* 3. Details */}
            <div style={{ marginBottom: 8 }}>
              <div style={fieldLabel}>3 · details</div>
              <div style={{ background: "var(--sb-panel)", borderRadius: 16, padding: 18 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...fieldLabel, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>book title</span>
                    <span style={{ opacity: 0.7 }}>{title.length} / 40</span>
                  </div>
                  <input
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    onBlur={() => setTitle((t) => capitalizeFirstLetter(t))}
                    maxLength={40}
                    placeholder="Defaults to the design, edit to rename"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>
                      description <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.7 }}>(optional)</span>
                    </span>
                    <span style={{ opacity: 0.7 }}>{description.length} / 40</span>
                  </div>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={40}
                    placeholder="e.g. group trip 2025"
                    style={inputStyle}
                  />
                  {inferred && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--sb-gold)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ padding: "2px 8px", background: "rgba(232,179,44,0.12)", borderRadius: 100, fontSize: 11 }}>
                        detected from photos
                      </span>
                      {inferred.coordStr}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Preview — pinned to the viewport centre (see .flow-cover-preview) */}
          <div className="flow-cover-preview">
            {savedIndicator && <div style={{ marginBottom: 12, fontSize: 12, color: "var(--sb-gold)" }}>Saved</div>}
            <CountryCover
              country={country}
              title={title}
              description={description}
              bg={bgColor}
              style={{ width: 320, transform: "rotate(-2deg)" }}
            />
            <div style={{ marginTop: 24, fontSize: 13, color: "var(--sb-muted-2)", textAlign: "center" }}>
              {country ? "live preview · updates as you choose" : "pick a design to preview it"}
            </div>
            <div
              style={{
                marginTop: 20,
                display: "flex",
                gap: 24,
                padding: "14px 20px",
                background: "var(--sb-panel)",
                borderRadius: 14,
              }}
            >
              {[
                ["Size", "6.9 × 9.8 in"],
                ["Pages", "50"],
                ["Binding", "Hardbound"],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ fontSize: 12, textAlign: "center" }}>
                  <div style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 10, color: "var(--sb-muted-2)", marginBottom: 4 }}>
                    {lbl}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--sb-cream)" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <FlowBottomBar
        leftContent={
          !bookId ? (
            <span>
              Next: our AI generates your photobook.{" "}
              <strong style={{ color: "var(--sb-cream)", fontWeight: 700 }}>Sign in takes one click.</strong>
            </span>
          ) : null
        }
        rightButton={
          <button
            onClick={bookId ? handleSaveThenPreview : handleGenerate}
            disabled={saving || loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 26px",
              background: saving || loading ? "var(--sb-panel-2)" : "var(--sb-red)",
              color: saving || loading ? "#8a7f6f" : "var(--sb-cream)",
              border: "none",
              borderRadius: 999,
              fontFamily: "var(--font-bricolage), sans-serif",
              fontWeight: 800,
              fontSize: 16,
              cursor: saving || loading ? "not-allowed" : "pointer",
            }}
          >
            {bookId ? (saving ? "Saving…" : "continue →") : saving ? "Starting…" : "build my photobook →"}
          </button>
        }
      />
    </div>
  );
}
