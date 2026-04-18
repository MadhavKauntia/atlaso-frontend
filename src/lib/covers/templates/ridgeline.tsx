import React from "react";
import type { CoverTemplate } from "../types";

export const ridgelineTemplate: CoverTemplate = {
  id: "ridgeline",
  name: "Ridgeline",
  paletteId: "nordic-mist",
  compatiblePalettes: ["nordic-mist", "forest-deep", "ocean-classic", "paper-trail", "kyoto-night"],
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

export function RidgeIllustration({ accentColor, backgroundColor }: { accentColor: string; backgroundColor: string }) {
  return (
    <g>
      {/* Back ridge — lowest opacity, widest */}
      <path
        d="M0,370 L0,310 L40,265 L80,290 L120,230 L160,270 L200,240 L240,260 L280,210 L300,235 L300,370 Z"
        fill={accentColor}
        opacity={0.35}
      />
      {/* Mid ridge */}
      <path
        d="M0,370 L0,330 L50,290 L90,310 L130,265 L170,295 L210,260 L250,280 L300,255 L300,370 Z"
        fill={accentColor}
        opacity={0.6}
      />
      {/* Front ridge — full opacity, most detailed */}
      <path
        d="M0,370 L0,355 L30,330 L70,345 L100,315 L140,340 L175,305 L210,330 L245,310 L275,325 L300,308 L300,370 Z"
        fill={accentColor}
        opacity={1}
      />
      {/* Snow caps on front ridge */}
      <path
        d="M175,305 L185,315 L175,318 L165,315 Z"
        fill={backgroundColor}
        opacity={0.7}
      />
      <path
        d="M100,315 L112,327 L100,330 L88,327 Z"
        fill={backgroundColor}
        opacity={0.7}
      />
    </g>
  );
}
