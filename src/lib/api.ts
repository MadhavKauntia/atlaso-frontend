import { getToken, removeToken, setCachedUser } from "@/lib/auth";
import { guestTokenHeader, removeGuestToken, setGuestToken } from "@/lib/guest";
import { IS_MOCK, mockBook, mockPhotoUrl, mockTrip } from "@/lib/mock";
import { renderCountryCoverPng, renderCoverBackPng } from "@/lib/covers/renderCountryCover";

const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api`;

async function apiFetch(url: string, options: RequestInit = {}, timeoutMs?: number): Promise<Response> {
  const token = getToken();
  const existingHeaders = (options.headers as Record<string, string>) ?? {};
  const headers = token
    ? { ...existingHeaders, Authorization: `Bearer ${token}` }
    : existingHeaders;
  // Optional per-request timeout so a hung request fails instead of hanging forever.
  const controller = timeoutMs ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const res = await fetch(url, { ...options, headers, signal: controller?.signal ?? options.signal });
    if (res.status === 401) {
      removeToken();
      window.location.href = "/login";
    }
    return res;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface User {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
}

export interface Trip {
  id: string;
  name: string;
  destination: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  tripId: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  metadata: { width: number; height: number };
  rotation: number;
  uploadedAt: string;
  /** Direct (presigned) URL to the image, so the browser skips the backend redirect. */
  imageUrl?: string | null;
  /** Direct (presigned) URL to a small (~360px) thumbnail. Falls back to imageUrl when absent. */
  thumbnailUrl?: string | null;
}

export interface PhotoSlot {
  photoId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  caption: string | null;
  rotation: number;
  offsetX: number | null;
  offsetY: number | null;
}

export interface PageData {
  id: string;
  pageNumber: number;
  layout: string;
  slots: PhotoSlot[];
}

export interface Book {
  id: string;
  tripId: string;
  version: number;
  title: string;
  subtitle: string | null;
  coverTemplateId: string | null;
  coverPaletteId: string | null;
  coverCountry: string | null;
  status: string;
  generatedAt: string;
  pages: PageData[];
}

export async function googleAuth(idToken: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data: { token: string; user: User } = await res.json();
  setCachedUser(data.user);
  return data;
}

export async function getMe(): Promise<User> {
  const res = await apiFetch(`${BASE}/auth/me`);
  if (!res.ok) throw new Error(await res.text());
  const user: User = await res.json();
  setCachedUser(user);
  return user;
}

export async function getTrips(): Promise<Trip[]> {
  const res = await apiFetch(`${BASE}/trips`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteTripById(tripId: string): Promise<void> {
  const res = await apiFetch(`${BASE}/trips/${tripId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function createTrip(name: string, destination: string): Promise<Trip> {
  const res = await apiFetch(`${BASE}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, destination }),
  });
  if (!res.ok) throw new Error(await res.text());
  // The create response carries a one-time guest token; keep it for later guest operations.
  const trip = (await res.json()) as Trip & { guestToken?: string };
  if (trip.id && trip.guestToken) setGuestToken(trip.id, trip.guestToken);
  return trip;
}

export async function claimTrip(tripId: string): Promise<Trip> {
  if (IS_MOCK) return mockTrip(tripId);
  const res = await apiFetch(`${BASE}/trips/${tripId}/claim`, {
    method: "POST",
    headers: guestTokenHeader(tripId),
  });
  if (!res.ok) throw new Error(await res.text());
  // The trip is now owned via JWT; the guest token was revoked server-side.
  removeGuestToken(tripId);
  return res.json();
}

export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
}

export interface CouponPreview {
  valid: boolean;
  code: string;
  discountMinor: number; // paise saved (preview)
  finalMinor: number; // paise payable (preview)
  message?: string; // reason when !valid
}

/** Validates a coupon code and previews the discount for the given quantity. */
export async function validateCoupon(code: string, quantity = 1): Promise<CouponPreview> {
  const res = await apiFetch(`${BASE}/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, quantity }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Creates a Razorpay order. The price is computed server-side from tripId + quantity (+ coupon)
 * — the client no longer sends an amount. Returns the order with the server-computed amount.
 */
export async function createRazorpayOrder(
  tripId: string,
  quantity: number,
  couponCode?: string
): Promise<RazorpayOrder> {
  const res = await apiFetch(`${BASE}/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tripId, quantity, couponCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? (await res.text().catch(() => "Failed to create order")));
  }
  return res.json();
}

/** Verifies a Razorpay payment signature server-side; marks the trip ordered on success. */
export async function verifyRazorpayPayment(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  tripId?: string;
  quantity?: number;
  couponCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
}): Promise<{ verified: boolean }> {
  const res = await apiFetch(`${BASE}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Payment verification failed");
  }
  return res.json();
}

export async function getTrip(tripId: string): Promise<Trip> {
  if (IS_MOCK) return mockTrip(tripId);
  const res = await apiFetch(`${BASE}/trips/${tripId}`, { headers: guestTokenHeader(tripId) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateTrip(tripId: string, name?: string, destination?: string): Promise<Trip> {
  if (IS_MOCK) return { ...mockTrip(tripId), name: name ?? "", destination: destination ?? null };
  const res = await apiFetch(`${BASE}/trips/${tripId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, destination }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveCoverConfig(
  bookId: string,
  templateId: string,
  paletteId: string
): Promise<Book> {
  if (IS_MOCK) return { ...mockBook("mock-trip", bookId), coverTemplateId: templateId, coverPaletteId: paletteId };
  const res = await apiFetch(`${BASE}/books/${bookId}/cover`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId, paletteId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Persists the chosen country (illustrated stamp cover) and optional description on the book. */
export async function saveCoverCountry(bookId: string, country: string, subtitle?: string): Promise<Book> {
  if (IS_MOCK) return { ...mockBook("mock-trip", bookId), coverCountry: country, subtitle: subtitle ?? null };
  const res = await apiFetch(`${BASE}/books/${bookId}/cover`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country, subtitle }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Photo upload is exclusively via the presigned initiate → S3 PUT → confirm flow
// below (see usePhotoUpload). The legacy direct-multipart routes were removed from
// the backend because they bypassed the quota lock and real-image validation.

interface InitiateUploadRequest {
  filename: string;
  contentType: string;
  fileSize: number;
  thumbnailFileSize?: number | null;
}

export interface InitiateUploadResponse {
  photoId: string;
  storageKey: string;
  uploadUrl: string;
  thumbnailStorageKey?: string | null;
  thumbnailUploadUrl?: string | null;
}

export interface ConfirmUploadRequest {
  photoId: string;
  storageKey: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  width: number;
  height: number;
  takenAt: number | null;
  latitude: number | null;
  longitude: number | null;
  sharpness?: number | null;
  thumbnailStorageKey?: string | null;
}

export async function initiateUploads(tripId: string, files: InitiateUploadRequest[]): Promise<InitiateUploadResponse[]> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...guestTokenHeader(tripId) },
    body: JSON.stringify(files),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function uploadToS3(uploadUrl: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

/** Fire-and-forget PUT of a thumbnail blob to its presigned URL (no progress). */
export function uploadBlobToS3(uploadUrl: string, blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Thumbnail upload failed: ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Thumbnail upload failed")));
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", blob.type || "image/jpeg");
    xhr.send(blob);
  });
}

export async function confirmUploads(tripId: string, confirmations: ConfirmUploadRequest[]): Promise<Photo[]> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...guestTokenHeader(tripId) },
    body: JSON.stringify(confirmations),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPhotos(tripId: string): Promise<Photo[]> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos`, { headers: guestTokenHeader(tripId) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getPhotoImageUrl(tripId: string, photoId: string): string {
  if (IS_MOCK) return mockPhotoUrl(photoId);
  return `${BASE}/trips/${tripId}/photos/${photoId}/image`;
}

export async function rotatePhoto(tripId: string, photoId: string, degrees = 90): Promise<Photo> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos/${photoId}/rotate?degrees=${degrees}`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deletePhoto(tripId: string, photoId: string): Promise<void> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos/${photoId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

// Generation is asynchronous: these return quickly with a book in GENERATING status.
// Callers poll pollBookUntilReady() to know when the pages are actually built.
const GENERATE_REQUEST_TIMEOUT_MS = 60_000;

export async function generateBook(
  tripId: string,
  cover?: { country?: string; subtitle?: string }
): Promise<Book> {
  if (IS_MOCK) return { ...mockBook(tripId), coverCountry: cover?.country ?? null };
  // Send the chosen cover country at creation so it's persisted server-side before generation
  // finishes and the ready-email is sent — otherwise a cold load from the email link (after the
  // user left the generating tab) has no cover country and renders a blank cover.
  const res = await apiFetch(
    `${BASE}/trips/${tripId}/book/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: cover?.country, subtitle: cover?.subtitle }),
    },
    GENERATE_REQUEST_TIMEOUT_MS
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function regenerateBook(bookId: string): Promise<Book> {
  if (IS_MOCK) return mockBook("mock-trip", bookId);
  const res = await apiFetch(`${BASE}/books/${bookId}/regenerate`, { method: "POST" }, GENERATE_REQUEST_TIMEOUT_MS);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Polls a book until generation finishes. Resolves when status is READY_FOR_PREVIEW
 * (or a later state), throws on FAILED or after the overall deadline. Transient fetch
 * errors are retried rather than aborting the wait.
 */
export async function pollBookUntilReady(
  bookId: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<Book> {
  if (IS_MOCK) return mockBook("mock-trip", bookId);
  const intervalMs = opts.intervalMs ?? 3000;
  // A full 1000-photo trip analyses for ~24 min (one vision call per photo), so give a
  // generous window before giving up. Generation continues on the backend regardless.
  const timeoutMs = opts.timeoutMs ?? 30 * 60 * 1000;
  const readyStates = new Set(["READY_FOR_PREVIEW", "EXPORTING_PDF", "PDF_READY"]);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await apiFetch(`${BASE}/books/${bookId}`, {}, 20_000);
      if (res.ok) {
        const book: Book = await res.json();
        if (readyStates.has(book.status)) return book;
        if (book.status === "FAILED") throw new Error("Book generation failed. Please try again.");
      }
    } catch (err) {
      // Re-throw a definitive failure; otherwise treat as transient and keep polling.
      if (err instanceof Error && err.message.startsWith("Book generation failed")) throw err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for your book to finish generating.");
}

export async function getBook(bookId: string): Promise<Book> {
  if (IS_MOCK) return mockBook("mock-trip", bookId);
  const res = await apiFetch(`${BASE}/books/${bookId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBookByTripId(tripId: string): Promise<Book> {
  if (IS_MOCK) return mockBook(tripId);
  const res = await apiFetch(`${BASE}/trips/${tripId}/book`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function exportBook(book: Book): Promise<Book> {
  let coverImageBase64: string | undefined;
  let backImageBase64: string | undefined;

  try {
    coverImageBase64 = await renderCountryCoverPng(book.coverCountry, book.title, book.subtitle ?? "");
    backImageBase64 = await renderCoverBackPng(book.coverCountry);
  } catch {
    // Fall through — backend will use plain text cover
  }

  const res = await apiFetch(`${BASE}/books/${book.id}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coverImageBase64: coverImageBase64 ?? null, backImageBase64: backImageBase64 ?? null }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getBookPdfUrl(bookId: string): string {
  return `${BASE}/books/${bookId}/pdf`;
}

export interface OrderSummary {
  orderNumber: string;
  customerName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  phone: string | null;
}

/** The paid order + shipping address for a trip's confirmation page. */
export async function getOrderForTrip(tripId: string): Promise<OrderSummary> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/order`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Downloads the payment receipt PDF for a trip's order (auth-protected). */
export async function downloadReceipt(tripId: string): Promise<void> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/receipt`);
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `atlaso-receipt.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function updateSlotOffset(
  pageId: string,
  slotIndex: number,
  offsetX: number,
  offsetY: number
): Promise<void> {
  if (IS_MOCK) return;
  const res = await apiFetch(`${BASE}/pages/${pageId}/slots/${slotIndex}/offset`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offsetX, offsetY }),
  });
  if (!res.ok) throw new Error(await res.text());
}

/** Replaces the photo shown in a page slot with another photo from the trip. */
export async function updateSlotPhoto(
  pageId: string,
  slotIndex: number,
  photoId: string
): Promise<void> {
  if (IS_MOCK) return;
  const res = await apiFetch(`${BASE}/pages/${pageId}/slots/${slotIndex}/photo`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoId }),
  });
  if (!res.ok) throw new Error(await res.text());
}
