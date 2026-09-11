/// <reference lib="webworker" />
// Off-main-thread HEIC → JPEG conversion. Tries the browser's native decoder
// first (fast on Safari/iOS, which decode HEIC natively even inside a worker),
// and falls back to heic-to (libheif-wasm) elsewhere. The result is downscaled
// so uploads stay small and encoding is quick.
import { heicTo } from "heic-to";

interface ConvertRequest {
  id: number;
  buffer: ArrayBuffer;
  type: string;
  maxEdge: number;
  quality: number;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<ConvertRequest>) => {
  const { id, buffer, type, maxEdge, quality } = e.data;
  try {
    const srcBlob = new Blob([buffer], { type: type || "image/heic" });
    const bitmap = await decode(srcBlob, quality);
    const out = await encode(bitmap, maxEdge, quality);
    bitmap.close();
    const outBuffer = await out.arrayBuffer();
    ctx.postMessage({ id, ok: true, buffer: outBuffer }, [outBuffer]);
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: String(err) });
  }
};

async function decode(blob: Blob, quality: number): Promise<ImageBitmap> {
  try {
    // Native path — instant where the platform can decode HEIC.
    return await createImageBitmap(blob);
  } catch {
    const jpeg = await heicTo({ blob, type: "image/jpeg", quality });
    return await createImageBitmap(jpeg);
  }
}

async function encode(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(w, h);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d context");
  context.drawImage(bitmap, 0, 0, w, h);
  return canvas.convertToBlob({ type: "image/jpeg", quality });
}

export {};
