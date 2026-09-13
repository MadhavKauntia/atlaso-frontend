import type { Book, Photo } from "./api";

/**
 * In-memory cache of the preview page's data, so returning to preview (e.g.
 * after editing the cover) renders instantly from the last-known state and
 * refreshes in the background, instead of showing a full-screen loading spinner
 * and re-fetching everything (including the whole photos list).
 *
 * Module-level, so it survives client-side navigation for the session.
 */
interface Entry {
  book?: Book;
  photos?: Photo[];
}

const cache = new Map<string, Entry>();

export function getPreviewCache(key: string): Entry | undefined {
  return key ? cache.get(key) : undefined;
}

export function setPreviewBook(key: string, book: Book): void {
  if (!key) return;
  const entry = cache.get(key) ?? {};
  entry.book = book;
  cache.set(key, entry);
}

export function setPreviewPhotos(key: string, photos: Photo[]): void {
  if (!key) return;
  const entry = cache.get(key) ?? {};
  entry.photos = photos;
  cache.set(key, entry);
}
