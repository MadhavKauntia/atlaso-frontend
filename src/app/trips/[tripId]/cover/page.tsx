"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FlowTopbar from "@/components/layout/FlowTopbar";
import FlowBottomBar from "@/components/layout/FlowBottomBar";
import CountryCover from "@/components/covers/CountryCover";
import { COUNTRIES } from "@/lib/covers/countries";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { getToken, setToken } from "@/lib/auth";
import { googleAuth, getTrip, getBook, saveCoverCountry, claimTrip } from "@/lib/api";

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
  const [country, setCountry] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [inferred, setInferred] = useState<{ place: string; country?: string; coordStr: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = query.trim()
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : COUNTRIES;

  useEffect(() => {
    const run = async () => {
      try {
        const raw = sessionStorage.getItem("atlaso_inferred");
        let inf: { place: string; country?: string; coordStr: string } | null = null;
        if (raw) {
          inf = JSON.parse(raw);
          setInferred(inf);
        }

        if (bookId) {
          const [trip, book] = await Promise.all([getTrip(tripId), getBook(bookId)]);
          setTitle(book.title || trip.name || "");
          if (book.coverCountry) setCountry(book.coverCountry);
          else setCountry(matchCountry(inf?.country, inf?.place));
        } else {
          const trip = await getTrip(tripId);
          const tripName = trip.name && trip.name !== "Untitled Trip" ? trip.name : "";
          setTitle(tripName || inf?.country || inf?.place?.split(",")[0]?.trim() || "");
          setCountry(matchCountry(inf?.country, inf?.place));

          const prefsRaw = localStorage.getItem("atlaso_cover_prefs");
          if (prefsRaw) {
            const prefs = JSON.parse(prefsRaw);
            if (prefs.title) setTitle(prefs.title);
            if (prefs.country) setCountry(prefs.country);
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

  const showSaved = () => {
    setSavedIndicator(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedIndicator(false), 2000);
  };

  // Auto-save the chosen country when editing an existing book.
  useEffect(() => {
    if (!bookId || loading || !country) return;
    const t = setTimeout(async () => {
      try {
        await saveCoverCountry(bookId, country);
        showSaved();
      } catch {
        /* silent */
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, country]);

  const persistPrefs = () => {
    localStorage.setItem(
      "atlaso_cover_prefs",
      JSON.stringify({ title: title.trim(), country: country ?? "" })
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
      if (country) await saveCoverCountry(bookId, country);
      router.push(`/trips/${tripId}/preview?bookId=${bookId}`);
    } catch {
      setError("Could not save cover.");
    } finally {
      setSaving(false);
    }
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    cursor: "pointer",
    fontFamily: "var(--font-dm-sans), sans-serif",
    border: "none",
    borderRadius: 999,
    padding: "11px 18px",
    fontSize: 14,
    fontWeight: 600,
    background: active ? "var(--sb-gold)" : "var(--sb-panel-2)",
    color: active ? "var(--sb-ink)" : "var(--sb-cream)",
    transition: "background 140ms ease",
  });

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
              Your photos and cover are ready. Sign in to generate your photobook — it takes one click.
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
              Pick a country for its illustrated stamp cover, or write your own title.
            </p>

            {error && <p style={{ color: "#ef8b7f", fontSize: 14, marginBottom: 16 }}>{error}</p>}

            {/* Title */}
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--sb-muted-2)",
                  marginBottom: 10,
                }}
              >
                book title
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={40}
                placeholder="or name it yourself — “Nonna’s kitchen, 2025”"
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

            {/* Country picker */}
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--sb-muted-2)",
                  marginBottom: 11,
                }}
              >
                cover — pick a country
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries"
                aria-label="Search countries"
                style={{ ...inputStyle, marginBottom: 12 }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {filtered.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setCountry(c.slug)}
                    aria-pressed={country === c.slug}
                    style={chipStyle(country === c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <span style={{ fontSize: 14, color: "var(--sb-muted-2)" }}>No countries match “{query}”.</span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div style={{ position: "sticky", top: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
            {savedIndicator && (
              <div style={{ marginBottom: 12, fontSize: 12, color: "var(--sb-gold)" }}>Saved</div>
            )}
            <CountryCover
              country={country}
              title={title}
              style={{ width: 320, transform: "rotate(-2deg)" }}
            />
            <div
              style={{
                marginTop: 24,
                fontSize: 13,
                color: "var(--sb-muted-2)",
                textAlign: "center",
              }}
            >
              {country ? "illustrated stamp cover" : "pick a country to see its cover"}
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
                ["Size", "21 × 21 cm"],
                ["Pages", "48 lay-flat"],
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
              Next: our AI generates your photobook —{" "}
              <strong style={{ color: "var(--sb-cream)", fontWeight: 700 }}>sign in takes one click</strong>
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
