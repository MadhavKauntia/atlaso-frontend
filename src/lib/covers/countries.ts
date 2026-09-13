/**
 * Cover designs: each has a text-free stamp illustration and a background
 * colour. The cover renders as bg + stamp + dynamic title & description.
 */
export interface CoverCountry {
  /** stable slug stored on the book (`book.coverCountry`) */
  slug: string;
  name: string;
  /** cover background colour */
  bg: string;
  /** text colour for the title/description on the cover */
  ink: string;
  /** spine colour for the bound-book preview (defaults to bg) */
  spine?: string;
  /** text-free stamp illustration at /assets/stamps/{stamp}.png */
  stamp?: string;
  /** legacy baked-text cover jpg at /assets/covers/{art}.jpg */
  art?: string;
}

export const COUNTRIES: CoverCountry[] = [
  { slug: "bali", name: "Bali", bg: "#2A3F2D", ink: "#f3ead8", stamp: "bali" },
  { slug: "italy", name: "Italy", bg: "#FFC250", ink: "#262220", stamp: "italy" },
  { slug: "japan", name: "Japan", bg: "#AB4040", ink: "#f3ead8", stamp: "japan" },
  { slug: "japan2", name: "Japan 2", bg: "#7F2421", ink: "#f3ead8", stamp: "japan2" },
  { slug: "srilanka", name: "Sri Lanka", bg: "#015E4B", ink: "#f3ead8", stamp: "srilanka" },
  { slug: "thailand", name: "Thailand", bg: "#1C4E53", ink: "#f3ead8", stamp: "thailand" },
  { slug: "vietnam", name: "Vietnam", bg: "#7E2420", ink: "#f3ead8", stamp: "vietnam" },
  { slug: "greece", name: "Greece", bg: "#0D66B4", ink: "#f3ead8", stamp: "greece" },
  { slug: "singapore", name: "Singapore", bg: "#21466A", ink: "#f3ead8", stamp: "singapore" },
  { slug: "australia", name: "Australia", bg: "#F1ECE4", ink: "#262220", stamp: "australia" },
  { slug: "dubai", name: "Dubai", bg: "#22476B", ink: "#f3ead8", stamp: "dubai" },
  { slug: "malaysia", name: "Malaysia", bg: "#015E4B", ink: "#f3ead8", stamp: "malaysia" },
  { slug: "maldives", name: "Maldives", bg: "#F1C66D", ink: "#262220", stamp: "maldives" },
  { slug: "london", name: "London", bg: "#1D4E54", ink: "#f3ead8", stamp: "london" },
  { slug: "newyork", name: "New York", bg: "#135C5C", ink: "#f3ead8", stamp: "newyork" },
  { slug: "usa", name: "USA", bg: "#753429", ink: "#f3ead8", stamp: "usa" },
  { slug: "paris", name: "Paris", bg: "#F2D9A3", ink: "#262220", stamp: "paris" },
  { slug: "paris2", name: "Paris 2", bg: "#21466A", ink: "#f3ead8", stamp: "paris2" },
  { slug: "switzerland", name: "Switzerland", bg: "#21466A", ink: "#f3ead8", stamp: "switzerland" },
  { slug: "georgia", name: "Georgia", bg: "#135C5C", ink: "#f3ead8", stamp: "georgia" },
  { slug: "turkey", name: "Turkey", bg: "#FA8F49", ink: "#262220", stamp: "turkey" },
  { slug: "turkey2", name: "Turkey 2", bg: "#344552", ink: "#f3ead8", stamp: "turkey2" },
  { slug: "nepal", name: "Nepal", bg: "#4E6031", ink: "#f3ead8", stamp: "nepal" },
  { slug: "spain", name: "Spain", bg: "#D98973", ink: "#262220", stamp: "spain" },
  { slug: "hongkong", name: "Hong Kong", bg: "#091F38", ink: "#f3ead8", stamp: "hongkong" },
  { slug: "amsterdam", name: "Amsterdam", bg: "#E7D9BE", ink: "#262220", stamp: "amsterdam" },
  { slug: "egypt", name: "Egypt", bg: "#FABE67", ink: "#262220", stamp: "egypt" },
  { slug: "beach", name: "Beach", bg: "#FABE68", ink: "#262220", stamp: "beach" },
  { slug: "mountains", name: "Mountains", bg: "#145D5C", ink: "#f3ead8", stamp: "mountains" },
  { slug: "hills", name: "Hills", bg: "#B8BB1B", ink: "#262220", stamp: "hills" },
  { slug: "scuba", name: "Scuba", bg: "#1D4E54", ink: "#f3ead8", stamp: "scuba" },
  { slug: "northeast", name: "Northeast", bg: "#025F4C", ink: "#f3ead8", stamp: "northeast" },
  { slug: "nightlife", name: "Nightlife", bg: "#091F39", ink: "#f3ead8", stamp: "nightlife" },];

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
