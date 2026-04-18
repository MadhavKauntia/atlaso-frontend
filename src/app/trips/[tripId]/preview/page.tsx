"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Book, PageData, PhotoSlot, exportBook, getBook, getBookPdfUrl, getPhotoImageUrl, updateSlotOffset } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function PreviewPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    getBook(bookId)
      .then(setBook)
      .catch(() => setError("Could not load book"))
      .finally(() => setLoading(false));
  }, [bookId]);

  if (!ready) return null;

  const handleRegenerate = () => {
    router.push(`/trips/${tripId}/generating?regenerateFrom=${bookId}`);
  };

  const handleExport = async () => {
    if (!book) return;
    setExporting(true);
    setError(null);
    try {
      const updated = await exportBook(book.id);
      setBook(updated);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <AppShell maxWidth="1100px">
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-soft)" }}>Loading…</div>
      </AppShell>
    );
  }

  if (!book) {
    return (
      <AppShell maxWidth="1100px">
        <p style={{ color: "#b91c1c" }}>{error ?? "Book not found"}</p>
      </AppShell>
    );
  }

  const pages = book.pages ?? [];

  // Build spreads: first page alone, middle pages in pairs, last page alone
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

  const spreadLabel = isDouble
    ? `Pages ${spread[0].pageNumber}–${spread[1].pageNumber} of ${pages.length}`
    : spread.length === 1
      ? `Page ${spread[0].pageNumber} of ${pages.length}`
      : "";

  return (
    <AppShell maxWidth="1100px">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-fraunces), serif",
            fontSize: 30,
            fontWeight: 400,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            marginBottom: 4,
          }}>
            {book.title}
          </h1>
          {book.subtitle && (
            <p style={{ color: "var(--ink-soft)", fontSize: 15, fontStyle: "italic", fontFamily: "var(--font-fraunces), serif" }}>{book.subtitle}</p>
          )}
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {pages.length} pages · v{book.version}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={handleRegenerate}
            style={{
              padding: "10px 20px",
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid rgba(10,26,58,0.25)",
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Regenerate
          </button>

          {book.status === "PDF_READY" ? (
            <a
              href={getBookPdfUrl(book.id)}
              download
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 20px",
                background: "var(--blue)",
                color: "var(--white)",
                textDecoration: "none",
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Download PDF
            </a>
          ) : (
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                padding: "10px 20px",
                background: exporting ? "rgba(10,26,58,0.3)" : "var(--ink)",
                color: "var(--white)",
                border: "none",
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 500,
                cursor: exporting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {exporting ? "Exporting…" : "Export PDF"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 16 }}>{error}</p>
      )}

      {/* Spread navigation */}
      {spreads.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
          <button
            onClick={() => setCurrentSpread((s) => Math.max(0, s - 1))}
            disabled={currentSpread === 0}
            style={{ padding: "6px 14px", border: "1px solid rgba(10,26,58,0.2)", borderRadius: 8, background: "var(--white)", cursor: currentSpread === 0 ? "not-allowed" : "pointer", opacity: currentSpread === 0 ? 0.4 : 1, fontSize: 13, fontFamily: "inherit" }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{spreadLabel}</span>
          <button
            onClick={() => setCurrentSpread((s) => Math.min(spreads.length - 1, s + 1))}
            disabled={currentSpread === spreads.length - 1}
            style={{ padding: "6px 14px", border: "1px solid rgba(10,26,58,0.2)", borderRadius: 8, background: "var(--white)", cursor: currentSpread === spreads.length - 1 ? "not-allowed" : "pointer", opacity: currentSpread === spreads.length - 1 ? 0.4 : 1, fontSize: 13, fontFamily: "inherit" }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Spread preview */}
      {pages.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-soft)" }}>
          No pages generated.
        </div>
      )}

      {spread.length > 0 && (() => {
        const handleOffsetSaved = (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => {
          setBook((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              pages: prev.pages.map((p) =>
                p.id !== pageId ? p : {
                  ...p,
                  slots: p.slots.map((sl, i) =>
                    i !== slotIndex ? sl : { ...sl, offsetX, offsetY }
                  ),
                }
              ),
            };
          });
        };

        if (isDouble) {
          return (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PageRenderer page={spread[0]} tripId={tripId} onOffsetSaved={handleOffsetSaved} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PageRenderer page={spread[1]} tripId={tripId} onOffsetSaved={handleOffsetSaved} />
              </div>
            </div>
          );
        }

        return (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: "calc(50% - 3px)" }}>
              <PageRenderer page={spread[0]} tripId={tripId} onOffsetSaved={handleOffsetSaved} />
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}

function PageRenderer({ page, tripId, onOffsetSaved }: { page: PageData; tripId: string; onOffsetSaved: (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => void }) {
  return (
    <div
      style={{
        position: "relative",
        background: "var(--white)",
        border: "1px solid rgba(10,26,58,0.1)",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(10,26,58,0.1)",
        width: "100%",
        aspectRatio: "595 / 842",
      }}
    >
      {page.slots.map((slot: PhotoSlot, i: number) => (
        <SlotRenderer key={i} slot={slot} tripId={tripId} pageId={page.id} index={i} onOffsetSaved={onOffsetSaved} />
      ))}
      <div style={{
        position: "absolute",
        bottom: 8,
        right: 12,
        fontSize: 10,
        color: "rgba(10,26,58,0.25)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      }}>
        {page.layout}
      </div>
    </div>
  );
}

function SlotRenderer({ slot, tripId, pageId, index, onOffsetSaved }: { slot: PhotoSlot; tripId: string; pageId: string; index: number; onOffsetSaved: (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: slot.offsetX ?? 0.5, y: slot.offsetY ?? 0.5 });
  const [displayOffset, setDisplayOffset] = useState({ x: slot.offsetX ?? 0.5, y: slot.offsetY ?? 0.5 });

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
        padding: "2px",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={getPhotoImageUrl(tripId, slot.photoId)}
        alt={slot.caption ?? `Photo ${index + 1}`}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${displayOffset.x * 100}% ${displayOffset.y * 100}%`,
          transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
          display: "block",
          pointerEvents: "none",
        }}
      />
      {slot.caption && (
        <div style={{
          position: "absolute",
          bottom: 2,
          left: 2,
          right: 2,
          background: "rgba(0,0,0,0.45)",
          color: "white",
          fontSize: 10,
          padding: "3px 6px",
          fontFamily: "var(--font-fraunces), serif",
          fontStyle: "italic",
        }}>
          {slot.caption}
        </div>
      )}
    </div>
  );
}
