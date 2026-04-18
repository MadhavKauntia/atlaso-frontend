import React from "react";
import type { CoverTemplate } from "../types";

export const risingSunTemplate: CoverTemplate = {
  id: "rising-sun",
  name: "Rising Sun",
  paletteId: "kyoto-night",
  compatiblePalettes: ["kyoto-night", "ocean-classic", "nordic-mist", "forest-deep", "paper-trail"],
  category: "nature",
  titleConfig: {
    x: 24,
    y: 52,
    maxChars: 12,
    baseFontSize: 32,
    fontSizeBreakpoints: [
      { chars: 10, size: 24 },
      { chars: 7,  size: 28 },
      { chars: 4,  size: 32 },
    ],
  },
  subtitleConfig: { x: 24, y: 72, maxChars: 40, fontSize: 9 },
  volumeLabel: { x: 24, y: 22 },
  coordinateLabel: { x: 24, y: 386 },
  illustration: "",
};

export function SunIllustration({ accentColor, backgroundColor }: { accentColor: string; backgroundColor: string }) {
  return (
    <g>
      {/* Large sun/moon circle */}
      <circle cx="150" cy="260" r="90" fill={accentColor} opacity={0.9} />
      {/* Horizontal wave lines crossing the circle — foreground mask */}
      <rect x="30" y="248" width="240" height="10" fill={backgroundColor} />
      <rect x="30" y="270" width="240" height="10" fill={backgroundColor} />
      <rect x="30" y="292" width="240" height="10" fill={backgroundColor} />
      {/* Mountain silhouette over the sun */}
      <path
        d="M30,330 L80,255 L115,290 L150,230 L185,290 L220,255 L270,330 Z"
        fill={backgroundColor}
        opacity={0.85}
      />
      {/* Horizon line */}
      <rect x="30" y="328" width="240" height="2" rx="1" fill={accentColor} opacity={0.5} />
    </g>
  );
}
