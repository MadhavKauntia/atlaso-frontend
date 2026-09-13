"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getBook, getBookByTripId, getPhotoImageUrl, getPhotos, updateSlotOffset, updateSlotPhoto,
  type Book, type PageData, type Photo, type PhotoSlot,
} from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import FullPageLoader from "@/components/FullPageLoader";
import FlowTopbar from "@/components/layout/FlowTopbar";
import CountryCover from "@/components/covers/CountryCover";

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
  const [photos, setPhotos] = useState<Photo[]>([]);
  // Which slot the photo picker is currently open for (null = closed).
  const [picker, setPicker] = useState<{ pageId: string; slotIndex: number; currentPhotoId: string } | null>(null);

  useEffect(() => {
    const fetch = bookId ? getBook(bookId) : getBookByTripId(tripId);
    fetch
      .then(setBook)
      .catch(() => setError("Could not load book"))
      .finally(() => setLoading(false));
  }, [bookId, tripId]);

  useEffect(() => {
    getPhotos(tripId).then(setPhotos).catch(() => {});
  }, [tripId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!book) return;
      if (e.key === "ArrowLeft") setCurrentSpread((s) => Math.max(0, s - 1));
      if (e.key === "ArrowRight") setCurrentSpread((s) => Math.min(spreads.length - 1, s + 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!ready) return <FullPageLoader />;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--sb-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(243,234,216,0.15)", borderTopColor: "var(--sb-gold)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--sb-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <p style={{ color: "var(--sb-muted)", fontFamily: "var(--font-dm-sans)" }}>{error ?? "Book not found"}</p>
        <button onClick={() => router.push(`/trips/${tripId}/upload`)} style={{ padding: "10px 22px", background: "var(--sb-red)", color: "var(--sb-cream)", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-bricolage)", fontWeight: 800 }}>← Back</button>
      </div>
    );
  }

  const pages = book.pages ?? [];

  // Direct image URLs by photo id, so slots load straight from storage (no backend redirect).
  const photoUrls: Record<string, string> = {};
  for (const p of photos) if (p.imageUrl) photoUrls[p.id] = p.imageUrl;

  // Build spreads: cover alone, then interior pages (first alone, middle pairs, last alone)
  const spreads: PageData[][] = [[]]; // index 0 = cover (no pages)
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

  const openPicker = (pageId: string, slotIndex: number, currentPhotoId: string) =>
    setPicker({ pageId, slotIndex, currentPhotoId });

  const handlePhotoReplaced = (pageId: string, slotIndex: number, photoId: string) => {
    // Optimistic: swap the photo and reset framing to match the backend.
    setBook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((p) =>
          p.id !== pageId ? p : {
            ...p,
            slots: p.slots.map((sl, i) =>
              i !== slotIndex ? sl : { ...sl, photoId, offsetX: 0.5, offsetY: 0.5, rotation: 0 }
            ),
          }
        ),
      };
    });
    updateSlotPhoto(pageId, slotIndex, photoId).catch(() => {});
    setPicker(null);
  };

  // Photos already placed somewhere in the book — surfaced as a hint in the picker.
  const usedPhotoIds = new Set((book.pages ?? []).flatMap((p) => p.slots.map((sl) => sl.photoId)));

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", paddingBottom: 60, position: "relative" }}>
      <FlowTopbar currentStep={3} />

      {/* Hero strip */}
      <div style={{ padding: "24px 48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 700, color: "var(--sb-gold)", marginBottom: 12, fontFamily: "var(--font-dm-sans)" }}>
          Your photobook is ready
        </div>
        <h1 style={{ fontFamily: "var(--font-dm-sans)", fontSize: 38, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--sb-cream)" }}>
          {book.title}
          {pages.length > 0 && <span style={{ color: "var(--sb-muted)", fontWeight: 700 }}>, {pages.length} pages.</span>}
        </h1>
        <p style={{ fontSize: 14, color: "var(--sb-muted)", fontFamily: "var(--font-dm-sans)" }}>
          Drag any photo to reframe the crop, or hover and hit <strong style={{ color: "var(--sb-cream)", fontWeight: 700 }}>Replace</strong> to swap it. Regenerate for a fresh layout.
        </p>
      </div>

      {/* 3-column layout */}
      <div className="flow-preview-grid">

        {/* Left rail: spread thumbnails */}
        <div className="flow-preview-thumbs" style={{ position: "sticky", top: 100, alignSelf: "start", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 210px)", overflowY: "auto", padding: 4 }}>
          {spreads.map((sp, idx) => {
            const isCover = idx === 0;
            const firstInterior = idx === 1;
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
                  flexShrink: 0,
                  borderRadius: 6,
                  overflow: "hidden",
                  cursor: "pointer",
                  position: "relative",
                  border: `2px solid ${currentSpread === idx ? "var(--sb-gold)" : "transparent"}`,
                  transition: "border-color 0.15s, transform 0.15s",
                  display: "flex",
                  background: "var(--sb-cream)",
                }}
              >
                <div style={{ position: "absolute", top: 2, left: 3, fontSize: 9, color: "var(--sb-cream)", fontWeight: 700, background: "rgba(20,17,15,0.7)", padding: "1px 5px", borderRadius: 3, zIndex: 1, fontFamily: "var(--font-dm-sans)" }}>
                  {label}
                </div>
                {isCover ? (
                  <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sb-cream)" }}>
                    <CountryCover country={book.coverCountry} title={book.title} description={book.subtitle ?? ""} spine={false} style={{ height: "88%", aspectRatio: "0.707" }} />
                  </div>
                ) : firstInterior ? (
                  // First interior page opens on the right, blank on the left.
                  <>
                    <ThumbHalf page={undefined} tripId={tripId} photoUrls={photoUrls} />
                    <ThumbHalf page={leftPage} tripId={tripId} photoUrls={photoUrls} />
                  </>
                ) : (
                  <>
                    <ThumbHalf page={leftPage} tripId={tripId} photoUrls={photoUrls} />
                    <ThumbHalf page={rightPage} tripId={tripId} photoUrls={photoUrls} />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Center: book spread — all spreads rendered, CSS-toggled to preserve image cache */}
        <div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              position: "relative",
              aspectRatio: "16/10",
              boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--sb-cream)",
              padding: 10,
              width: "100%",
            }}>
              {/* Dashed center gutter (hidden on the cover spread) */}
              {currentSpread !== 0 && (
                <div style={{
                  position: "absolute", top: 10, bottom: 10, left: "50%",
                  width: 0, borderLeft: "1.5px dashed rgba(38,34,32,0.28)",
                  transform: "translateX(-50%)", zIndex: 2, pointerEvents: "none",
                }} />
              )}
              {spreads.map((sp, idx) => {
                const visible = idx === currentSpread;
                const isCoverSpread = idx === 0;
                const isFirstInterior = idx === 1;
                const isDoubleSp = sp.length === 2;
                return (
                  <div key={idx} style={{
                    position: "absolute", inset: 10, display: "flex",
                    borderRadius: 3, overflow: "hidden",
                    opacity: visible ? 1 : 0,
                    pointerEvents: visible ? "auto" : "none",
                    transition: "opacity 0.15s",
                  }}>
                    {isCoverSpread ? (
                      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sb-cream)" }}>
                        <CountryCover country={book.coverCountry} title={book.title} description={book.subtitle ?? ""} spine={false} style={{ height: "96%", aspectRatio: "0.707" }} />
                      </div>
                    ) : isDoubleSp ? (
                      <>
                        <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset -6px 0 12px rgba(38,34,32,0.08)" }}>
                          <PageRenderer page={sp[0]} tripId={tripId} photoUrls={photoUrls} onOffsetSaved={handleOffsetSaved} onReplace={openPicker} />
                        </div>
                        <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset 6px 0 12px rgba(38,34,32,0.06)" }}>
                          <PageRenderer page={sp[1]} tripId={tripId} photoUrls={photoUrls} onOffsetSaved={handleOffsetSaved} onReplace={openPicker} />
                        </div>
                      </>
                    ) : isFirstInterior ? (
                      // Opening the book: blank left page, first photo starts on the right.
                      <>
                        <div style={{ flex: 1, background: "var(--sb-cream)" }} />
                        <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset 6px 0 12px rgba(38,34,32,0.06)" }}>
                          <PageRenderer page={sp[0]} tripId={tripId} photoUrls={photoUrls} onOffsetSaved={handleOffsetSaved} onReplace={openPicker} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset -6px 0 12px rgba(38,34,32,0.08)" }}>
                          <PageRenderer page={sp[0]} tripId={tripId} photoUrls={photoUrls} onOffsetSaved={handleOffsetSaved} onReplace={openPicker} />
                        </div>
                        <div style={{ flex: 1, background: "var(--sb-cream)" }} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nav under book */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, maxWidth: 680, margin: "24px auto 0" }}>
            <button
              onClick={() => setCurrentSpread((s) => Math.max(0, s - 1))}
              disabled={currentSpread === 0}
              style={{
                width: 42, height: 42, borderRadius: "50%",
                border: "1px solid #5a5249", background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: currentSpread === 0 ? "not-allowed" : "pointer",
                opacity: currentSpread === 0 ? 0.4 : 1,
                fontSize: 16, color: "var(--sb-gold)",
                transition: "background 0.15s, transform 0.15s",
              }}
            >
              ←
            </button>
            <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 14, color: "var(--sb-muted)" }}>
              Spread <strong style={{ color: "var(--sb-cream)", fontWeight: 700 }}>{currentSpread + 1}</strong> of {spreads.length}
            </div>
            <button
              onClick={() => setCurrentSpread((s) => Math.min(spreads.length - 1, s + 1))}
              disabled={currentSpread === spreads.length - 1}
              style={{
                width: 42, height: 42, borderRadius: "50%",
                border: "1px solid #5a5249", background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: currentSpread === spreads.length - 1 ? "not-allowed" : "pointer",
                opacity: currentSpread === spreads.length - 1 ? 0.4 : 1,
                fontSize: 16, color: "var(--sb-gold)",
                transition: "background 0.15s, transform 0.15s",
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* Right: panel — hidden on mobile */}
        <div className="flow-preview-panel" style={{ position: "sticky", top: 100, background: "var(--sb-panel)", borderRadius: 18, border: "1px solid #46403a", padding: 20 }}>
          <button
            onClick={() => router.push(`/trips/${tripId}/generating?regenerateFrom=${bookId}`)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "12px 14px", marginBottom: 16,
              background: "var(--sb-panel-2)", border: "none",
              borderRadius: 12, cursor: "pointer", textAlign: "left",
              fontSize: 13, color: "var(--sb-cream)", fontFamily: "var(--font-dm-sans)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#524b44")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--sb-panel-2)")}
          >
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(232,179,44,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--sb-gold)", flexShrink: 0 }}>
              ↻
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>Regenerate layout</div>
            </div>
          </button>

          <div style={{ height: 1, background: "#46403a", marginBottom: 16 }} />

          {/* Cover mini */}
          <div
            onClick={() => router.push(`/trips/${tripId}/cover?bookId=${bookId}`)}
            style={{ display: "flex", gap: 10, alignItems: "center", padding: 8, borderRadius: 10, cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sb-panel-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: 42, flexShrink: 0 }}>
              <CountryCover country={book.coverCountry} title={book.title} description={book.subtitle ?? ""} style={{ width: 42 }} />
            </div>
            <div style={{ flex: 1, fontSize: 12 }}>
              <div style={{ color: "var(--sb-muted)", fontSize: 10, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-dm-sans)" }}>Cover</div>
              <div style={{ fontFamily: "var(--font-bricolage)", fontWeight: 800, color: "var(--sb-gold)" }}>Edit →</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky continue button (no bar) */}
      <button
        onClick={() => router.push(`/trips/${tripId}/order?bookId=${bookId}`)}
        style={{
          position: "fixed", bottom: 18, right: 48, zIndex: 10,
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "14px 26px", background: "var(--sb-red)", color: "var(--sb-cream)",
          borderRadius: 999, fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
          fontFamily: "var(--font-bricolage)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        }}
      >
        Continue to order
        <span style={{
          width: 24, height: 24, background: "var(--sb-cream)", color: "var(--sb-red)",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
        }}>→</span>
      </button>

      {picker && (
        <PhotoPickerModal
          tripId={tripId}
          photos={photos}
          usedPhotoIds={usedPhotoIds}
          currentPhotoId={picker.currentPhotoId}
          onClose={() => setPicker(null)}
          onSelect={(photoId) => handlePhotoReplaced(picker.pageId, picker.slotIndex, photoId)}
        />
      )}

      <style>{`
        @keyframes shimmer { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .shimmer { animation: shimmer 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function PhotoPickerModal({ tripId, photos, usedPhotoIds, currentPhotoId, onClose, onSelect }: {
  tripId: string;
  photos: Photo[];
  usedPhotoIds: Set<string>;
  currentPhotoId: string;
  onClose: () => void;
  onSelect: (photoId: string) => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(20,17,15,0.7)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--sb-panel)", width: "100%", maxWidth: 900,
          maxHeight: "85vh", borderRadius: 16, padding: 24,
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          border: "1px solid #46403a",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--sb-cream)" }}>Replace photo</div>
            <div style={{ fontSize: 13, color: "var(--sb-muted)", marginTop: 2, fontFamily: "var(--font-dm-sans)" }}>Pick any photo from this trip.</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #5a5249", background: "transparent", cursor: "pointer", fontSize: 16, color: "var(--sb-gold)" }}
          >
            ✕
          </button>
        </div>

        <div style={{
          overflowY: "auto",
          // Masonry columns: every photo shows at its true aspect ratio — no crop, no letterboxing.
          columnWidth: 160, columnGap: 10,
        }}>
          {photos.map((photo) => {
            const isCurrent = photo.id === currentPhotoId;
            const isUsed = usedPhotoIds.has(photo.id) && !isCurrent;
            const w = photo.metadata?.width || 0;
            const h = photo.metadata?.height || 0;
            // Reserve each tile's height up front so the masonry doesn't reflow as images load.
            const aspectRatio = w > 0 && h > 0 ? `${w} / ${h}` : "1 / 1";
            return (
              <button
                key={photo.id}
                onClick={() => !isCurrent && onSelect(photo.id)}
                disabled={isCurrent}
                style={{
                  position: "relative", display: "block", width: "100%", marginBottom: 10,
                  breakInside: "avoid", padding: 0, overflow: "hidden",
                  borderRadius: 8, cursor: isCurrent ? "default" : "pointer",
                  border: `2px solid ${isCurrent ? "var(--sb-gold)" : "#46403a"}`,
                  background: "var(--sb-panel-2)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl ?? getPhotoImageUrl(tripId, photo.id)}
                  alt={photo.originalFilename ?? ""}
                  loading="lazy"
                  style={{ width: "100%", aspectRatio, height: "auto", display: "block", objectFit: "contain", opacity: isCurrent ? 0.55 : 1 }}
                />
                {isCurrent && (
                  <div style={{ position: "absolute", top: 6, left: 6, background: "var(--sb-gold)", color: "var(--sb-bg-deep)", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 100, fontFamily: "var(--font-dm-sans)" }}>
                    In this frame
                  </div>
                )}
                {isUsed && (
                  <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(20,17,15,0.8)", color: "var(--sb-cream)", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 100, fontFamily: "var(--font-dm-sans)" }}>
                    In book
                  </div>
                )}
              </button>
            );
          })}
          {photos.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--sb-muted)", fontSize: 13, padding: 40, fontFamily: "var(--font-dm-sans)" }}>
              No photos found for this trip.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThumbHalf({ page, tripId, photoUrls }: { page: PageData | undefined; tripId: string; photoUrls: Record<string, string> }) {
  if (!page) return <div style={{ flex: 1, background: "var(--sb-panel-2)" }} />;
  const firstSlot = page.slots?.[0];
  if (!firstSlot) return <div style={{ flex: 1, background: "var(--sb-panel-2)" }} />;
  return (
    <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrls[firstSlot.photoId] ?? getPhotoImageUrl(tripId, firstSlot.photoId)}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

function PageRenderer({ page, tripId, photoUrls, onOffsetSaved, onReplace }: {
  page: PageData;
  tripId: string;
  photoUrls: Record<string, string>;
  onOffsetSaved: (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => void;
  onReplace: (pageId: string, slotIndex: number, currentPhotoId: string) => void;
}) {
  return (
    <div style={{ position: "relative", background: "var(--sb-cream)", width: "100%", height: "100%" }}>
      {page.slots.map((slot: PhotoSlot, i: number) => (
        <SlotRenderer key={slot.photoId} slot={slot} tripId={tripId} photoUrls={photoUrls} pageId={page.id} index={i} onOffsetSaved={onOffsetSaved} onReplace={onReplace} />
      ))}
    </div>
  );
}

function SlotRenderer({ slot, tripId, photoUrls, pageId, index, onOffsetSaved, onReplace }: {
  slot: PhotoSlot; tripId: string; photoUrls: Record<string, string>; pageId: string; index: number;
  onOffsetSaved: (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => void;
  onReplace: (pageId: string, slotIndex: number, currentPhotoId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: slot.offsetX ?? 0.5, y: slot.offsetY ?? 0.5 });
  const [displayOffset, setDisplayOffset] = useState({ x: slot.offsetX ?? 0.5, y: slot.offsetY ?? 0.5 });
  const [loaded, setLoaded] = useState(false);
  const [hover, setHover] = useState(false);

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
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
      {!loaded && <div style={{ position: "absolute", inset: 0, background: "var(--sb-panel-2)" }} className="shimmer" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={photoUrls[slot.photoId] ?? getPhotoImageUrl(tripId, slot.photoId)}
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
          background: "rgba(20,17,15,0.55)", color: "var(--sb-cream)", fontSize: 10,
          padding: "3px 6px", fontFamily: "var(--font-dm-sans)", fontStyle: "italic",
        }}>
          {slot.caption}
        </div>
      )}
      {/* Replace button — appears on hover, sits above the drag layer */}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onReplace(pageId, index, slot.photoId); }}
        title="Replace this photo"
        style={{
          position: "absolute", top: 6, right: 6,
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 10px", fontSize: 11, fontWeight: 800,
          background: "var(--sb-red)", color: "var(--sb-cream)",
          border: "none", borderRadius: 999, cursor: "pointer",
          fontFamily: "var(--font-bricolage)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          opacity: hover ? 1 : 0, transition: "opacity 0.15s",
          pointerEvents: hover ? "auto" : "none",
        }}
      >
        ⇄ Replace
      </button>
    </div>
  );
}
