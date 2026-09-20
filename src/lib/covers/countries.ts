/**
 * Cover designs: each has a text-free stamp illustration and a background
 * colour. The cover renders as bg + stamp + dynamic title & description.
 */
export type CoverCategory = "destination" | "theme";

export interface CoverCountry {
  /** stable slug stored on the book (`book.coverCountry`) */
  slug: string;
  name: string;
  /** cover background colour */
  bg: string;
  /** text colour for the title/description on the cover */
  ink: string;
  /** grouping in the picker: real place vs generic vibe */
  category: CoverCategory;
  /** spine colour for the bound-book preview (defaults to bg) */
  spine?: string;
  /** text-free stamp illustration at /assets/stamps/{stamp}.png */
  stamp?: string;
  /** legacy baked-text cover jpg at /assets/covers/{art}.jpg */
  art?: string;
}

export const COUNTRIES: CoverCountry[] = [
  { slug: "bali", name: "Bali", bg: "#2A3F2D", ink: "#f3ead8", stamp: "bali", category: "destination" },
  { slug: "italy", name: "Italy", bg: "#FFC250", ink: "#262220", stamp: "italy", category: "destination" },
  { slug: "japan", name: "Japan", bg: "#AB4040", ink: "#f3ead8", stamp: "japan", category: "destination" },
  { slug: "japan2", name: "Japan 2", bg: "#7F2421", ink: "#f3ead8", stamp: "japan2", category: "destination" },
  { slug: "srilanka", name: "Sri Lanka", bg: "#015E4B", ink: "#f3ead8", stamp: "srilanka", category: "destination" },
  { slug: "thailand", name: "Thailand", bg: "#1C4E53", ink: "#f3ead8", stamp: "thailand", category: "destination" },
  { slug: "vietnam", name: "Vietnam", bg: "#7E2420", ink: "#f3ead8", stamp: "vietnam", category: "destination" },
  { slug: "greece", name: "Greece", bg: "#0D66B4", ink: "#f3ead8", stamp: "greece", category: "destination" },
  { slug: "singapore", name: "Singapore", bg: "#21466A", ink: "#f3ead8", stamp: "singapore", category: "destination" },
  { slug: "australia", name: "Australia", bg: "#F1ECE4", ink: "#262220", stamp: "australia", category: "destination" },
  { slug: "dubai", name: "Dubai", bg: "#22476B", ink: "#f3ead8", stamp: "dubai", category: "destination" },
  { slug: "malaysia", name: "Malaysia", bg: "#015E4B", ink: "#f3ead8", stamp: "malaysia", category: "destination" },
  { slug: "maldives", name: "Maldives", bg: "#F1C66D", ink: "#262220", stamp: "maldives", category: "destination" },
  { slug: "london", name: "London", bg: "#1D4E54", ink: "#f3ead8", stamp: "london", category: "destination" },
  { slug: "newyork", name: "New York", bg: "#135C5C", ink: "#f3ead8", stamp: "newyork", category: "destination" },
  { slug: "usa", name: "USA", bg: "#753429", ink: "#f3ead8", stamp: "usa", category: "destination" },
  { slug: "paris", name: "Paris", bg: "#F2D9A3", ink: "#262220", stamp: "paris", category: "destination" },
  { slug: "paris2", name: "Paris 2", bg: "#21466A", ink: "#f3ead8", stamp: "paris2", category: "destination" },
  { slug: "switzerland", name: "Switzerland", bg: "#21466A", ink: "#f3ead8", stamp: "switzerland", category: "destination" },
  { slug: "georgia", name: "Georgia", bg: "#135C5C", ink: "#f3ead8", stamp: "georgia", category: "destination" },
  { slug: "turkey", name: "Turkey", bg: "#344552", ink: "#f3ead8", stamp: "turkey", category: "destination" },
  { slug: "nepal", name: "Nepal", bg: "#4E6031", ink: "#f3ead8", stamp: "nepal", category: "destination" },
  { slug: "spain", name: "Spain", bg: "#D98973", ink: "#262220", stamp: "spain", category: "destination" },
  { slug: "hongkong", name: "Hong Kong", bg: "#091F38", ink: "#f3ead8", stamp: "hongkong", category: "destination" },
  { slug: "amsterdam", name: "Amsterdam", bg: "#E7D9BE", ink: "#262220", stamp: "amsterdam", category: "destination" },
  { slug: "egypt", name: "Egypt", bg: "#FABE67", ink: "#262220", stamp: "egypt", category: "destination" },
  { slug: "beach", name: "Beach", bg: "#FABE68", ink: "#262220", stamp: "beach", category: "theme" },
  { slug: "mountains", name: "Mountains", bg: "#145D5C", ink: "#f3ead8", stamp: "mountains", category: "theme" },
  { slug: "hills", name: "Hills", bg: "#B8BB1B", ink: "#262220", stamp: "hills", category: "theme" },
  { slug: "scuba", name: "Scuba", bg: "#1D4E54", ink: "#f3ead8", stamp: "scuba", category: "theme" },
  { slug: "northeast", name: "Northeast", bg: "#025F4C", ink: "#f3ead8", stamp: "northeast", category: "theme" },
  { slug: "nightlife", name: "Nightlife", bg: "#091F39", ink: "#f3ead8", stamp: "nightlife", category: "theme" },
];

/** Curated background colours a user can pick to override a design's default. */
export const PALETTE: string[] = [
  "#21466A", "#2A3F2D", "#7E2420", "#1C4E53",
  "#302b28", "#F1ECE4", "#F1C66D", "#D98973",
];

export function getCountry(slug: string | null | undefined): CoverCountry | undefined {
  if (!slug) return undefined;
  return COUNTRIES.find((c) => c.slug === slug);
}

/** Public URL of a cover's text-free stamp illustration, or null. */
export function stampUrl(country: CoverCountry | undefined): string | null {
  return country?.stamp ? `/assets/stamps/${country.stamp}.png` : null;
}

/** Public URL of a legacy baked-text cover jpg, or null. */
export function countryArtUrl(country: CoverCountry | undefined): string | null {
  return country?.art ? `/assets/covers/${country.art}.jpg` : null;
}

/** Dark ink on light backgrounds, cream on dark — keeps the title/description legible. */
export function inkFor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#f3ead8";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#262220" : "#f3ead8";
}

/**
 * Resolves the effective cover colours. A non-blank `bgOverride` (stored on the
 * book as `coverPaletteId`) wins over the design's default, and its ink is
 * auto-derived for contrast; otherwise the design's own bg/ink are used.
 */
export function coverColors(
  country: string | null | undefined,
  bgOverride?: string | null
): { bg: string; ink: string; spine: string } {
  const def = getCountry(country);
  const override = bgOverride?.trim();
  if (override) {
    return { bg: override, ink: inkFor(override), spine: override };
  }
  const bg = def?.bg ?? "#302b28";
  return { bg, ink: def?.ink ?? "#f3ead8", spine: def?.spine ?? bg };
}
