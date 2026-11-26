import s from "./hero.module.css";

/**
 * Pencil sketches tucked behind the hero book's corners and sides. Each destination
 * gets three, drawn in with a stroke animation; switching destination redraws them
 * (the parent keys this component on the destination).
 */

type Sketch = "route" | "sun" | "mountains" | "cam" | "compass" | "stars";

const ELEMS: Sketch[] = ["route", "sun", "mountains", "cam", "compass", "stars"];
// [width, height, scale] of each sketch's own drawing box.
const SIZES: Record<Sketch, [number, number, number]> = {
  route: [162, 70, 0.75], sun: [60, 60, 0.9], mountains: [104, 64, 0.85],
  cam: [90, 64, 0.8], compass: [70, 70, 0.85], stars: [52, 44, 1],
};
// 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right, 4 left side, 5 right side.
const SLOTS: [number, number][] = [[84, 46], [498, 54], [82, 578], [496, 576], [52, 312], [516, 300]];
const PICKS: Partial<Record<Sketch, number>>[] = [
  { route: 0, stars: 5, mountains: 3 },
  { sun: 1, cam: 2, compass: 4 },
  { compass: 1, mountains: 2, stars: 4 },
  { sun: 0, cam: 5, route: 3 },
  { stars: 1, compass: 4, mountains: 3 },
];

function place(k: Sketch, slot: number, variant: number): string {
  const [w, h, sc] = SIZES[k];
  const [x, y] = SLOTS[slot];
  const r = ((ELEMS.indexOf(k) * 37 + variant * 53) % 17) - 8;
  return `translate(${x} ${y}) rotate(${r}) scale(${sc}) translate(${-w / 2} ${-h / 2})`;
}

export default function HeroDoodles({ variant, startAt }: { variant: number; startAt: number }) {
  const v = ((variant % PICKS.length) + PICKS.length) % PICKS.length;
  const picks = PICKS[v];
  // Five stagger steps; the first set waits for the book to land.
  const d = (startAt > 0 ? [0.4, 0.6, 0.8, 1.0, 1.2] : [0.1, 0.25, 0.4, 0.55, 0.7]).map((x) => ({ animationDelay: `${(startAt + x).toFixed(2)}s` }));
  const [dA, dB, dC, dD, dE] = d;
  const at = (k: Sketch) => (picks[k] === undefined ? null : place(k, picks[k]!, v));

  return (
    <svg className={s.doodles} viewBox="0 0 560 620" aria-hidden="true" fill="none" stroke="#E5B94B" strokeLinecap="round" strokeLinejoin="round" filter="url(#hero-pencil)">
      <defs>
        <filter id="hero-pencil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={4} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={1.8} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {at("cam") && (
        <g transform={at("cam")!}>
          <path pathLength={1} strokeWidth={1.6} style={dA} d="M4 18 q0 -6 6 -6 l14 0 l6 -8 l24 0 l6 8 l20 0 q6 0 6 6 l0 40 q0 6 -6 6 l-70 0 q-6 0 -6 -6 z" />
          <path pathLength={1} strokeWidth={1} opacity={0.45} style={dB} d="M6 19 q1 -6 6 -5 l13 0 l6 -8 l23 1 l6 7 l20 1 q6 0 5 6 l1 39 q-1 6 -7 6 l-69 -1 q-6 0 -5 -6 z" />
          <circle pathLength={1} strokeWidth={1.6} style={dB} cx={46} cy={39} r={16} />
          <circle pathLength={1} strokeWidth={1.2} style={dC} cx={46} cy={39} r={8} />
          <path pathLength={1} strokeWidth={1.4} style={dC} d="M72 22 l9 0 M40 34 q4 -4 9 -3" />
        </g>
      )}
      {at("compass") && (
        <g transform={at("compass")!}>
          <circle pathLength={1} strokeWidth={1.5} style={dB} cx={35} cy={35} r={29} />
          <circle pathLength={1} strokeWidth={1} opacity={0.45} style={dC} cx={36} cy={34} r={25} />
          <path pathLength={1} strokeWidth={1.6} style={dC} d="M35 2 L41 29 L68 35 L41 41 L35 68 L29 41 L2 35 L29 29 Z" />
          <path pathLength={1} strokeWidth={1} opacity={0.6} style={dD} d="M35 8 L35 62 M8 35 L62 35 M33 14 l4 0 M33 18 l4 0" />
          <path pathLength={1} strokeWidth={1.5} style={dD} d="M30 -6 l0 -12 l10 12 l0 -12" />
        </g>
      )}
      {at("route") && (
        <g transform={at("route")!}>
          <path pathLength={1} strokeWidth={1.6} style={{ ...dA, animationDuration: "1.6s" }} d="M0 58 C 26 14, 52 70, 78 42 C 96 22, 70 8, 64 26 C 58 44, 104 46, 122 24 C 132 12, 142 14, 148 20" />
          <path pathLength={1} strokeWidth={2} style={dD} d="M146 10 l16 16 M162 10 l-16 16" />
          <path pathLength={1} strokeWidth={1} opacity={0.5} style={dE} d="M147 12 l15 15 M161 11 l-14 16" />
        </g>
      )}
      {at("mountains") && (
        <g transform={at("mountains")!}>
          <path pathLength={1} strokeWidth={1.6} style={dB} d="M0 60 L30 18 L46 38 L66 6 L104 60" />
          <path pathLength={1} strokeWidth={1} opacity={0.45} style={dC} d="M2 61 L31 20 L46 40 L67 8 L102 61" />
          <path pathLength={1} strokeWidth={1.3} style={dD} d="M57 20 l5 4 l4 -5 l4 5 l5 -3 M18 52 l9 -13 M26 56 l9 -13 M72 54 l9 -13 M82 58 l8 -11 M-6 64 l116 0" />
        </g>
      )}
      {at("sun") && (
        <g transform={at("sun")!}>
          <circle pathLength={1} strokeWidth={1.6} style={dC} cx={30} cy={30} r={13} />
          <circle pathLength={1} strokeWidth={1} opacity={0.45} style={dD} cx={31} cy={29} r={11} />
          <path pathLength={1} strokeWidth={1.5} style={dD} d="M30 4 l0 9 M30 47 l0 9 M4 30 l9 0 M47 30 l9 0 M12 12 l6 6 M42 42 l6 6 M48 12 l-6 6 M12 48 l6 -6" />
        </g>
      )}
      {at("stars") && (
        <g transform={at("stars")!}>
          <path pathLength={1} strokeWidth={1.5} style={dD} d="M12 0 l3.5 9 l9.5 0.5 l-7.5 6 l2.5 9.5 l-8 -5.5 l-8 5.5 l2.5 -9.5 l-7.5 -6 l9.5 -0.5 z" />
          <path pathLength={1} strokeWidth={1.4} style={dE} d="M44 26 l0 14 M37 33 l14 0 M30 4 l0 8 M26 8 l8 0 M8 40 l1 0" />
        </g>
      )}
    </svg>
  );
}
