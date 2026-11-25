// Site-wide facts used by metadata, structured data and the marketing pages.
// Keep these in sync with checkout (BOOK_PRICE there) and the FAQ copy.

export const SITE_URL = "https://myatlaso.com";
export const SITE_NAME = "Atlaso";

/** Price per copy in rupees, all-inclusive (shipping and taxes). */
export const BOOK_PRICE_INR = 2499;
export const BOOK_PAGES = 50;
export const BOOK_SIZE = "6.9 × 9.8 inch";

export const DEFAULT_TITLE = "Atlaso | Travel Photo Books Made From Your Trip Photos";
export const DEFAULT_DESCRIPTION =
  "Turn your trip photos into a hardbound travel photo book in minutes. Upload your photos, pick a country cover, and we design, print and deliver it across India. ₹2,499, shipping included.";

export function formatInr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Product structured data for the photobook, optionally named for one destination. */
export function productJsonLd(opts: { name: string; description: string; url: string; image: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description,
    image: opts.image.startsWith("http") ? opts.image : `${SITE_URL}${opts.image}`,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: opts.url,
      price: BOOK_PRICE_INR,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

/** Serializes JSON-LD for a <script> tag, escaping "<" so content can't close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
