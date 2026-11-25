import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private pages (trips, account, login, create) stay crawlable but carry a noindex
// tag from their layouts; blocking them here would hide that tag from Google.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
