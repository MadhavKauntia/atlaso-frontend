// Site-wide facts used by metadata, structured data and the marketing pages.
// Keep these in sync with checkout (BOOK_PRICE there) and the FAQ copy.

export const SITE_URL = "https://myatlaso.com";
export const SITE_NAME = "Atlaso";

/**
 * Price per copy in rupees, all-inclusive (shipping and taxes). This is what the
 * backend charges (Pricing.UNIT_PRICE_MINOR). During the launch offer it's the
 * discounted price; BOOK_LIST_PRICE_INR is the regular price after the offer.
 * When the offer ends: set BOOK_PRICE_INR = BOOK_LIST_PRICE_INR here and in the
 * backend, and LAUNCH_OFFER_ACTIVE = false. The struck-through price must be a
 * price we genuinely charge afterwards (consumer protection rules).
 */
export const BOOK_PRICE_INR = 2499;
export const BOOK_LIST_PRICE_INR = 2999;
export const LAUNCH_OFFER_ACTIVE = true;
export const LAUNCH_OFFER_STARTS = "2026-11-25";
export const LAUNCH_OFFER_ENDS = "2026-12-31";
export const LAUNCH_OFFER_ENDS_LABEL = "31 December";
export const BOOK_PAGES = 50;
export const BOOK_SIZE = "6.9 × 9.8 inch";

export const DEFAULT_TITLE = "Atlaso | Travel Photo Books Made From Your Trip Photos";
export const DEFAULT_DESCRIPTION =
  "Turn your trip photos into a hardbound travel photo book in minutes. Upload your photos, pick a country cover, and we design, print and deliver it across India. ₹2,499 launch price, shipping included.";

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
      // Sale price: Google wants the start and end, plus the regular price as a strikethrough.
      ...(LAUNCH_OFFER_ACTIVE
        ? {
            validFrom: `${LAUNCH_OFFER_STARTS}T00:00:00+05:30`,
            priceValidUntil: LAUNCH_OFFER_ENDS,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              priceType: "https://schema.org/StrikethroughPrice",
              price: BOOK_LIST_PRICE_INR,
              priceCurrency: "INR",
            },
          }
        : {}),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
      // Free delivery across India: printed in about 3 days, then 4 to 7 in transit (the
      // "7 to 10 days" promised on the site and in the FAQ).
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "INR" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 3, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 4, maxValue: 7, unitCode: "DAY" },
        },
      },
      // Made to order, so no returns (see /refund). Damaged or misprinted books are reprinted free.
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
        merchantReturnLink: `${SITE_URL}/refund`,
      },
    },
  };
}

/** Serializes JSON-LD for a <script> tag, escaping "<" so content can't close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
