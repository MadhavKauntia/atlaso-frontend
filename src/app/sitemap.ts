import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { DESTINATIONS } from "@/lib/destinations";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  });
  return [
    page("", 1, "weekly"),
    page("/how-it-works", 0.8),
    page("/photobook", 0.8),
    ...DESTINATIONS.map((d) => page(`/photobook/${d.path}`, 0.7)),
    page("/faq", 0.6),
    page("/contact", 0.4, "yearly"),
    page("/shipping", 0.3, "yearly"),
    page("/refund", 0.3, "yearly"),
    page("/privacy", 0.2, "yearly"),
    page("/terms", 0.2, "yearly"),
  ];
}
