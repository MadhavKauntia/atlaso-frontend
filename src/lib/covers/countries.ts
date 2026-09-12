/**
 * Country covers: each country has an illustrated stamp cover. Countries with
 * bundled art (`art`) render the illustration; the rest fall back to a solid
 * spine-coloured cover with the book title.
 */
export interface CoverCountry {
  /** stable slug stored on the book (`book.coverCountry`) */
  slug: string;
  name: string;
  /** spine colour */
  spine: string;
  /** text colour used on the fallback cover */
  ink: string;
  /** whether an illustrated cover jpg exists at /assets/covers/{art}.jpg */
  art?: string;
}

export const COUNTRIES: CoverCountry[] = [
  { slug: "bali", name: "Bali", spine: "#2c4230", ink: "#f3ead8", art: "bali" },
  { slug: "italy", name: "Italy", spine: "#f3b53f", ink: "#262220", art: "italy" },
  { slug: "thailand", name: "Thailand", spine: "#2ba3bd", ink: "#f3ead8", art: "thailand" },
  { slug: "srilanka", name: "Sri Lanka", spine: "#0d6152", ink: "#f3ead8", art: "srilanka" },
  { slug: "japan", name: "Japan", spine: "#b04a42", ink: "#f3ead8", art: "japan" },
  { slug: "vietnam", name: "Vietnam", spine: "#42609f", ink: "#f3ead8", art: "vietnam" },
  { slug: "greece", name: "Greece", spine: "#2489a3", ink: "#f3ead8", art: "greece" },
  { slug: "switzerland", name: "Switzerland", spine: "#41599c", ink: "#f3ead8", art: "switzerland" },
  { slug: "portugal", name: "Portugal", spine: "#c9352c", ink: "#f3ead8" },
  { slug: "morocco", name: "Morocco", spine: "#e2631f", ink: "#f3ead8" },
  { slug: "iceland", name: "Iceland", spine: "#1a63b8", ink: "#f3ead8" },
  { slug: "peru", name: "Peru", spine: "#1e8a5f", ink: "#f3ead8" },
];

export function getCountry(slug: string | null | undefined): CoverCountry | undefined {
  if (!slug) return undefined;
  return COUNTRIES.find((c) => c.slug === slug);
}

/** Public URL of a country's illustrated cover, or null if it has no art. */
export function countryArtUrl(country: CoverCountry | undefined): string | null {
  return country?.art ? `/assets/covers/${country.art}.jpg` : null;
}
