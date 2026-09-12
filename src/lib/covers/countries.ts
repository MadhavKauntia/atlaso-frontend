/**
 * Country covers. The current model renders a cover as a solid background
 * colour + a text-free stamp illustration + a dynamic title & description.
 * Countries that have a `stamp` use that model. Countries that only have the
 * older baked-text `art` jpg fall back to showing it as-is until a stamp is
 * provided. Countries with neither get a solid title cover.
 */
export interface CoverCountry {
  /** stable slug stored on the book (`book.coverCountry`) */
  slug: string;
  name: string;
  /** spine colour */
  spine: string;
  /** text colour for the title/description on the cover */
  ink: string;
  /** cover background colour (used with `stamp`) */
  bg?: string;
  /** text-free stamp illustration at /assets/stamps/{stamp}.png */
  stamp?: string;
  /** legacy baked-text cover jpg at /assets/covers/{art}.jpg */
  art?: string;
}

export const COUNTRIES: CoverCountry[] = [
  { slug: "japan", name: "Japan", spine: "#b04a42", ink: "#f3ead8", bg: "#ac4040", stamp: "japan" },
];

export function getCountry(slug: string | null | undefined): CoverCountry | undefined {
  if (!slug) return undefined;
  return COUNTRIES.find((c) => c.slug === slug);
}

/** Public URL of a country's text-free stamp illustration, or null. */
export function stampUrl(country: CoverCountry | undefined): string | null {
  return country?.stamp ? `/assets/stamps/${country.stamp}.png` : null;
}

/** Public URL of a country's legacy baked-text cover jpg, or null. */
export function countryArtUrl(country: CoverCountry | undefined): string | null {
  return country?.art ? `/assets/covers/${country.art}.jpg` : null;
}
