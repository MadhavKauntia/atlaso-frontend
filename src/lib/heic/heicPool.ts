// A small pool of Web Workers that convert HEIC → downscaled JPEG in parallel,
// off the main thread. Sized to the machine's core count (capped) so a batch of
// photos decodes across cores instead of serializing on the UI thread.

export interface HeicConvertOptions {
  maxEdge?: number;
  quality?: number;
}

interface Job {
  buffer: ArrayBuffer;
  type: string;
  maxEdge: number;
  quality: number;
  resolve: (blob: Blob) => void;
  reject: (err: unknown) => void;
}

interface WorkerHandle {
  worker: Worker;
  current: { id: number; job: Job } | null;
}

let pool: WorkerHandle[] | null = null;
const queue: Job[] = [];
let nextId = 1;

function poolSize(): number {
  const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
  return Math.max(1, Math.min(4, cores));
}

function ensurePool(): boolean {
  if (typeof window === "undefined" || typeof Worker === "undefined") return false;
  if (pool) return true;
  try {
    pool = Array.from({ length: poolSize() }, () => {
      const worker = new Worker(new URL("./heicConverter.worker.ts", import.meta.url), { type: "module" });
      const handle: WorkerHandle = { worker, current: null };
      worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; buffer?: ArrayBuffer; error?: string }>) => {
        const { id, ok, buffer, error } = e.data;
        if (!handle.current || handle.current.id !== id) return;
        const { job } = handle.current;
        handle.current = null;
        if (ok && buffer) job.resolve(new Blob([buffer], { type: "image/jpeg" }));
        else job.reject(new Error(error ?? "conversion failed"));
        pump();
      };
      worker.onerror = () => {
        if (handle.current) {
          handle.current.job.reject(new Error("worker error"));
          handle.current = null;
        }
        pump();
      };
      return handle;
    });
    return true;
  } catch {
    pool = null;
    return false;
  }
}

function pump(): void {
  if (!pool) return;
  for (const handle of pool) {
    if (handle.current || queue.length === 0) continue;
    const job = queue.shift()!;
    const id = nextId++;
    handle.current = { id, job };
    // Transfer the buffer so it isn't copied into the worker.
    handle.worker.postMessage(
      { id, buffer: job.buffer, type: job.type, maxEdge: job.maxEdge, quality: job.quality },
      [job.buffer]
    );
  }
}

/**
 * Converts a HEIC file to a downscaled JPEG blob using the worker pool.
 * Rejects if no worker pool is available (caller should fall back).
 */
export async function convertHeicBlob(file: File, opts: HeicConvertOptions = {}): Promise<Blob> {
  if (!ensurePool()) throw new Error("worker pool unavailable");
  const maxEdge = opts.maxEdge ?? 3000;
  const quality = opts.quality ?? 0.85;
  const buffer = await file.arrayBuffer();
  return new Promise<Blob>((resolve, reject) => {
    queue.push({ buffer, type: file.type, maxEdge, quality, resolve, reject });
    pump();
  });
}
