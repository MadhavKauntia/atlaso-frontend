import React from "react";
import type { CoverTemplate } from "../types";

export const archwayTemplate: CoverTemplate = {
  id: "archway",
  name: "Archway",
  paletteId: "lisbon-sun",
  compatiblePalettes: ["lisbon-sun", "desert-rose", "sahara-dusk", "paper-trail", "cherry-blossom"],
  category: "landmark",
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

export function ArchIllustration({ accentColor, backgroundColor }: { accentColor: string; backgroundColor: string }) {
  return (
    <g>
      {/* Outer arch frame */}
      <path
        d="M90,370 L90,220 Q90,130 150,130 Q210,130 210,220 L210,370 Z"
        fill={accentColor}
        opacity={0.9}
      />
      {/* Inner cutout — doorway */}
      <path
        d="M112,370 L112,232 Q112,158 150,158 Q188,158 188,232 L188,370 Z"
        fill={backgroundColor}
      />
      {/* Small window above arch */}
      <ellipse cx="150" cy="148" rx="14" ry="18" fill={backgroundColor} opacity={0.6} />
      {/* Ground line */}
      <rect x="70" y="368" width="160" height="3" rx="1.5" fill={accentColor} opacity={0.4} />
    </g>
  );
}
