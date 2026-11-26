/**
 * Page sounds for the landing book preview: real recordings of a book page turning
 * (public/assets/sounds, credits there), played through the Web Audio API so they start
 * instantly and can be nudged in pitch/volume to match how fast the page moves.
 * Loaded when the preview opens (after a click, so audio is allowed).
 */

const MUTE_KEY = "atlaso_page_sound_off";
const TURNS = ["/assets/sounds/page-turn-1.mp3", "/assets/sounds/page-turn-2.mp3"];
const COVER = "/assets/sounds/cover.mp3";

let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<void>>();
let nextTurn = 0;

export function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, "1");
    else localStorage.removeItem(MUTE_KEY);
  } catch { /* storage blocked: the toggle still works for this visit via state */ }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function load(url: string): Promise<void> {
  const ac = audio();
  if (!ac || buffers.has(url)) return Promise.resolve();
  let p = loading.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ac.decodeAudioData(data))
      .then((buf) => { buffers.set(url, buf); })
      .catch(() => { loading.delete(url); });
    loading.set(url, p);
  }
  return p;
}

/** Fetch and decode the sounds ahead of the first turn. */
export function preloadPageSounds(): void {
  if (isMuted()) return;
  [...TURNS, COVER].forEach((u) => { void load(u); });
}

function play(url: string, { rate = 1, volume = 1, delay = 0 } = {}): void {
  if (isMuted()) return;
  const ac = audio();
  if (!ac) return;
  const buf = buffers.get(url);
  if (!buf) { void load(url); return; } // not ready yet: stay quiet rather than play late
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(ac.destination);
  src.start(ac.currentTime + delay);
}

/**
 * One page turning over. speed is 0 (a slow, deliberate turn) to 1 (a flick):
 * faster turns play a touch quicker and louder. Alternates between two recordings.
 */
export function playPageTurn(speed = 0.4): void {
  const s = Math.max(0, Math.min(1, speed));
  const url = TURNS[nextTurn++ % TURNS.length];
  play(url, { rate: 0.92 + s * 0.22 + (Math.random() - 0.5) * 0.06, volume: 0.55 + s * 0.4 });
}

/** The heavier hardcover swinging open or shut. */
export function playCover(delay = 0): void {
  play(COVER, { rate: 1, volume: 0.85, delay });
}
