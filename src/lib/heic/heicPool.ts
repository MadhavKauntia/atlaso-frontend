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
  current: { id: number; job: Job; timer: ReturnType<typeof setTimeout> } | null;
}

// A conversion that hasn't finished in this long is treated as hung (e.g. the worker
// was OOM-killed on a low-memory phone, which fires no event) so the photo falls back
// to the other decoders instead of sitting on "Converting" forever.
const JOB_TIMEOUT_MS = 90_000;

let pool: WorkerHandle[] | null = null;
const queue: Job[] = [];
let nextId = 1;

function poolSize(): number {
  const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
  return Math.max(1, Math.min(4, cores));
}

function spawn(handle: WorkerHandle): void {
  const worker = new Worker(new URL("./heicConverter.worker.ts", import.meta.url), { type: "module" });
  handle.worker = worker;
  worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; buffer?: ArrayBuffer; error?: string }>) => {
    const { id, ok, buffer, error } = e.data;
    if (!handle.current || handle.current.id !== id) return;
    const { job, timer } = handle.current;
    clearTimeout(timer);
    handle.current = null;
    if (ok && buffer) job.resolve(new Blob([buffer], { type: "image/jpeg" }));
    else job.reject(new Error(error ?? "conversion failed"));
    pump();
  };
  worker.onerror = () => {
    if (handle.current) {
      clearTimeout(handle.current.timer);
      handle.current.job.reject(new Error("worker error"));
      handle.current = null;
    }
    pump();
  };
}

function ensurePool(): boolean {
  if (typeof window === "undefined" || typeof Worker === "undefined") return false;
  if (pool) return true;
  try {
    pool = Array.from({ length: poolSize() }, () => {
      const handle = { current: null } as unknown as WorkerHandle;
      spawn(handle);
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
    const timer = setTimeout(() => {
      if (handle.current?.id !== id) return;
      handle.current = null;
      job.reject(new Error("HEIC conversion timed out"));
      // The worker may be wedged or dead — replace it so later jobs still get a slot.
      handle.worker.terminate();
      try {
        spawn(handle);
      } catch {
        // Couldn't respawn: drop this slot; remaining workers carry on. If none are left,
        // fail everything still queued so callers fall back to the other decoders.
        pool = pool?.filter((h) => h !== handle) ?? null;
        if (pool && pool.length === 0) {
          while (queue.length) queue.shift()!.reject(new Error("no HEIC workers available"));
        }
      }
      pump();
    }, JOB_TIMEOUT_MS);
    handle.current = { id, job, timer };
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
  if (!ensurePool() || !pool?.length) throw new Error("worker pool unavailable");
  const maxEdge = opts.maxEdge ?? 3000;
  const quality = opts.quality ?? 0.85;
  const buffer = await file.arrayBuffer();
  return new Promise<Blob>((resolve, reject) => {
    queue.push({ buffer, type: file.type, maxEdge, quality, resolve, reject });
    pump();
  });
}
