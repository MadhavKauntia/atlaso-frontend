"use client";

import React, { memo } from "react";
import type { CoverTemplate } from "@/lib/covers/types";
import type { CoverPairing } from "@/lib/covers/palette";
import { getAutoFontSize } from "@/lib/covers/text-utils";
import {
  ArchIllustration,
  SunIllustration,
  RidgeIllustration,
} from "@/lib/covers/templates";

const ILLUSTRATION_MAP: Record<
  string,
  React.ComponentType<{ accentColor: string; backgroundColor: string }>
> = {
  archway:     ArchIllustration,
  "rising-sun": SunIllustration,
  ridgeline:   RidgeIllustration,
};

interface CoverRendererProps {
  template: CoverTemplate;
  pairing: CoverPairing;
  title: string;
  subtitle: string;
  volumeNumber?: number;
  coordinates?: string;
  className?: string;
  style?: React.CSSProperties;
  mode?: "preview" | "export";
}

const GRAIN_ID = "atlaso-grain";

function GrainPattern({ accentColor }: { accentColor: string }) {
  return (
    <defs>
      <pattern id={GRAIN_ID} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="none" />
        <circle cx="1" cy="1" r="0.4" fill={accentColor} opacity={0.08} />
        <circle cx="3" cy="3" r="0.4" fill={accentColor} opacity={0.06} />
        <circle cx="3" cy="1" r="0.3" fill={accentColor} opacity={0.04} />
      </pattern>
    </defs>
  );
}

function CoverRenderer({
  template,
  pairing,
  title,
  subtitle,
  volumeNumber,
  coordinates,
  className,
  style,
  mode = "preview",
}: CoverRendererProps) {
  const isExport = mode === "export";
  const scale = isExport ? 3 : 1;
  const bleed = isExport ? 9 : 0;

  const baseW = 300;
  const baseH = 400;
  const vbW = baseW * scale + bleed * 2;
  const vbH = baseH * scale + bleed * 2;

  const s = (n: number) => n * scale + (isExport ? bleed : 0);
  const fs = (n: number) => n * scale;

  const { titleConfig, subtitleConfig, volumeLabel, coordinateLabel } = template;

  const displayTitle = title.toUpperCase() || "DESTINATION";
  const titleFontSize = fs(
    getAutoFontSize(displayTitle, [...titleConfig.fontSizeBreakpoints].sort((a, b) => b.chars - a.chars))
  );

  const volText = volumeNumber != null
    ? `ATLASO · VOL. ${String(volumeNumber).padStart(2, "0")}`
    : "ATLASO";

  const Illustration = ILLUSTRATION_MAP[template.id];

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={
        !isExport
          ? {
              animation: "coverFadeIn 400ms ease forwards",
              opacity: 0,
              ...style,
            }
          : style
      }
    >
      {!isExport && (
        <style>{`
          @keyframes coverFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}

      <GrainPattern accentColor={pairing.accent} />

      {/* Background */}
      <rect
        x={isExport ? 0 : 0}
        y={isExport ? 0 : 0}
        width={vbW}
        height={vbH}
        fill={pairing.background}
      />

      {/* Grain overlay */}
      <rect
        x={isExport ? 0 : 0}
        y={isExport ? 0 : 0}
        width={vbW}
        height={vbH}
        fill={`url(#${GRAIN_ID})`}
      />

      {/* Illustration */}
      {Illustration && (
        <g transform={isExport ? `translate(${bleed},${bleed}) scale(${scale})` : undefined}>
          <Illustration accentColor={pairing.accent} backgroundColor={pairing.background} />
        </g>
      )}

      {/* Volume label */}
      <text
        x={s(volumeLabel.x)}
        y={s(volumeLabel.y)}
        fill={pairing.accent}
        fontSize={fs(8)}
        letterSpacing={fs(2.5)}
        fontFamily="var(--font-fraunces, Georgia, serif)"
        fontWeight="400"
      >
        {volText}
      </text>

      {/* Title */}
      <text
        x={s(titleConfig.x)}
        y={s(titleConfig.y)}
        fill={pairing.textPrimary}
        fontSize={titleFontSize}
        letterSpacing={fs(1)}
        fontFamily="var(--font-fraunces, Georgia, serif)"
        fontWeight="700"
      >
        {displayTitle}
      </text>

      {/* Subtitle */}
      {subtitle && (
        <text
          x={s(subtitleConfig.x)}
          y={s(subtitleConfig.y)}
          fill={pairing.textSecondary}
          fontSize={fs(subtitleConfig.fontSize)}
          letterSpacing={fs(0.5)}
          fontFamily="var(--font-fraunces, Georgia, serif)"
          fontStyle="italic"
        >
          {subtitle}
        </text>
      )}

      {/* Coordinate label */}
      {coordinates && (
        <text
          x={s(coordinateLabel.x)}
          y={s(coordinateLabel.y)}
          fill={pairing.textSecondary}
          fontSize={fs(7)}
          letterSpacing={fs(1)}
          fontFamily="var(--font-fraunces, Georgia, serif)"
          opacity={0.5}
        >
          {coordinates}
        </text>
      )}

      {/* Export: crop marks */}
      {isExport && (
        <g stroke={pairing.textPrimary} strokeWidth="1" opacity={0.3}>
          {/* top-left */}
          <line x1={bleed - 6} y1={bleed} x2={bleed} y2={bleed} />
          <line x1={bleed} y1={bleed - 6} x2={bleed} y2={bleed} />
          {/* top-right */}
          <line x1={vbW - bleed} y1={bleed} x2={vbW - bleed + 6} y2={bleed} />
          <line x1={vbW - bleed} y1={bleed - 6} x2={vbW - bleed} y2={bleed} />
          {/* bottom-left */}
          <line x1={bleed - 6} y1={vbH - bleed} x2={bleed} y2={vbH - bleed} />
          <line x1={bleed} y1={vbH - bleed} x2={bleed} y2={vbH - bleed + 6} />
          {/* bottom-right */}
          <line x1={vbW - bleed} y1={vbH - bleed} x2={vbW - bleed + 6} y2={vbH - bleed} />
          <line x1={vbW - bleed} y1={vbH - bleed} x2={vbW - bleed} y2={vbH - bleed + 6} />
        </g>
      )}
    </svg>
  );
}

export default memo(CoverRenderer);
