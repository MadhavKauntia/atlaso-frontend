"use client";

import { use, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getBook, getBookByTripId, getPhotoImageUrl, getPhotos, swapSlots, updatePageLayout, updateSlotOffset, updateSlotPhoto, updateSlotRotation, updateSlotZoom,
  type Book, type PageData, type Photo, type PhotoSlot,
} from "@/lib/api";
import { activeLayoutId, LAYOUT_OPTIONS, type LayoutRect } from "@/lib/layouts";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getPreviewCache, setPreviewBook, setPreviewPhotos } from "@/lib/previewCache";
import FullPageLoader from "@/components/FullPageLoader";
import FlowTopbar from "@/components/layout/FlowTopbar";
import CountryCover from "@/components/covers/CountryCover";
import PreviewOnboarding from "./PreviewOnboarding";

const ONBOARDING_KEY = "atlaso_preview_onboarded";

export default function PreviewPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";
  const router = useRouter();

  const cacheKey = bookId || tripId;
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSpread, setCurrentSpread] = useState(0);
  // Which spreads have had their images mounted. We only load images for the
  // current spread + its immediate neighbours (and keep anything already
  // visited mounted, so back/forward stays cached). This stops all ~26 spreads
  // fetching full-res S3 images on first paint.
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  // Which slot the photo picker is currently open for (null = closed).
  const [picker, setPicker] = useState<{ pageId: string; slotIndex: number; currentPhotoId: string } | null>(null);
  // The page whose layout is currently being switched (awaiting the server), so we can dim it and
  // block a second click. Null when idle.
  const [layoutBusy, setLayoutBusy] = useState<string | null>(null);
  // Transient error toast (e.g. layout switch rejected). Auto-clears.
  const [notice, setNotice] = useState<string | null>(null);
  // Drag-to-swap: the slot being dragged (null = idle) and the slot currently under the cursor.
  // Cursor position drives the ghost via a ref (no re-render per pixel); only target changes hit state.
  const [swapFrom, setSwapFrom] = useState<{ pageId: string; index: number; photoId: string } | null>(null);
  const [swapTarget, setSwapTarget] = useState<{ pageId: string; index: number } | null>(null);
  const swapTargetRef = useRef<{ pageId: string; index: number } | null>(null);
  const swapStartPos = useRef({ x: 0, y: 0 });
  const ghostRef = useRef<HTMLDivElement>(null);
  // The left thumbnail rail is sized to match the preview box exactly, so it
  // scrolls within the same height rather than running the full viewport.
  const boxRef = useRef<HTMLDivElement>(null);
  const [railHeight, setRailHeight] = useState<number>();
  // Soft-fade the rail's scrolling edges so clipped thumbnails don't cut off hard.
  const railRef = useRef<HTMLDivElement>(null);
  const [railFade, setRailFade] = useState({ top: false, bottom: false });
  // First-visit spotlight tour highlighting the editing controls (Layout, Replace, reframe, swap).
  const [showOnboarding, setShowOnboarding] = useState(false);
  const updateRailFade = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setRailFade((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  // Paint instantly from the cached state (client-only, so no hydration
  // mismatch), then the fetches below refresh it in the background.
  useEffect(() => {
    const cached = getPreviewCache(cacheKey);
    if (cached?.book) { setBook(cached.book); setLoading(false); }
    if (cached?.photos?.length) setPhotos(cached.photos);
  }, [cacheKey]);

  useEffect(() => {
    // Wait for the auth check — firing these authenticated calls while logged out returns 401,
    // which hard-redirects to /login and loses the intended return URL (sending the user to a
    // fresh trip + upload instead of back here).
    if (!ready) return;
    const fetch = bookId ? getBook(bookId) : getBookByTripId(tripId);
    fetch
      .then(setBook)
      .catch(() => setError("Could not load book"))
      .finally(() => setLoading(false));
  }, [ready, bookId, tripId]);

  useEffect(() => {
    if (!ready) return;
    getPhotos(tripId).then(setPhotos).catch(() => {});
  }, [ready, tripId]);

  // Grow the mounted window around the current spread (preload prev + next).
  useEffect(() => {
    setMounted((prev) => {
      const next = new Set(prev);
      next.add(currentSpread);
      next.add(currentSpread + 1);
      if (currentSpread > 0) next.add(currentSpread - 1);
      return next;
    });
  }, [currentSpread]);

  // On first visit (and only once), run the spotlight tour. It needs an editable
  // interior page on screen, so jump off the cover to the first interior spread.
  useEffect(() => {
    if (loading || !book) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(ONBOARDING_KEY)) return;
    if ((book.pages?.length ?? 0) < 1) return;
    setCurrentSpread(1);
    setShowOnboarding(true);
  }, [loading, book]);

  const closeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
  }, []);

  const startOnboarding = useCallback(() => {
    setCurrentSpread(1);
    setShowOnboarding(true);
  }, []);

  // Keep the cache warm with the latest book (incl. local crop/replace edits) and photos.
  useEffect(() => { if (book) setPreviewBook(cacheKey, book); }, [book, cacheKey]);
  useEffect(() => { if (photos.length) setPreviewPhotos(cacheKey, photos); }, [photos, cacheKey]);

  // Track the preview box's rendered height and mirror it onto the left rail.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setRailHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, book?.id]);

  // Recompute the rail fade when its height or the number of thumbnails changes.
  useEffect(() => { updateRailFade(); }, [railHeight, book?.pages?.length, updateRailFade]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!book || showOnboarding) return; // the tour owns the arrow keys while it's open
      if (e.key === "ArrowLeft") setCurrentSpread((s) => Math.max(0, s - 1));
      if (e.key === "ArrowRight") setCurrentSpread((s) => Math.min(spreads.length - 1, s + 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // Optimistically exchange two slots' photo content (photoId + rotation + caption, recentred),
  // then persist. Works within one page or across the two pages of the visible spread.
  const performSwap = useCallback((from: { pageId: string; index: number }, to: { pageId: string; index: number }) => {
    setBook((prev) => {
      if (!prev) return prev;
      const a = prev.pages.find((p) => p.id === from.pageId)?.slots[from.index];
      const b = prev.pages.find((p) => p.id === to.pageId)?.slots[to.index];
      if (!a || !b) return prev;
      const withPhotoOf = (sl: PhotoSlot, src: PhotoSlot): PhotoSlot =>
        ({ ...sl, photoId: src.photoId, rotation: src.rotation, caption: src.caption, offsetX: 0.5, offsetY: 0.5, zoomScale: 1 });
      return {
        ...prev,
        pages: prev.pages.map((p) => {
          if (p.id !== from.pageId && p.id !== to.pageId) return p;
          return {
            ...p,
            slots: p.slots.map((sl, i) => {
              if (p.id === from.pageId && i === from.index) return withPhotoOf(sl, b);
              if (p.id === to.pageId && i === to.index) return withPhotoOf(sl, a);
              return sl;
            }),
          };
        }),
      };
    });
    swapSlots(from.pageId, from.index, to.pageId, to.index).catch(() => {});
  }, []);

  // While a swap drag is active, move the ghost with the cursor (via ref, no re-render) and resolve
  // the drop target under the pointer. Only the visible spread's slots are hit-testable, so the
  // swap is naturally scoped to the two pages on screen.
  useEffect(() => {
    if (!swapFrom) return;
    const moveGhost = (x: number, y: number) => {
      if (ghostRef.current) ghostRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(-4deg)`;
    };
    moveGhost(swapStartPos.current.x, swapStartPos.current.y);
    const onMove = (e: MouseEvent) => {
      moveGhost(e.clientX, e.clientY);
      const slotEl = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest("[data-slot]") as HTMLElement | null;
      let t: { pageId: string; index: number } | null = null;
      const raw = slotEl?.dataset.slot;
      if (raw) {
        const [pid, idx] = raw.split(":");
        const cand = { pageId: pid, index: Number(idx) };
        if (!(cand.pageId === swapFrom.pageId && cand.index === swapFrom.index)) t = cand;
      }
      const prev = swapTargetRef.current;
      if (prev?.pageId !== t?.pageId || prev?.index !== t?.index) {
        swapTargetRef.current = t;
        setSwapTarget(t);
      }
    };
    const onUp = () => {
      const t = swapTargetRef.current;
      if (t) performSwap(swapFrom, t);
      swapTargetRef.current = null;
      setSwapTarget(null);
      setSwapFrom(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "grabbing";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
  }, [swapFrom, performSwap]);

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

  // Fade only the edge(s) that have more content to scroll toward.
  const railTopStop = railFade.top ? "transparent 0, black 16px" : "black 0";
  const railBottomStop = railFade.bottom ? "black calc(100% - 16px), transparent 100%" : "black 100%";
  const railMask = `linear-gradient(to bottom, ${railTopStop}, ${railBottomStop})`;

  // Direct image URLs by photo id, so slots load straight from storage (no backend redirect).
  // photoUrls = full-res (main spread); thumbUrls = small display variant (rail + picker).
  const photoUrls: Record<string, string> = {};
  const thumbUrls: Record<string, string> = {};
  // Original pixel dimensions per photo — used to render rotation (rotate-then-cover-fit, matching the
  // PDF) and to warn when a photo is too low-res for its printed slot size.
  const photoDims: Record<string, { width: number; height: number }> = {};
  for (const p of photos) {
    if (p.imageUrl) photoUrls[p.id] = p.imageUrl;
    const t = p.thumbnailUrl ?? p.imageUrl;
    if (t) thumbUrls[p.id] = t;
    if (p.metadata?.width && p.metadata?.height) photoDims[p.id] = p.metadata;
  }

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

  const handleZoomSaved = (pageId: string, slotIndex: number, zoomScale: number) => {
    setBook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((p) =>
          p.id !== pageId ? p : {
            ...p,
            slots: p.slots.map((sl, i) => i !== slotIndex ? sl : { ...sl, zoomScale }),
          }
        ),
      };
    });
  };

  const handleRotationSaved = (pageId: string, slotIndex: number, rotation: number) => {
    setBook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((p) =>
          p.id !== pageId ? p : {
            ...p,
            slots: p.slots.map((sl, i) => i !== slotIndex ? sl : { ...sl, rotation }),
          }
        ),
      };
    });
  };

  const openPicker = (pageId: string, slotIndex: number, currentPhotoId: string) =>
    setPicker({ pageId, slotIndex, currentPhotoId });

  const handleSwapStart = (from: { pageId: string; index: number; photoId: string }, x: number, y: number) => {
    swapStartPos.current = { x, y };
    swapTargetRef.current = null;
    setSwapTarget(null);
    setSwapFrom(from);
  };

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
              i !== slotIndex ? sl : { ...sl, photoId, offsetX: 0.5, offsetY: 0.5, zoomScale: 1, rotation: 0 }
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
  // Spare photos not placed anywhere in the book — how many a page can grow into a bigger layout.
  const unusedCount = Math.max(0, photos.length - usedPhotoIds.size);

  const handleChangeLayout = async (pageId: string, layout: string) => {
    if (layoutBusy) return;
    setLayoutBusy(pageId);
    try {
      // The server recomputes slots (and fills new ones from the pool), so we replace with its
      // authoritative book rather than guessing the geometry locally.
      const updated = await updatePageLayout(pageId, layout);
      setBook(updated);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't change the layout.");
      window.setTimeout(() => setNotice(null), 4000);
    } finally {
      setLayoutBusy(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", paddingBottom: 60, position: "relative" }}>
      <FlowTopbar currentStep={3} />

      {/* Hero strip */}
      <div style={{ padding: "26px 48px 18px", textAlign: "center" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 700, color: "var(--sb-gold)", marginBottom: 10, fontFamily: "var(--font-dm-sans)" }}>
          Your photobook is ready
        </div>
        <h1 style={{ fontFamily: "var(--font-dm-sans)", fontSize: 38, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--sb-cream)" }}>
          {book.title}
          {pages.length > 0 && <span style={{ color: "var(--sb-muted)", fontWeight: 700 }}>, {pages.length} pages.</span>}
        </h1>
        <p style={{ fontSize: 14, color: "var(--sb-muted)", fontFamily: "var(--font-dm-sans)" }}>
          Drag a photo to reframe it, grab <strong style={{ color: "var(--sb-cream)", fontWeight: 700 }}>⠿ Move</strong> to swap two photos, hit <strong style={{ color: "var(--sb-cream)", fontWeight: 700 }}>Replace</strong> to pick another, or <strong style={{ color: "var(--sb-cream)", fontWeight: 700 }}>Layout</strong> to rearrange the page.
        </p>
        <button
          onClick={startOnboarding}
          style={{
            marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", background: "transparent", border: "1px solid #5a5249",
            borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 700,
            color: "var(--sb-muted)", fontFamily: "var(--font-dm-sans)",
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--sb-cream)"; e.currentTarget.style.borderColor = "var(--sb-gold)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--sb-muted)"; e.currentTarget.style.borderColor = "#5a5249"; }}
        >
          Show me how it works
        </button>
      </div>

      {/* 3-column layout */}
      <div className="flow-preview-grid">

        {/* Left rail: spread thumbnails */}
        <div ref={railRef} onScroll={updateRailFade} className="flow-preview-thumbs" style={{ position: "sticky", top: 100, alignSelf: "start", flexDirection: "column", gap: 8, height: railHeight, maxHeight: railHeight ?? "calc(100vh - 210px)", overflowY: "auto", padding: 4, maskImage: railMask, WebkitMaskImage: railMask }}>
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
                    <ThumbHalf page={undefined} tripId={tripId} photoUrls={thumbUrls} />
                    <ThumbHalf page={leftPage} tripId={tripId} photoUrls={thumbUrls} />
                  </>
                ) : (
                  <>
                    <ThumbHalf page={leftPage} tripId={tripId} photoUrls={thumbUrls} />
                    <ThumbHalf page={rightPage} tripId={tripId} photoUrls={thumbUrls} />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Center: book spread — all spreads rendered, CSS-toggled to preserve image cache */}
        <div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div ref={boxRef} style={{
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
                // Outside the mounted window: render an empty shell (no <img>) so
                // its full-res photos aren't fetched until we navigate near it.
                if (!mounted.has(idx)) {
                  return (
                    <div key={idx} style={{
                      position: "absolute", inset: 10, background: "var(--sb-cream)",
                      opacity: visible ? 1 : 0, pointerEvents: "none",
                    }} />
                  );
                }
                return (
                  <div key={idx} data-spread-visible={visible ? "true" : undefined} style={{
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
                          <PageRenderer page={sp[0]} tripId={tripId} photoUrls={photoUrls} onOffsetSaved={handleOffsetSaved} onZoomSaved={handleZoomSaved} onRotationSaved={handleRotationSaved} onReplace={openPicker} photoDims={photoDims} onChangeLayout={handleChangeLayout} unusedCount={unusedCount} busy={layoutBusy === sp[0].id} onSwapStart={handleSwapStart} swapFrom={swapFrom} swapTarget={swapTarget} />
                        </div>
                        <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset 6px 0 12px rgba(38,34,32,0.06)" }}>
                          <PageRenderer page={sp[1]} tripId={tripId} photoUrls={photoUrls} onOffsetSaved={handleOffsetSaved} onZoomSaved={handleZoomSaved} onRotationSaved={handleRotationSaved} onReplace={openPicker} photoDims={photoDims} onChangeLayout={handleChangeLayout} unusedCount={unusedCount} busy={layoutBusy === sp[1].id} onSwapStart={handleSwapStart} swapFrom={swapFrom} swapTarget={swapTarget} />
                        </div>
                      </>
                    ) : isFirstInterior ? (
                      // Opening the book: blank left page, first photo starts on the right.
                      <>
                        <BlankPage />
                        <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset 6px 0 12px rgba(38,34,32,0.06)" }}>
                          <PageRenderer page={sp[0]} tripId={tripId} photoUrls={photoUrls} onOffsetSaved={handleOffsetSaved} onZoomSaved={handleZoomSaved} onRotationSaved={handleRotationSaved} onReplace={openPicker} photoDims={photoDims} onChangeLayout={handleChangeLayout} unusedCount={unusedCount} busy={layoutBusy === sp[0].id} onSwapStart={handleSwapStart} swapFrom={swapFrom} swapTarget={swapTarget} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1, position: "relative", overflow: "hidden", boxShadow: "inset -6px 0 12px rgba(38,34,32,0.08)" }}>
                          <PageRenderer page={sp[0]} tripId={tripId} photoUrls={photoUrls} onOffsetSaved={handleOffsetSaved} onZoomSaved={handleZoomSaved} onRotationSaved={handleRotationSaved} onReplace={openPicker} photoDims={photoDims} onChangeLayout={handleChangeLayout} unusedCount={unusedCount} busy={layoutBusy === sp[0].id} onSwapStart={handleSwapStart} swapFrom={swapFrom} swapTarget={swapTarget} />
                        </div>
                        <BlankPage />
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
            onClick={() => router.push(`/trips/${tripId}/generating?regenerateFrom=${book.id}`)}
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
            onClick={() => router.push(`/trips/${tripId}/cover?bookId=${book.id}`)}
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
        onClick={() => router.push(`/trips/${tripId}/order?bookId=${book.id}`)}
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

      {/* Floating ghost that follows the cursor during a swap drag (positioned via ref). */}
      {swapFrom && (
        <div
          ref={ghostRef}
          style={{
            position: "fixed", left: 0, top: 0, zIndex: 400, pointerEvents: "none",
            width: 132, height: 92, borderRadius: 8, overflow: "hidden",
            border: "2px solid var(--sb-cream)", boxShadow: "0 14px 34px rgba(0,0,0,0.5)", opacity: 0.92,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrls[swapFrom.photoId] ?? photoUrls[swapFrom.photoId] ?? getPhotoImageUrl(tripId, swapFrom.photoId)}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      {notice && (
        <div style={{
          position: "fixed", bottom: 84, left: "50%", transform: "translateX(-50%)", zIndex: 300,
          background: "var(--sb-panel)", color: "var(--sb-cream)", border: "1px solid #46403a",
          borderRadius: 12, padding: "12px 18px", maxWidth: 420, textAlign: "center",
          fontFamily: "var(--font-dm-sans)", fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        }}>
          {notice}
        </div>
      )}

      {showOnboarding && <PreviewOnboarding onClose={closeOnboarding} />}

      <style>{`
        @keyframes shimmer { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .shimmer { animation: shimmer 1.4s ease-in-out infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
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
  const COL_W = 160;
  const GAP = 10;
  // CSS columns fill top-to-bottom (column-major), which scrambles the chronological order when read
  // left-to-right. So we distribute photos into N explicit columns round-robin (photo i -> column
  // i % N): the top row then reads 0,1,2,3, the next 4,5,6,7, etc. — masonry that reads horizontally.
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTileRef = useRef<HTMLButtonElement>(null);
  const [colCount, setColCount] = useState(4);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setColCount(Math.max(1, Math.floor((el.clientWidth + GAP) / (COL_W + GAP))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // On open, position the picker so the currently-used photo sits in the middle, letting the user pick
  // photos taken around the same time instead of starting at the top. useLayoutEffect sets scrollTop
  // before paint so the modal simply appears already scrolled — no visible jump. Keyed on colCount so
  // it re-centers once the columns have been measured.
  useLayoutEffect(() => {
    const container = scrollRef.current;
    const tile = currentTileRef.current;
    if (!container || !tile) return;
    const offsetWithin = tile.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    container.scrollTop = offsetWithin - container.clientHeight / 2 + tile.clientHeight / 2;
  }, [colCount]);

  const columns: Photo[][] = Array.from({ length: colCount }, () => []);
  photos.forEach((photo, i) => columns[i % colCount].push(photo));

  const renderTile = (photo: Photo) => {
    const isCurrent = photo.id === currentPhotoId;
    const isUsed = usedPhotoIds.has(photo.id) && !isCurrent;
    const w = photo.metadata?.width || 0;
    const h = photo.metadata?.height || 0;
    const aspectRatio = w > 0 && h > 0 ? `${w} / ${h}` : "1 / 1";
    return (
      <button
        key={photo.id}
        ref={isCurrent ? currentTileRef : undefined}
        onClick={() => !isCurrent && onSelect(photo.id)}
        disabled={isCurrent}
        style={{
          position: "relative", display: "block", width: "100%",
          padding: 0, overflow: "hidden",
          borderRadius: 8, cursor: isCurrent ? "default" : "pointer",
          border: `2px solid ${isCurrent ? "var(--sb-gold)" : "#46403a"}`,
          background: "var(--sb-panel-2)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbnailUrl ?? photo.imageUrl ?? getPhotoImageUrl(tripId, photo.id)}
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
  };

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

        <div ref={scrollRef} style={{ overflowY: "auto" }}>
          {photos.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--sb-muted)", fontSize: 13, padding: 40, fontFamily: "var(--font-dm-sans)" }}>
              No photos found for this trip.
            </div>
          ) : (
            // Explicit columns, filled round-robin, so photos read left-to-right in chronological
            // order while keeping each tile's true aspect ratio (no crop).
            <div style={{ display: "flex", gap: GAP, alignItems: "flex-start" }}>
              {columns.map((column, ci) => (
                <div key={ci} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: GAP }}>
                  {column.map(renderTile)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The intentionally-empty opening/closing page — labelled so it doesn't read as a bug. */
function BlankPage() {
  return (
    <div style={{ flex: 1, background: "var(--sb-cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", color: "rgba(38,34,32,0.34)", fontFamily: "var(--font-dm-sans)" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700 }}>Blank page</div>
        <div style={{ fontSize: 10.5, marginTop: 6, letterSpacing: "0.02em", lineHeight: 1.4 }}>Left empty by design so<br />your spreads sit evenly</div>
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
        loading="lazy"
        decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

function PageRenderer({ page, tripId, photoUrls, photoDims, onOffsetSaved, onZoomSaved, onRotationSaved, onReplace, onChangeLayout, unusedCount, busy, onSwapStart, swapFrom, swapTarget }: {
  page: PageData;
  tripId: string;
  photoUrls: Record<string, string>;
  photoDims: Record<string, { width: number; height: number }>;
  onOffsetSaved: (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => void;
  onZoomSaved: (pageId: string, slotIndex: number, zoomScale: number) => void;
  onRotationSaved: (pageId: string, slotIndex: number, rotation: number) => void;
  onReplace: (pageId: string, slotIndex: number, currentPhotoId: string) => void;
  onChangeLayout: (pageId: string, layout: string) => void;
  unusedCount: number;
  busy: boolean;
  onSwapStart: (from: { pageId: string; index: number; photoId: string }, x: number, y: number) => void;
  swapFrom: { pageId: string; index: number; photoId: string } | null;
  swapTarget: { pageId: string; index: number } | null;
}) {
  const [hover, setHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPickerOpen(false); }}
      style={{ position: "relative", background: "var(--sb-cream)", width: "100%", height: "100%" }}
    >
      {page.slots.map((slot: PhotoSlot, i: number) => (
        <SlotRenderer
          key={slot.photoId}
          slot={slot} tripId={tripId} photoUrls={photoUrls} photoDim={photoDims[slot.photoId]} pageId={page.id} index={i}
          onOffsetSaved={onOffsetSaved} onZoomSaved={onZoomSaved} onRotationSaved={onRotationSaved} onReplace={onReplace}
          onSwapStart={onSwapStart}
          swapActive={!!swapFrom}
          isSwapSource={swapFrom?.pageId === page.id && swapFrom?.index === i}
          isSwapTarget={swapTarget?.pageId === page.id && swapTarget?.index === i}
        />
      ))}
      <LayoutControl
        visible={hover || pickerOpen}
        open={pickerOpen}
        busy={busy}
        currentLayout={page.layout}
        currentCount={page.slots.length}
        unusedCount={unusedCount}
        onToggle={() => setPickerOpen((o) => !o)}
        onPick={(layout) => { setPickerOpen(false); onChangeLayout(page.id, layout); }}
      />
      {busy && (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(243,234,216,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 26, height: 26, border: "2px solid rgba(38,34,32,0.2)", borderTopColor: "var(--sb-red)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      )}
    </div>
  );
}

/** Small mini-diagram of a layout's slot arrangement, drawn from normalised rects. */
function LayoutDiagram({ rects, active }: { rects: LayoutRect[]; active: boolean }) {
  return (
    <div style={{ position: "relative", width: 34, height: 22, background: "#e7ddca", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
      {rects.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${r.x * 100}%`, top: `${r.y * 100}%`,
            width: `${r.w * 100}%`, height: `${r.h * 100}%`,
            background: active ? "var(--sb-red)" : "#9a8f7d",
            border: "0.5px solid #e7ddca",
          }}
        />
      ))}
    </div>
  );
}

/** Hover-revealed "Layout" button + popover of layout options, anchored to a page's top-left. */
function LayoutControl({ visible, open, busy, currentLayout, currentCount, unusedCount, onToggle, onPick }: {
  visible: boolean;
  open: boolean;
  busy: boolean;
  currentLayout: string;
  currentCount: number;
  unusedCount: number;
  onToggle: () => void;
  onPick: (layout: string) => void;
}) {
  const activeId = activeLayoutId(currentLayout);
  return (
    // Stop mousedown from reaching the slot drag layer underneath.
    <div onMouseDown={(e) => e.stopPropagation()} style={{ position: "absolute", top: 6, left: 6, zIndex: 5 }}>
      <button
        data-onboard="layout"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        title="Change this page's layout"
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 10px", fontSize: 11, fontWeight: 800,
          background: open ? "var(--sb-gold)" : "rgba(20,17,15,0.72)",
          color: open ? "var(--sb-bg-deep)" : "var(--sb-cream)",
          border: "none", borderRadius: 999, cursor: "pointer",
          fontFamily: "var(--font-bricolage)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          opacity: visible ? 1 : 0, transition: "opacity 0.15s",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        ▦ Layout
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 7,
          width: 188, padding: 8,
          background: "var(--sb-panel)", border: "1px solid #46403a", borderRadius: 12,
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
        }}>
          {LAYOUT_OPTIONS.map((opt) => {
            const isActive = opt.id === activeId;
            // Growing needs (opt.photos - currentCount) spare photos; shrinking/same never blocks.
            const disabled = opt.photos - currentCount > unusedCount;
            return (
              <button
                key={opt.id}
                disabled={disabled || busy}
                onClick={(e) => { e.stopPropagation(); if (!disabled && !busy) onPick(opt.id); }}
                title={disabled ? "Not enough spare photos for this layout" : opt.label}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  padding: "8px 4px",
                  background: isActive ? "var(--sb-panel-2)" : "transparent",
                  border: `1px solid ${isActive ? "var(--sb-gold)" : "#46403a"}`,
                  borderRadius: 8,
                  cursor: disabled || busy ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                <LayoutDiagram rects={opt.rects} active={isActive} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sb-cream)", fontFamily: "var(--font-dm-sans)", lineHeight: 1.1, textAlign: "center" }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SlotRenderer({ slot, tripId, photoUrls, photoDim, pageId, index, onOffsetSaved, onZoomSaved, onRotationSaved, onReplace, onSwapStart, swapActive, isSwapSource, isSwapTarget }: {
  slot: PhotoSlot; tripId: string; photoUrls: Record<string, string>; photoDim?: { width: number; height: number }; pageId: string; index: number;
  onOffsetSaved: (pageId: string, slotIndex: number, offsetX: number, offsetY: number) => void;
  onZoomSaved: (pageId: string, slotIndex: number, zoomScale: number) => void;
  onRotationSaved: (pageId: string, slotIndex: number, rotation: number) => void;
  onReplace: (pageId: string, slotIndex: number, currentPhotoId: string) => void;
  onSwapStart: (from: { pageId: string; index: number; photoId: string }, x: number, y: number) => void;
  swapActive: boolean;
  isSwapSource: boolean;
  isSwapTarget: boolean;
}) {
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.25;
  // Printed page size in points, mirrored from the backend PdfRenderer (6.9in x 9.8in), for the DPI check.
  const PAGE_W_PT = 496.8;
  const PAGE_H_PT = 705.6;
  const MIN_PRINT_DPI = 150;
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: slot.offsetX ?? 0.5, y: slot.offsetY ?? 0.5 });
  const [displayOffset, setDisplayOffset] = useState({ x: slot.offsetX ?? 0.5, y: slot.offsetY ?? 0.5 });
  // Zoom-in factor (1 = cover-fit). Kept in a ref too so the drag handler's overflow math and the
  // debounced save always read the live value without re-subscribing the listeners.
  const [zoom, setZoom] = useState(slot.zoomScale ?? 1);
  const zoomRef = useRef(slot.zoomScale ?? 1);
  const zoomSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Rotation in degrees (0/90/180/270). The PDF rotates the bitmap then cover-fits, so the preview
  // computes a rotate-then-cover-fit layout (below) rather than a plain CSS rotate over object-fit.
  const [rotation, setRotation] = useState(((slot.rotation % 360) + 360) % 360);
  const rotationRef = useRef(((slot.rotation % 360) + 360) % 360);
  // The slot's on-screen pixel size, needed to lay out a rotated image so it still covers the box.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [loaded, setLoaded] = useState(false);
  const [hover, setHover] = useState(false);

  const pw = photoDim?.width ?? 0;
  const ph = photoDim?.height ?? 0;

  // Measure the slot box before paint so a rotated image lays out correctly on first render.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Apply a new zoom: clamp, update UI immediately, and debounce the persist. The offset is left
  // as-is (zoom anchors on it); the backend re-clamps to the same range.
  const applyZoom = useCallback((nextZoom: number) => {
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(nextZoom * 100) / 100));
    if (z === zoomRef.current) return;
    zoomRef.current = z;
    setZoom(z);
    if (zoomSaveTimer.current) clearTimeout(zoomSaveTimer.current);
    zoomSaveTimer.current = setTimeout(() => {
      onZoomSaved(pageId, index, z);
      updateSlotZoom(pageId, index, z).catch(() => {});
    }, 400);
  }, [pageId, index, onZoomSaved]);

  // Rotate a further 90° clockwise, matching the backend's bitmap rotation.
  const rotate90 = useCallback(() => {
    const next = (rotationRef.current + 90) % 360;
    rotationRef.current = next;
    setRotation(next);
    onRotationSaved(pageId, index, next);
    updateSlotRotation(pageId, index, next).catch(() => {});
  }, [pageId, index, onRotationSaved]);

  // Restore default framing: recenter, zoom 1, no rotation.
  const resetFraming = useCallback(() => {
    offsetRef.current = { x: 0.5, y: 0.5 };
    setDisplayOffset({ x: 0.5, y: 0.5 });
    zoomRef.current = 1;
    setZoom(1);
    rotationRef.current = 0;
    setRotation(0);
    onOffsetSaved(pageId, index, 0.5, 0.5);
    onZoomSaved(pageId, index, 1);
    onRotationSaved(pageId, index, 0);
    updateSlotOffset(pageId, index, 0.5, 0.5).catch(() => {});
    updateSlotZoom(pageId, index, 1).catch(() => {});
    updateSlotRotation(pageId, index, 0).catch(() => {});
  }, [pageId, index, onOffsetSaved, onZoomSaved, onRotationSaved]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const cW = containerRef.current.clientWidth;
      const cH = containerRef.current.clientHeight;
      const iw = photoDim?.width || imgRef.current?.naturalWidth || cW;
      const ih = photoDim?.height || imgRef.current?.naturalHeight || cH;
      // Footprint of the (possibly rotated) image within the box, matching the render below. Offset is
      // box-space (post-rotation), so screen dx/dy always map straight to offsetX/offsetY.
      const rot = rotationRef.current;
      const swap = rot === 90 || rot === 270;
      const rw = swap ? ih : iw;
      const rh = swap ? iw : ih;
      const scale = Math.max(cW / rw, cH / rh) * zoomRef.current;
      const overflowX = rw * scale - cW;
      const overflowY = rh * scale - cH;
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
  }, [pageId, index, onOffsetSaved, photoDim]);

  const norm = rotation;
  const swap = norm === 90 || norm === 270;
  const haveDims = pw > 0 && ph > 0 && box.w > 0 && box.h > 0;
  let imgStyle: React.CSSProperties;
  if (norm !== 0 && haveDims) {
    // Rotate-then-cover-fit, matching the backend: size the image so its rotated footprint covers the
    // box, rotate about centre, and position that footprint by the box-space offset.
    const rw = swap ? ph : pw;
    const rh = swap ? pw : ph;
    const scale = Math.max(box.w / rw, box.h / rh) * zoom;
    const cssW = pw * scale;
    const cssH = ph * scale;
    const drawW = rw * scale;
    const drawH = rh * scale;
    const fcx = (box.w - drawW) * displayOffset.x + drawW / 2;
    const fcy = (box.h - drawH) * displayOffset.y + drawH / 2;
    imgStyle = {
      position: "absolute", display: "block", objectFit: "fill",
      width: cssW, height: cssH,
      left: fcx - cssW / 2, top: fcy - cssH / 2,
      transform: `rotate(${norm}deg)`, transformOrigin: "center center",
      pointerEvents: "none", opacity: loaded ? 1 : 0,
      // Transition size + rotation (not left/top, which would lag the pan drag).
      transition: "opacity 0.2s ease, width 0.25s ease, height 0.25s ease, transform 0.25s ease",
    };
  } else {
    // Unrotated (the common case): object-fit cover + scale(zoom) about the offset anchor — provably
    // identical to the backend's cover-fit, and keeps the smooth CSS zoom.
    imgStyle = {
      width: "100%", height: "100%", objectFit: "cover", display: "block",
      objectPosition: `${displayOffset.x * 100}% ${displayOffset.y * 100}%`,
      transform: `scale(${zoom})`,
      transformOrigin: `${displayOffset.x * 100}% ${displayOffset.y * 100}%`,
      pointerEvents: "none", opacity: loaded ? 1 : 0,
      transition: "opacity 0.2s ease, transform 0.25s ease",
    };
  }

  // Effective print DPI = 72 / points-per-source-pixel (uniform cover-fit scale). Warn below threshold.
  const printDpi = pw > 0 && ph > 0
    ? 72 / (Math.max((slot.size.width * PAGE_W_PT) / (swap ? ph : pw), (slot.size.height * PAGE_H_PT) / (swap ? pw : ph)) * zoom)
    : Infinity;
  const lowRes = printDpi < MIN_PRINT_DPI;
  const isDefaultFraming = displayOffset.x === 0.5 && displayOffset.y === 0.5 && zoom === 1 && norm === 0;
  // On narrow slots (multi-photo grid pages) drop the button labels so the bottom-left Move control and
  // the bottom-right framing controls don't collide — keeps a gap like the wider single-photo pages.
  const compactControls = box.w > 0 && box.w < 250;

  return (
    <div
      ref={containerRef}
      data-slot={`${pageId}:${index}`}
      data-onboard={index === 0 ? "reposition" : undefined}
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
        style={imgStyle}
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
        data-onboard={index === 0 ? "replace" : undefined}
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
      {/* Drag handle — grab it to move this photo onto another slot to swap them. */}
      <button
        data-onboard={index === 0 ? "swap" : undefined}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation(); // don't start a crop-reframe drag
          onSwapStart({ pageId, index, photoId: slot.photoId }, e.clientX, e.clientY);
        }}
        onClick={(e) => e.stopPropagation()}
        title="Drag onto another photo to swap them"
        style={{
          position: "absolute", bottom: 6, left: 6,
          display: "flex", alignItems: "center", gap: 4,
          padding: compactControls ? "4px 7px" : "4px 10px", fontSize: 11, fontWeight: 800,
          background: "rgba(20,17,15,0.72)", color: "var(--sb-cream)",
          border: "none", borderRadius: 999, cursor: "grab",
          fontFamily: "var(--font-bricolage)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          opacity: hover && !swapActive ? 1 : 0, transition: "opacity 0.15s",
          pointerEvents: hover && !swapActive ? "auto" : "none",
        }}
      >
        {compactControls ? "⠿" : "⠿ Move"}
      </button>
      {/* Framing controls — appears on hover: rotate 90°, zoom (− / +), and reset. */}
      <div
        className="slot-controls"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "absolute", bottom: 6, right: 6,
          display: "flex", alignItems: "center", gap: 2,
          background: "rgba(20,17,15,0.72)", borderRadius: 999,
          padding: "2px", boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          opacity: hover && !swapActive ? 1 : 0, transition: "opacity 0.15s",
          pointerEvents: hover && !swapActive ? "auto" : "none",
        }}
      >
        <button
          data-onboard={index === 0 ? "rotate" : undefined}
          onClick={(e) => { e.stopPropagation(); rotate90(); }}
          title="Rotate 90°"
          style={{
            width: 22, height: 22, borderRadius: "50%", border: "none",
            background: "transparent", color: "var(--sb-cream)", fontSize: 13, fontWeight: 800,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
          }}
        >
          ⟳
        </button>
        <span style={{ width: 1, height: 15, background: "rgba(243,234,216,0.22)", margin: "0 1px" }} />
        {/* Zoom sub-group — the tour spotlights just this, not the whole pill. */}
        <span data-onboard={index === 0 ? "zoom" : undefined} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            onClick={(e) => { e.stopPropagation(); applyZoom(zoom - ZOOM_STEP); }}
            disabled={zoom <= ZOOM_MIN}
            title="Zoom out"
            style={{
              width: 22, height: 22, borderRadius: "50%", border: "none",
              background: "transparent", color: "var(--sb-cream)", fontSize: 15, fontWeight: 800,
              cursor: zoom <= ZOOM_MIN ? "default" : "pointer", opacity: zoom <= ZOOM_MIN ? 0.4 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
            }}
          >
            −
          </button>
          {!compactControls && (
            <span style={{ color: "var(--sb-cream)", fontSize: 10, fontWeight: 800, minWidth: 26, textAlign: "center", fontFamily: "var(--font-bricolage)" }}>
              {zoom.toFixed(1)}×
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); applyZoom(zoom + ZOOM_STEP); }}
            disabled={zoom >= ZOOM_MAX}
            title="Zoom in"
            style={{
              width: 22, height: 22, borderRadius: "50%", border: "none",
              background: "transparent", color: "var(--sb-cream)", fontSize: 15, fontWeight: 800,
              cursor: zoom >= ZOOM_MAX ? "default" : "pointer", opacity: zoom >= ZOOM_MAX ? 0.4 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
            }}
          >
            +
          </button>
        </span>
        <span style={{ width: 1, height: 15, background: "rgba(243,234,216,0.22)", margin: "0 1px" }} />
        <button
          data-onboard={index === 0 ? "reset" : undefined}
          onClick={(e) => { e.stopPropagation(); resetFraming(); }}
          disabled={isDefaultFraming}
          title="Reset framing"
          style={{
            height: 22, padding: "0 9px", borderRadius: 999, border: "none",
            background: "transparent", color: "var(--sb-cream)", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.02em", fontFamily: "var(--font-bricolage)",
            cursor: isDefaultFraming ? "default" : "pointer", opacity: isDefaultFraming ? 0.4 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, whiteSpace: "nowrap",
          }}
        >
          ↺ Reset
        </button>
      </div>
      {/* Low-resolution warning — this photo is too small to print sharply at its slot size. Anchored
          top-centre so it clears the page's Layout button (top-left) and the Replace button (top-right). */}
      {lowRes && (
        <div
          title={`This photo may look blurry in print (~${Math.round(printDpi)} DPI). Zoom out, or replace it with a higher-resolution shot.`}
          style={{
            position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", zIndex: 3,
            display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
            padding: "3px 8px", fontSize: 10, fontWeight: 800,
            background: "rgba(178,74,20,0.92)", color: "var(--sb-cream)",
            borderRadius: 999, fontFamily: "var(--font-bricolage)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          }}
        >
          ⚠ Low-res
        </div>
      )}
      {/* The photo being dragged: dim it in place. */}
      {isSwapSource && (
        <div style={{ position: "absolute", inset: 0, zIndex: 4, background: "rgba(243,234,216,0.5)", pointerEvents: "none" }} />
      )}
      {/* The slot the cursor is over: highlight it as the drop target. */}
      {isSwapTarget && (
        <div style={{ position: "absolute", inset: 0, zIndex: 4, border: "3px solid var(--sb-gold)", boxShadow: "inset 0 0 0 9999px rgba(232,179,44,0.16)", pointerEvents: "none" }} />
      )}
    </div>
  );
}
