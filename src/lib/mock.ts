// Mock data layer for running the app without a backend (screenshots / demos).
// Toggled by NEXT_PUBLIC_MOCK=1. When off, every helper here is dead code and
// the app behaves exactly as before.
//
// Photo source:
//   default                          -> real photos via picsum.photos seeds
//   NEXT_PUBLIC_MOCK_PHOTOS=local    -> /mock-photos/<id>.jpg (drop your own into public/mock-photos)

import type { Book, PageData, PhotoSlot, Trip } from "@/lib/api";

export const IS_MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

const PHOTO_SOURCE = process.env.NEXT_PUBLIC_MOCK_PHOTOS ?? "picsum";

export function mockPhotoUrl(photoId: string): string {
  if (PHOTO_SOURCE === "local") return `/mock-photos/${photoId}.jpg`;
  // Portrait crops of real photographs, deterministic per id.
  return `https://picsum.photos/seed/atlaso-${photoId}/1200/1600`;
}

interface CoverPrefs {
  title: string;
  subtitle: string;
  templateId: string;
  paletteId: string;
  country: string;
}

function readCoverPrefs(): Partial<CoverPrefs> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("atlaso_cover_prefs");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function slot(
  photoId: number,
  x: number,
  y: number,
  width: number,
  height: number,
  caption: string | null = null
): PhotoSlot {
  return {
    photoId: String(photoId),
    position: { x, y },
    size: { width, height },
    caption,
    rotation: 0,
    offsetX: 0.5,
    offsetY: 0.5,
    zoomScale: 1,
  };
}

function page(pageNumber: number, layout: string, slots: PhotoSlot[]): PageData {
  return { id: `mock-page-${pageNumber}`, pageNumber, layout, slots };
}

// A hand-built set of varied spreads so the preview looks like a finished book.
const PAGES: PageData[] = [
  page(1, "SINGLE_FULL", [slot(1, 0, 0, 1, 1, "Day one, finding our feet")]),
  page(2, "TWO_VERTICAL", [slot(2, 0, 0, 1, 0.5), slot(3, 0, 0.5, 1, 0.5)]),
  page(3, "THREE_GRID", [
    slot(4, 0, 0, 1, 0.6),
    slot(5, 0, 0.62, 0.49, 0.38),
    slot(6, 0.51, 0.62, 0.49, 0.38),
  ]),
  page(4, "SINGLE_FULL", [slot(7, 0, 0, 1, 1, "Golden hour by the water")]),
  page(5, "FOUR_GRID", [
    slot(8, 0, 0, 0.49, 0.49),
    slot(9, 0.51, 0, 0.49, 0.49),
    slot(10, 0, 0.51, 0.49, 0.49),
    slot(11, 0.51, 0.51, 0.49, 0.49),
  ]),
  page(6, "TWO_VERTICAL", [slot(12, 0, 0, 1, 0.5), slot(13, 0, 0.5, 1, 0.5)]),
  page(7, "SINGLE_FULL", [slot(14, 0, 0, 1, 1)]),
  page(8, "THREE_GRID", [
    slot(15, 0, 0, 1, 0.6, "Wandering the old town"),
    slot(16, 0, 0.62, 0.49, 0.38),
    slot(17, 0.51, 0.62, 0.49, 0.38),
  ]),
  page(9, "FOUR_GRID", [
    slot(18, 0, 0, 0.49, 0.49),
    slot(19, 0.51, 0, 0.49, 0.49),
    slot(20, 0, 0.51, 0.49, 0.49),
    slot(21, 0.51, 0.51, 0.49, 0.49),
  ]),
  page(10, "SINGLE_FULL", [slot(22, 0, 0, 1, 1, "The last evening")]),
  page(11, "TWO_VERTICAL", [slot(23, 0, 0, 1, 0.5), slot(24, 0, 0.5, 1, 0.5)]),
  page(12, "SINGLE_FULL", [slot(25, 0, 0, 1, 1)]),
];

export function mockBook(tripId: string, bookId?: string): Book {
  const prefs = readCoverPrefs();
  return {
    id: bookId || "mock-book",
    tripId,
    version: 1,
    title: prefs.title || "LISBON",
    subtitle: prefs.subtitle || "a week in spring, 2025",
    coverTemplateId: prefs.templateId || "archway",
    coverPaletteId: prefs.paletteId || "lisbon-sun",
    coverCountry: prefs.country || "italy",
    status: "READY_FOR_PREVIEW",
    generatedAt: "2025-05-01T10:00:00Z",
    pages: PAGES,
  };
}

export function mockTrip(tripId: string): Trip {
  return {
    id: tripId,
    name: "",
    destination: null,
    status: "READY_FOR_BOOK_GENERATION",
    createdAt: "2025-05-01T10:00:00Z",
    updatedAt: "2025-05-01T10:00:00Z",
  };
}
