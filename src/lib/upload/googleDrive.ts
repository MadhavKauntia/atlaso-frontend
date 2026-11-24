// Import photos from a public ("Anyone with the link") Google Drive folder.
//
// Uses the Drive v3 REST API with a browser API key only (no OAuth): it can read
// files that are shared publicly, which covers the common "here's the trip
// folder" link. Files are listed up front from metadata, but each one is only
// downloaded when the upload pool reaches it, so a 1000-photo folder never sits
// in memory all at once. Downloads become ordinary File objects and go through
// the exact same HEIC/downscale/S3 pipeline as dropped files.

import { ApiError } from "@/lib/api";
import { isAllowedImage, MAX_PHOTOS } from "@/lib/upload/pipeline";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
const DRIVE = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

// Subfolders are walked (trip folders are often split per day), but bounded so a
// link to someone's whole Drive can't turn into thousands of list calls.
const MAX_DEPTH = 4;
const MAX_FOLDERS = 200;

export const isDriveImportEnabled = API_KEY.length > 0;

/** A Drive image that hasn't been downloaded yet. `load()` fetches it as a File. */
export interface RemoteImage {
  remote: true;
  name: string;
  type: string;
  size: number;
  load: () => Promise<File>;
}

export interface DriveLink {
  id: string;
  kind: "folder" | "file" | "unknown";
  resourceKey?: string;
}

/** A Drive failure with a message that's safe to show the user as is. */
export class DriveImportError extends Error {}

/**
 * Pulls the folder/file id (and legacy resource key) out of the many shapes a
 * Drive link comes in. Returns null if it doesn't look like a Drive link.
 */
export function parseDriveLink(input: string): DriveLink | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "drive.google.com" && host !== "docs.google.com") return null;

  const resourceKey = url.searchParams.get("resourcekey") ?? undefined;
  const path = url.pathname;
  const folder = path.match(/\/folders\/([A-Za-z0-9_-]{10,})/);
  if (folder) return { id: folder[1], kind: "folder", resourceKey };
  const file = path.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/) ?? path.match(/\/d\/([A-Za-z0-9_-]{10,})/);
  if (file) return { id: file[1], kind: "file", resourceKey };
  const idParam = url.searchParams.get("id");
  if (idParam && /^[A-Za-z0-9_-]{10,}$/.test(idParam)) return { id: idParam, kind: "unknown", resourceKey };
  return null;
}

/** Whether the text is a Google Photos link, which the Drive API can't read. */
export function isGooglePhotosLink(input: string): boolean {
  return /(^|\/\/|\.)photos\.(app\.goo\.gl|google\.com)/i.test(input.trim());
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  resourceKey?: string;
}

function headersFor(id: string, resourceKey?: string): HeadersInit | undefined {
  // Older shared links need their resource key passed alongside the id.
  return resourceKey ? { "X-Goog-Drive-Resource-Keys": `${id}/${resourceKey}` } : undefined;
}

/** Turns a Drive error response into an ApiError (retryable) or DriveImportError (final). */
async function driveError(res: Response, context: "folder" | "file"): Promise<never> {
  let reason = "";
  let message = "";
  try {
    const body = await res.json();
    reason = body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? "";
    message = body?.error?.message ?? "";
  } catch { /* non-JSON body */ }

  // Rate limits come back as 403; surface them as 429 so withRetry backs off.
  if (res.status === 429 || /rateLimitExceeded|userRateLimitExceeded/i.test(reason)) {
    throw new ApiError(429, "Google Drive is rate limiting us. Retrying shortly.");
  }
  if (res.status >= 500) throw new ApiError(res.status, "Google Drive had a problem. Please try again.");
  if (res.status === 404) {
    throw new DriveImportError(context === "folder"
      ? "We couldn't open that folder. In Google Drive, set its sharing to \"Anyone with the link\" and try again."
      : "We couldn't open this photo. It may no longer be shared publicly.");
  }
  if (/downloadQuotaExceeded/i.test(reason)) {
    throw new DriveImportError("Google Drive has paused downloads for this file. Try again later or upload it directly.");
  }
  if (/keyInvalid|accessNotConfigured|API_KEY|referer|referrer|SERVICE_DISABLED|denied on the service/i.test(`${reason} ${message}`)) {
    console.error("[drive] API key rejected", reason, message);
    throw new DriveImportError("Google Drive import isn't available right now. Please upload your photos directly.");
  }
  throw new DriveImportError(context === "folder"
    ? "We couldn't read that Google Drive link. Check that it's shared with \"Anyone with the link\"."
    : "We couldn't download this photo from Google Drive.");
}

async function driveFetch(url: string, init: RequestInit | undefined, context: "folder" | "file"): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, "Network problem while reaching Google Drive.");
  }
  if (!res.ok) await driveError(res, context);
  return res;
}

async function getMetadata(id: string, resourceKey?: string): Promise<DriveFile> {
  const params = new URLSearchParams({
    key: API_KEY,
    fields: "id,name,mimeType,size,resourceKey",
    supportsAllDrives: "true",
  });
  const res = await driveFetch(`${DRIVE}/${encodeURIComponent(id)}?${params}`, { headers: headersFor(id, resourceKey) }, "folder");
  return res.json();
}

async function listChildren(folderId: string, resourceKey?: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      key: API_KEY,
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,size,resourceKey)",
      pageSize: "1000",
      orderBy: "name_natural",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await driveFetch(`${DRIVE}?${params}`, { headers: headersFor(folderId, resourceKey) }, "folder");
    const body: { files?: DriveFile[]; nextPageToken?: string } = await res.json();
    out.push(...(body.files ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return out;
}

function toRemoteImage(f: DriveFile): RemoteImage {
  return {
    remote: true,
    name: f.name,
    type: f.mimeType,
    size: Number(f.size ?? 0),
    load: async () => {
      const params = new URLSearchParams({ key: API_KEY, alt: "media", supportsAllDrives: "true" });
      const res = await driveFetch(`${DRIVE}/${encodeURIComponent(f.id)}?${params}`, { headers: headersFor(f.id, f.resourceKey) }, "file");
      const blob = await res.blob();
      // Prefer Drive's MIME type: the response's own type can be a generic octet-stream.
      return new File([blob], f.name, { type: f.mimeType.startsWith("image/") ? f.mimeType : blob.type });
    },
  };
}

export interface DriveListing {
  /** The folder's (or single file's) name, for the status message. */
  name: string;
  images: RemoteImage[];
  /** Non-image files that were skipped (videos, docs, etc.). */
  skipped: number;
}

/**
 * Resolves a Drive link to the images it contains (walking subfolders), without
 * downloading any of them. Throws DriveImportError with a user-facing message.
 */
export async function listDriveImages(link: DriveLink): Promise<DriveListing> {
  if (!isDriveImportEnabled) throw new DriveImportError("Google Drive import isn't set up yet.");

  let root: DriveFile;
  try {
    root = await getMetadata(link.id, link.resourceKey);
  } catch (err) {
    if (err instanceof ApiError) throw new DriveImportError("We couldn't reach Google Drive. Check your connection and try again.");
    throw err;
  }

  if (root.mimeType !== FOLDER_MIME) {
    if (!isAllowedImage({ name: root.name, type: root.mimeType })) {
      throw new DriveImportError("That link points to a file that isn't a photo. Paste a link to a folder of photos instead.");
    }
    return { name: root.name, images: [toRemoteImage(root)], skipped: 0 };
  }

  const images: RemoteImage[] = [];
  let skipped = 0;
  let foldersSeen = 0;
  // Breadth-first so photos at the top of the folder come first.
  const queue: { id: string; resourceKey?: string; depth: number }[] = [{ id: root.id, resourceKey: root.resourceKey ?? link.resourceKey, depth: 0 }];
  try {
    while (queue.length && foldersSeen < MAX_FOLDERS && images.length < MAX_PHOTOS * 2) {
      const folder = queue.shift()!;
      foldersSeen++;
      const children = await listChildren(folder.id, folder.resourceKey);
      for (const c of children) {
        if (c.mimeType === FOLDER_MIME) {
          if (folder.depth + 1 <= MAX_DEPTH) queue.push({ id: c.id, resourceKey: c.resourceKey, depth: folder.depth + 1 });
        } else if (isAllowedImage({ name: c.name, type: c.mimeType })) {
          images.push(toRemoteImage(c));
        } else {
          skipped++;
        }
      }
    }
  } catch (err) {
    if (err instanceof ApiError) throw new DriveImportError("We lost connection to Google Drive while reading the folder. Please try again.");
    throw err;
  }

  return { name: root.name, images, skipped };
}
