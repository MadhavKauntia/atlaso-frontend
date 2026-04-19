"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getBook, getPhotoImageUrl, updateSlotOffset,
  type Book, type PageData, type PhotoSlot,
} from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import FlowTopbar from "@/components/layout/FlowTopbar";
import CoverRenderer from "@/components/covers/CoverRenderer";
import { TEMPLATES } from "@/lib/covers/templates";
import { PAIRINGS } from "@/lib/covers/palette";

const DEFAULT_TEMPLATE_ID = "archway";
const DEFAULT_PAIRING_ID = "lisbon-sun";

export default function PreviewPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    getBook(bookId)
      .then(setBook)
      .catch(() => setError("Could not load book"))
      .finally(() => setLoading(false));
  }, [bookId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!book) return;
      if (e.key === "ArrowLeft") setCurrentSpread((s) => Math.max(0, s - 1));
      if (e.key === "ArrowRight") setCurrentSpread((s) => Math.min(spreads.length - 1, s + 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!ready) return null;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(10,26,58,0.12)", borderTopColor: "var(--blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <p style={{ color: "var(--ink-soft)" }}>{error ?? "Book not found"}</p>
        <button onClick={() => router.push(`/trips/${tripId}/upload`)} style={{ padding: "10px 20px", background: "var(--ink)", color: "#fff", border: "none", borderRadius: 100, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
      </div>
    );
  }

  const pages = book.pages ?? [];

  // Build spreads: first page alone (cover), middle pages in pairs, last page alone
  const spreads: PageData[][] = [];
  if (pages.length === 1) {
    spreads.push([pages[0]]);
  } else if (pages.length >= 2) {
    spreads.push([pages[0]]);
    let i = 1;
    while (i <= pages.length - 2) {
      if (i + 1 <= pages.length - 2) {
        spreads.push([pages[i], pages[i + 1]]);
        i += 2;
      } else {
        spreads.push([pages[i]]);
        i += 1;
      }
    }
    spreads.push([pages[pages.length - 1]]);
  }

  const spread = spreads[currentSpread] ?? [];
  const isDouble = spread.length === 2;

  const handleOffsetSaved = (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => {
    setBook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((p) =>
          p.id !== pageId ? p : {
            ...p,
            slots: p.slots.map((sl, i) => i !== slotIndex ? sl : { ...sl, offsetX, offsetY }),
          }
        ),
      };
    });
  };

  const template = TEMPLATES[book.coverTemplateId ?? DEFAULT_TEMPLATE_ID] ?? TEMPLATES[DEFAULT_TEMPLATE_ID];
  const pairing = PAIRINGS[book.coverPaletteId ?? DEFAULT_PAIRING_ID] ?? PAIRINGS[DEFAULT_PAIRING_ID];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingBottom: 80, position: "relative" }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100,
        opacity: 0.12, mixBlendMode: "multiply",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E")`,
      }} />

      <FlowTopbar currentStep={3} />

      {/* Hero strip */}
      <div style={{ padding: "40px 48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 500, color: "var(--blue)", marginBottom: 12 }}>
          Your photobook is ready
        </div>
        <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 38, fontWeight: 300, lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 8, color: "var(--ink)" }}>
          <em style={{ fontStyle: "italic", color: "var(--blue)" }}>{book.title}</em>
          {pages.length > 0 && <>, {pages.length} pages.</>}
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
          Flip through your book. Swap photos, or regenerate any spread you don't love.
        </p>
      </div>

      {/* 3-column layout */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "80px 1fr 260px", gap: 24, alignItems: "start" }}>

        {/* Left rail: spread thumbnails */}
        <div style={{ position: "sticky", top: 100, display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 120px)", overflowY: "auto", padding: 4 }}>
          {spreads.map((sp, idx) => {
            const isCover = idx === 0;
            const leftPage = sp[0];
            const rightPage = sp[1];
            const label = isCover ? "CV" : sp.length === 2
              ? `${sp[0].pageNumber}-${sp[1].pageNumber}`
              : `${sp[0].pageNumber}`;

            return (
              <div
                key={idx}
                onClick={() => setCurrentSpread(idx)}
                style={{
                  aspectRatio: "8/5",
                  borderRadius: 3,
                  overflow: "hidden",
                  cursor: "pointer",
                  position: "relative",
                  border: `2px solid ${currentSpread === idx ? "var(--blue)" : "transparent"}`,
                  transition: "border-color 0.15s, transform 0.15s",
                  display: "flex",
                  background: "var(--white)",
                }}
              >
                <div style={{ position: "absolute", top: 2, left: 3, fontSize: 9, color: "#fff", fontWeight: 500, background: "rgba(0,0,0,0.5)", padding: "1px 4px", borderRadius: 2, zIndex: 1 }}>
                  {label}
                </div>
                {isCover ? (
                  <>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <CoverRenderer template={template} pairing={pairing} title={book.title} subtitle={book.subtitle ?? ""} style={{ width: "100%", height: "100%" }} />
                    </div>
                    <ThumbHalf page={leftPage} tripId={tripId} />
                  </>
                ) : (
                  <>
                    <ThumbHalf page={leftPage} tripId={tripId} />
                    <ThumbHalf page={rightPage} tripId={tripId} />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Center: book spread */}
        <div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              display: "flex",
              aspectRatio: "16/10",
              boxShadow: "0 24px 60px rgba(10,26,58,0.2), 0 2px 6px rgba(10,26,58,0.1)",
              borderRadius: 3,
              overflow: "hidden",
              background: "#fff",
              width: "100%",
              maxWidth: 680,
            }}>
              {currentSpread === 0 ? (
                // Cover spread
                <>
                  <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    <CoverRenderer template={template} pairing={pairing} title={book.title} subtitle={book.subtitle ?? ""} style={{ width: "100%", height: "100%", display: "block" }} />
                  </div>
                  <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset 6px 0 12px rgba(10,26,58,0.04)" }}>
                    <PageRenderer page={spread[0]} tripId={tripId} onOffsetSaved={handleOffsetSaved} />
                  </div>
                </>
              ) : isDouble ? (
                <>
                  <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset -6px 0 12px rgba(10,26,58,0.06)" }}>
                    <PageRenderer page={spread[0]} tripId={tripId} onOffsetSaved={handleOffsetSaved} />
                  </div>
                  <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset 6px 0 12px rgba(10,26,58,0.04)" }}>
                    <PageRenderer page={spread[1]} tripId={tripId} onOffsetSaved={handleOffsetSaved} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset -6px 0 12px rgba(10,26,58,0.06)" }}>
                    <PageRenderer page={spread[0]} tripId={tripId} onOffsetSaved={handleOffsetSaved} />
                  </div>
                  <div style={{ flex: 1, background: "#fff" }} />
                </>
              )}
            </div>
          </div>

          {/* Nav under book */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, maxWidth: 680, margin: "24px auto 0" }}>
            <button
              onClick={() => setCurrentSpread((s) => Math.max(0, s - 1))}
              disabled={currentSpread === 0}
              style={{
                width: 42, height: 42, borderRadius: "50%",
                border: "1px solid rgba(10,26,58,0.2)", background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: currentSpread === 0 ? "not-allowed" : "pointer",
                opacity: currentSpread === 0 ? 0.4 : 1,
                fontSize: 16, color: "var(--ink)",
                transition: "background 0.15s, transform 0.15s",
              }}
            >
              ←
            </button>
            <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 14, color: "var(--ink-soft)" }}>
              Spread <strong style={{ color: "var(--ink)", fontWeight: 500 }}>{currentSpread + 1}</strong> of {spreads.length}
            </div>
            <button
              onClick={() => setCurrentSpread((s) => Math.min(spreads.length - 1, s + 1))}
              disabled={currentSpread === spreads.length - 1}
              style={{
                width: 42, height: 42, borderRadius: "50%",
                border: "1px solid rgba(10,26,58,0.2)", background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: currentSpread === spreads.length - 1 ? "not-allowed" : "pointer",
                opacity: currentSpread === spreads.length - 1 ? 0.4 : 1,
                fontSize: 16, color: "var(--ink)",
                transition: "background 0.15s, transform 0.15s",
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* Right: panel */}
        <div style={{ position: "sticky", top: 100, background: "#fff", borderRadius: 14, border: "1px solid rgba(10,26,58,0.08)", padding: 20 }}>
          <button
            onClick={() => router.push(`/trips/${tripId}/generating?regenerateFrom=${bookId}`)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "12px 14px", marginBottom: 16,
              background: "var(--wash, #d7e3f4)", border: "none",
              borderRadius: 10, cursor: "pointer", textAlign: "left",
              fontSize: 13, color: "var(--ink)", fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted, #e6ecf5)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--wash, #d7e3f4)")}
          >
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(30,82,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--blue)", flexShrink: 0 }}>
              ↻
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>Regenerate layout</div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>AI picks a new arrangement</div>
            </div>
          </button>

          <div style={{ height: 1, background: "rgba(10,26,58,0.08)", marginBottom: 16 }} />

          {/* Cover mini */}
          <div
            onClick={() => router.push(`/trips/${tripId}/cover?bookId=${bookId}`)}
            style={{ display: "flex", gap: 10, alignItems: "center", padding: 8, borderRadius: 8, cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted, #e6ecf5)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: 42, height: 56, borderRadius: 2, boxShadow: "0 2px 6px rgba(10,26,58,0.15)", flexShrink: 0, overflow: "hidden" }}>
              <CoverRenderer template={template} pairing={pairing} title={book.title} subtitle={book.subtitle ?? ""} style={{ width: 42, height: 56, display: "block" }} />
            </div>
            <div style={{ flex: 1, fontSize: 12 }}>
              <div style={{ color: "var(--ink-soft)", fontSize: 10, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>Cover</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>Edit →</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#fff", padding: "18px 48px",
        display: "flex", justifyContent: "flex-end", alignItems: "center",
        borderTop: "1px solid rgba(10,26,58,0.08)", zIndex: 10,
      }}>
        <button
          onClick={() => router.push(`/trips/${tripId}/order?bookId=${bookId}`)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 26px", background: "var(--ink)", color: "#fff",
            borderRadius: 100, fontWeight: 500, fontSize: 14, border: "none", cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Continue to order
          <span style={{
            width: 24, height: 24, background: "#fff", color: "var(--ink)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
          }}>→</span>
        </button>
      </div>

      <style>{`
        @keyframes shimmer { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .shimmer { animation: shimmer 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function ThumbHalf({ page, tripId }: { page: PageData | undefined; tripId: string }) {
  if (!page) return <div style={{ flex: 1, background: "var(--muted, #e6ecf5)" }} />;
  const firstSlot = page.slots?.[0];
  if (!firstSlot) return <div style={{ flex: 1, background: "var(--muted, #e6ecf5)" }} />;
  return (
    <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getPhotoImageUrl(tripId, firstSlot.photoId)}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

function PageRenderer({ page, tripId, onOffsetSaved }: {
  page: PageData;
  tripId: string;
  onOffsetSaved: (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => void;
}) {
  return (
    <div style={{ position: "relative", background: "#fff", width: "100%", height: "100%" }}>
      {page.slots.map((slot: PhotoSlot, i: number) => (
        <SlotRenderer key={slot.photoId} slot={slot} tripId={tripId} pageId={page.id} index={i} onOffsetSaved={onOffsetSaved} />
      ))}
    </div>
  );
}

function SlotRenderer({ slot, tripId, pageId, index, onOffsetSaved }: {
  slot: PhotoSlot; tripId: string; pageId: string; index: number;
  onOffsetSaved: (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: slot.offsetX ?? 0.5, y: slot.offsetY ?? 0.5 });
  const [displayOffset, setDisplayOffset] = useState({ x: slot.offsetX ?? 0.5, y: slot.offsetY ?? 0.5 });
  const [loaded, setLoaded] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current || !imgRef.current) return;
      const cW = containerRef.current.clientWidth;
      const cH = containerRef.current.clientHeight;
      const nW = imgRef.current.naturalWidth || cW;
      const nH = imgRef.current.naturalHeight || cH;
      const scale = Math.max(cW / nW, cH / nH);
      const overflowX = nW * scale - cW;
      const overflowY = nH * scale - cH;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      const next = {
        x: Math.max(0, Math.min(1, offsetRef.current.x - (overflowX > 1 ? dx / overflowX : 0))),
        y: Math.max(0, Math.min(1, offsetRef.current.y - (overflowY > 1 ? dy / overflowY : 0))),
      };
      offsetRef.current = next;
      setDisplayOffset({ ...next });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const { x, y } = offsetRef.current;
      onOffsetSaved(pageId, index, x, y);
      updateSlotOffset(pageId, index, x, y).catch(() => {});
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [pageId, index, onOffsetSaved]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: `${slot.position.x * 100}%`,
        top: `${slot.position.y * 100}%`,
        width: `${slot.size.width * 100}%`,
        height: `${slot.size.height * 100}%`,
        overflow: "hidden",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {!loaded && <div style={{ position: "absolute", inset: 0, background: "var(--wash, #d7e3f4)" }} className="shimmer" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={getPhotoImageUrl(tripId, slot.photoId)}
        alt={slot.caption ?? `Photo ${index + 1}`}
        draggable={false}
        onLoad={() => setLoaded(true)}
        style={{
          width: "100%", height: "100%", objectFit: "cover", display: "block",
          objectPosition: `${displayOffset.x * 100}% ${displayOffset.y * 100}%`,
          transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
          pointerEvents: "none", opacity: loaded ? 1 : 0, transition: "opacity 0.2s ease",
        }}
      />
      {slot.caption && (
        <div style={{
          position: "absolute", bottom: 2, left: 2, right: 2,
          background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 10,
          padding: "3px 6px", fontFamily: "var(--font-fraunces), serif", fontStyle: "italic",
        }}>
          {slot.caption}
        </div>
      )}
    </div>
  );
}
