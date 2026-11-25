// Blog posts live in src/content/blog/{slug}.ts as Markdown strings plus SEO fields.
// Pages are statically generated; the Markdown is ours, so rendering it as HTML is safe.

import { marked } from "marked";
import makePhotoBook from "@/content/blog/how-to-make-a-travel-photo-book";
import choosePhotos from "@/content/blog/how-to-choose-photos-for-a-photo-book";
import honeymoon from "@/content/blog/honeymoon-photo-book-ideas";
import bali from "@/content/blog/bali-photo-book-ideas";
import thailand from "@/content/blog/thailand-photo-book-ideas";
import japan from "@/content/blog/japan-photo-book-ideas";
import dubai from "@/content/blog/dubai-photo-book-ideas";

export interface BlogPost {
  slug: string;
  /** H1 on the page. */
  title: string;
  /** <title>, max ~60 chars before the " | Atlaso" suffix. */
  seoTitle: string;
  /** Meta description, max 160 chars. */
  description: string;
  /** ISO date (YYYY-MM-DD). */
  published: string;
  updated?: string;
  keywords: string[];
  coverAlt: string;
  faqs: { q: string; a: string }[];
  /** Destination page paths (/photobook/{path}) to suggest at the end. */
  related?: string[];
  body: string;
}

export const POSTS: BlogPost[] = [makePhotoBook, choosePhotos, honeymoon, bali, thailand, japan, dubai].sort((a, b) =>
  b.published.localeCompare(a.published),
);

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** marked escapes quotes and ampersands; the TOC renders as React text, so decode them back. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Renders the Markdown body and returns it with the H2s for a table of contents. */
export function renderPost(post: BlogPost): { html: string; toc: { id: string; text: string }[]; minutes: number } {
  const toc: { id: string; text: string }[] = [];
  const html = (marked.parse(post.body, { async: false }) as string).replace(/<h2>(.*?)<\/h2>/g, (_, inner: string) => {
    const id = slugify(inner);
    toc.push({ id, text: decodeEntities(inner.replace(/<[^>]+>/g, "")) });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  const words = post.body.split(/\s+/).length;
  return { html, toc, minutes: Math.max(1, Math.round(words / 220)) };
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
