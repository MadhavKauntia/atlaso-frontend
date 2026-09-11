import { getToken, removeToken } from "@/lib/auth";
import { IS_MOCK, mockBook, mockPhotoUrl, mockTrip } from "@/lib/mock";

const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api`;

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const existingHeaders = (options.headers as Record<string, string>) ?? {};
  const headers = token
    ? { ...existingHeaders, Authorization: `Bearer ${token}` }
    : existingHeaders;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    removeToken();
    window.location.href = "/login";
  }
  return res;
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
  status: string;
  generatedAt: string;
  pages: PageData[];
}

export interface BulkUploadResponse {
  uploaded: Photo[];
  failed: { filename: string; error: string }[];
}

export async function googleAuth(idToken: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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
  return res.json();
}

export async function claimTrip(tripId: string): Promise<Trip> {
  if (IS_MOCK) return mockTrip(tripId);
  const res = await apiFetch(`${BASE}/trips/${tripId}/claim`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function markTripOrdered(tripId: string): Promise<Trip> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/order`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
}

/** Creates a Razorpay order server-side. `amount` is in the smallest unit (paise). */
export async function createRazorpayOrder(
  amount: number,
  currency = "INR",
  receipt?: string
): Promise<RazorpayOrder> {
  const res = await apiFetch(`${BASE}/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, currency, receipt }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Verifies a Razorpay payment signature server-side; marks the trip ordered on success. */
export async function verifyRazorpayPayment(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  tripId?: string;
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
  const res = await apiFetch(`${BASE}/trips/${tripId}`);
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

export async function uploadPhoto(tripId: string, file: File): Promise<Photo> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadPhotos(tripId: string, files: File[]): Promise<BulkUploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos/bulk`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface InitiateUploadRequest {
  filename: string;
  contentType: string;
  fileSize: number;
}

export interface InitiateUploadResponse {
  photoId: string;
  storageKey: string;
  uploadUrl: string;
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
}

export async function initiateUploads(tripId: string, files: { filename: string; contentType: string; fileSize: number }[]): Promise<InitiateUploadResponse[]> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

export async function confirmUploads(tripId: string, confirmations: ConfirmUploadRequest[]): Promise<Photo[]> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(confirmations),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPhotos(tripId: string): Promise<Photo[]> {
  const res = await apiFetch(`${BASE}/trips/${tripId}/photos`);
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

export async function generateBook(tripId: string): Promise<Book> {
  if (IS_MOCK) return mockBook(tripId);
  const res = await apiFetch(`${BASE}/trips/${tripId}/book/generate`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function regenerateBook(bookId: string): Promise<Book> {
  if (IS_MOCK) return mockBook("mock-trip", bookId);
  const res = await apiFetch(`${BASE}/books/${bookId}/regenerate`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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

  if (book.coverTemplateId && book.coverPaletteId) {
    try {
      const coverRes = await fetch("/api/covers/export?format=png", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: book.coverTemplateId,
          paletteId: book.coverPaletteId,
          title: book.title,
          subtitle: book.subtitle ?? "",
          volumeNumber: book.version,
        }),
      });
      if (coverRes.ok) {
        const blob = await coverRes.blob();
        coverImageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // Fall through — backend will use plain text cover
    }
  }

  const res = await apiFetch(`${BASE}/books/${book.id}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coverImageBase64: coverImageBase64 ?? null }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getBookPdfUrl(bookId: string): string {
  return `${BASE}/books/${bookId}/pdf`;
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
