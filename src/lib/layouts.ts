// The page layouts a user can pick from on the preview. This is a deliberately trimmed,
// visually-distinct subset of the backend `Layout` enum: the engine's HERO_LANDSCAPE renders
// identically to SINGLE_FULL and DOUBLE_PAGE_FULL_BLEED spans two facing pages, so neither is
// offered here. Each option's `id` is a valid backend Layout name sent straight to the API.

export type LayoutId =
  | "SINGLE_FULL"
  | "SINGLE_FRAMED"
  | "TWO_VERTICAL"
  | "TWO_HORIZONTAL"
  | "THREE_GRID"
  | "FOUR_GRID";

export interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutOption {
  id: LayoutId;
  label: string;
  /** How many photos this layout holds — drives the grow/shrink availability check. */
  photos: number;
  /** Normalised slot rectangles, used to draw the little preview diagram in the picker. */
  rects: LayoutRect[];
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: "SINGLE_FULL", label: "Full bleed", photos: 1, rects: [{ x: 0, y: 0, w: 1, h: 1 }] },
  { id: "SINGLE_FRAMED", label: "Framed", photos: 1, rects: [{ x: 0.14, y: 0.12, w: 0.72, h: 0.76 }] },
  {
    id: "TWO_VERTICAL",
    label: "Side by side",
    photos: 2,
    rects: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: "TWO_HORIZONTAL",
    label: "Stacked",
    photos: 2,
    rects: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: "THREE_GRID",
    label: "Feature + two",
    photos: 3,
    rects: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: "FOUR_GRID",
    label: "Grid",
    photos: 4,
    rects: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
];

/** Maps a page's current backend layout to the picker option that represents it (for highlighting). */
export function activeLayoutId(currentLayout: string): LayoutId {
  switch (currentLayout) {
    case "SINGLE_FRAMED":
      return "SINGLE_FRAMED";
    case "TWO_VERTICAL":
      return "TWO_VERTICAL";
    case "TWO_HORIZONTAL":
      return "TWO_HORIZONTAL";
    case "THREE_GRID":
      return "THREE_GRID";
    case "FOUR_GRID":
      return "FOUR_GRID";
    // SINGLE_FULL, HERO_LANDSCAPE, DOUBLE_PAGE_FULL_BLEED all read as a full-bleed single.
    default:
      return "SINGLE_FULL";
  }
}
