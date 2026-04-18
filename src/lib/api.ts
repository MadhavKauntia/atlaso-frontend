const BASE = "http://localhost:8080/api";

export interface Trip {
  id: string;
  name: string;
  destination: string | null;
  status: string;
  createdAt: string;
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
  status: string;
  generatedAt: string;
  pdfUrl: string | null;
  pages: PageData[];
}

export interface BulkUploadResponse {
  uploaded: Photo[];
  failed: { filename: string; error: string }[];
}

export async function createTrip(name: string, destination: string): Promise<Trip> {
  const res = await fetch(`${BASE}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, destination }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadPhotos(tripId: string, files: File[]): Promise<BulkUploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const res = await fetch(`${BASE}/trips/${tripId}/photos/bulk`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPhotos(tripId: string): Promise<Photo[]> {
  const res = await fetch(`${BASE}/trips/${tripId}/photos`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getPhotoImageUrl(tripId: string, photoId: string): string {
  return `${BASE}/trips/${tripId}/photos/${photoId}/image`;
}

export async function rotatePhoto(tripId: string, photoId: string, degrees = 90): Promise<Photo> {
  const res = await fetch(`${BASE}/trips/${tripId}/photos/${photoId}/rotate?degrees=${degrees}`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deletePhoto(tripId: string, photoId: string): Promise<void> {
  const res = await fetch(`${BASE}/trips/${tripId}/photos/${photoId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function generateBook(tripId: string): Promise<Book> {
  const res = await fetch(`${BASE}/trips/${tripId}/book/generate`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function regenerateBook(bookId: string): Promise<Book> {
  const res = await fetch(`${BASE}/books/${bookId}/regenerate`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBook(bookId: string): Promise<Book> {
  const res = await fetch(`${BASE}/books/${bookId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function exportBook(bookId: string): Promise<Book> {
  const res = await fetch(`${BASE}/books/${bookId}/export`, { method: "POST" });
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
  const res = await fetch(`${BASE}/pages/${pageId}/slots/${slotIndex}/offset`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offsetX, offsetY }),
  });
  if (!res.ok) throw new Error(await res.text());
}
