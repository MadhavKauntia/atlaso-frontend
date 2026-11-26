/**
 * Paper sounds for the landing book preview, synthesised with the Web Audio API
 * (no audio files): a rustle that follows how fast a page is dragged, and a soft
 * flap when it lands. Everything is created lazily after a user gesture.
 */

const MUTE_KEY = "atlaso_page_sound_off";

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

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
  if (typeof window === "undefined" || isMuted()) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === "suspended") void ctx.resume();
  if (!noise) {
    // Two seconds of pink-ish noise: paper sounds are mostly band-limited noise.
    const len = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
    }
  }
  return ctx;
}

function noiseSource(ac: AudioContext, loop = false): AudioBufferSourceNode {
  const src = ac.createBufferSource();
  src.buffer = noise;
  src.loop = loop;
  return src;
}

export interface Rustle {
  /** speed 0..1: how fast the page is moving */
  set(speed: number): void;
  stop(): void;
}

/** A continuous rustle while a page is dragged; louder and brighter when faster. */
export function startRustle(): Rustle | null {
  const ac = audio();
  if (!ac) return null;
  const src = noiseSource(ac, true);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 700;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2200;
  bp.Q.value = 0.8;
  const gain = ac.createGain();
  gain.gain.value = 0;
  src.connect(hp).connect(bp).connect(gain).connect(ac.destination);
  src.start(0, Math.random() * 1.5);
  let stopped = false;
  return {
    set(speed) {
      if (stopped) return;
      const t = ac.currentTime;
      const s = Math.max(0, Math.min(1, speed));
      // A little jitter makes it crinkle instead of hiss.
      gain.gain.setTargetAtTime((0.015 + s * 0.3) * (0.85 + Math.random() * 0.3), t, 0.04);
      bp.frequency.setTargetAtTime(1600 + s * 2600, t, 0.06);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const t = ac.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.05);
      src.stop(t + 0.3);
    },
  };
}

/** The soft slap of a page (or the cover) settling flat. */
export function flap(strength = 1, delayS = 0): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delayS;
  const s = Math.max(0.1, Math.min(1, strength));

  // body: low, muffled whump
  const src = noiseSource(ac);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1800, t);
  lp.frequency.exponentialRampToValueAtTime(300, t + 0.16);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.55 * s, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  src.connect(lp).connect(g).connect(ac.destination);
  src.start(t, Math.random() * 1.5);
  src.stop(t + 0.25);

  // edge: a short papery tick
  const tick = noiseSource(ac);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3000;
  const tg = ac.createGain();
  tg.gain.setValueAtTime(0.0001, t);
  tg.gain.exponentialRampToValueAtTime(0.12 * s, t + 0.004);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  tick.connect(hp).connect(tg).connect(ac.destination);
  tick.start(t, Math.random() * 1.5);
  tick.stop(t + 0.08);
}

/** A whole turn in one go (tap or keyboard): a swelling rustle, then the flap. */
export function flip(durationS = 0.9): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const src = noiseSource(ac);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 700;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(1500, t);
  bp.frequency.linearRampToValueAtTime(3800, t + durationS * 0.45);
  bp.frequency.linearRampToValueAtTime(1800, t + durationS * 0.85);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22, t + durationS * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + durationS * 0.85);
  src.connect(hp).connect(bp).connect(g).connect(ac.destination);
  src.start(t, Math.random() * 0.8);
  src.stop(t + durationS);
  flap(0.85, durationS * 0.82);
}
