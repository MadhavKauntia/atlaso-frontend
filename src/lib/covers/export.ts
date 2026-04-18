import { TEMPLATES } from "./templates";
import { PAIRINGS } from "./palette";
import { getAutoFontSize } from "./text-utils";

export interface ExportCoverConfig {
  templateId: string;
  paletteId: string;
  title: string;
  subtitle: string;
  volumeNumber?: number;
  coordinates?: string;
}

/** Generates a print-ready SVG string at 3× resolution with 3mm bleed */
export function exportCoverSVG(config: ExportCoverConfig): string {
  const template = TEMPLATES[config.templateId];
  const pairing = PAIRINGS[config.paletteId];

  if (!template || !pairing) throw new Error("Unknown template or palette");

  const scale = 3;
  const bleed = 9; // 3mm at 300dpi
  const baseW = 300;
  const baseH = 400;
  const vbW = baseW * scale + bleed * 2;
  const vbH = baseH * scale + bleed * 2;

  const s = (n: number) => n * scale + bleed;
  const fs = (n: number) => n * scale;

  const { titleConfig, subtitleConfig, volumeLabel, coordinateLabel } = template;

  const displayTitle = config.title.toUpperCase() || "DESTINATION";
  const titleFontSize = fs(
    getAutoFontSize(
      displayTitle,
      [...titleConfig.fontSizeBreakpoints].sort((a, b) => b.chars - a.chars)
    )
  );

  const volText =
    config.volumeNumber != null
      ? `ATLASO · VOL. ${String(config.volumeNumber).padStart(2, "0")}`
      : "ATLASO";

  const illustrationSVG = buildIllustrationSVG(config.templateId, pairing.accent, pairing.background, scale, bleed);

  const cropMarks = `
    <g stroke="${pairing.textPrimary}" stroke-width="1" opacity="0.3">
      <line x1="${bleed - 6}" y1="${bleed}" x2="${bleed}" y2="${bleed}"/>
      <line x1="${bleed}" y1="${bleed - 6}" x2="${bleed}" y2="${bleed}"/>
      <line x1="${vbW - bleed}" y1="${bleed}" x2="${vbW - bleed + 6}" y2="${bleed}"/>
      <line x1="${vbW - bleed}" y1="${bleed - 6}" x2="${vbW - bleed}" y2="${bleed}"/>
      <line x1="${bleed - 6}" y1="${vbH - bleed}" x2="${bleed}" y2="${vbH - bleed}"/>
      <line x1="${bleed}" y1="${vbH - bleed}" x2="${bleed}" y2="${vbH - bleed + 6}"/>
      <line x1="${vbW - bleed}" y1="${vbH - bleed}" x2="${vbW - bleed + 6}" y2="${vbH - bleed}"/>
      <line x1="${vbW - bleed}" y1="${vbH - bleed}" x2="${vbW - bleed}" y2="${vbH - bleed + 6}"/>
    </g>`.trim();

  const subtitleEl = config.subtitle
    ? `<text x="${s(subtitleConfig.x)}" y="${s(subtitleConfig.y)}" fill="${pairing.textSecondary}" font-size="${fs(subtitleConfig.fontSize)}" letter-spacing="${fs(0.5)}" font-family="Georgia, serif" font-style="italic">\u2014 ${escapeXml(config.subtitle)}</text>`
    : "";

  const coordEl = config.coordinates
    ? `<text x="${s(coordinateLabel.x)}" y="${s(coordinateLabel.y)}" fill="${pairing.textSecondary}" font-size="${fs(7)}" letter-spacing="${fs(1)}" font-family="Georgia, serif" opacity="0.5">${escapeXml(config.coordinates)}</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${vbW}" height="${vbH}">
  <defs>
    <pattern id="grain" x="0" y="0" width="${fs(4)}" height="${fs(4)}" patternUnits="userSpaceOnUse">
      <rect width="${fs(4)}" height="${fs(4)}" fill="none"/>
      <circle cx="${fs(1)}" cy="${fs(1)}" r="${fs(0.4)}" fill="${pairing.accent}" opacity="0.08"/>
      <circle cx="${fs(3)}" cy="${fs(3)}" r="${fs(0.4)}" fill="${pairing.accent}" opacity="0.06"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${vbW}" height="${vbH}" fill="${pairing.background}"/>
  <rect x="0" y="0" width="${vbW}" height="${vbH}" fill="url(#grain)"/>
  ${illustrationSVG}
  <text x="${s(volumeLabel.x)}" y="${s(volumeLabel.y)}" fill="${pairing.accent}" font-size="${fs(8)}" letter-spacing="${fs(2.5)}" font-family="Georgia, serif" font-weight="400">${escapeXml(volText)}</text>
  <text x="${s(titleConfig.x)}" y="${s(titleConfig.y)}" fill="${pairing.textPrimary}" font-size="${titleFontSize}" letter-spacing="${fs(1)}" font-family="Georgia, serif" font-weight="700">${escapeXml(displayTitle)}</text>
  ${subtitleEl}
  ${coordEl}
  ${cropMarks}
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildIllustrationSVG(
  templateId: string,
  accentColor: string,
  backgroundColor: string,
  scale: number,
  bleed: number
): string {
  const s = (n: number) => n * scale + bleed;

  if (templateId === "archway") {
    return `<g transform="translate(${bleed},${bleed}) scale(${scale})">
      <path d="M90,370 L90,220 Q90,130 150,130 Q210,130 210,220 L210,370 Z" fill="${accentColor}" opacity="0.9"/>
      <path d="M112,370 L112,232 Q112,158 150,158 Q188,158 188,232 L188,370 Z" fill="${backgroundColor}"/>
      <ellipse cx="150" cy="148" rx="14" ry="18" fill="${backgroundColor}" opacity="0.6"/>
      <rect x="70" y="368" width="160" height="3" rx="1.5" fill="${accentColor}" opacity="0.4"/>
    </g>`;
  }

  if (templateId === "rising-sun") {
    return `<g transform="translate(${bleed},${bleed}) scale(${scale})">
      <circle cx="150" cy="260" r="90" fill="${accentColor}" opacity="0.9"/>
      <rect x="30" y="248" width="240" height="10" fill="${backgroundColor}"/>
      <rect x="30" y="270" width="240" height="10" fill="${backgroundColor}"/>
      <rect x="30" y="292" width="240" height="10" fill="${backgroundColor}"/>
      <path d="M30,330 L80,255 L115,290 L150,230 L185,290 L220,255 L270,330 Z" fill="${backgroundColor}" opacity="0.85"/>
      <rect x="30" y="328" width="240" height="2" rx="1" fill="${accentColor}" opacity="0.5"/>
    </g>`;
  }

  if (templateId === "ridgeline") {
    return `<g transform="translate(${bleed},${bleed}) scale(${scale})">
      <path d="M0,370 L0,310 L40,265 L80,290 L120,230 L160,270 L200,240 L240,260 L280,210 L300,235 L300,370 Z" fill="${accentColor}" opacity="0.35"/>
      <path d="M0,370 L0,330 L50,290 L90,310 L130,265 L170,295 L210,260 L250,280 L300,255 L300,370 Z" fill="${accentColor}" opacity="0.6"/>
      <path d="M0,370 L0,355 L30,330 L70,345 L100,315 L140,340 L175,305 L210,330 L245,310 L275,325 L300,308 L300,370 Z" fill="${accentColor}" opacity="1"/>
      <path d="M175,305 L185,315 L175,318 L165,315 Z" fill="${backgroundColor}" opacity="0.7"/>
      <path d="M100,315 L112,327 L100,330 L88,327 Z" fill="${backgroundColor}" opacity="0.7"/>
    </g>`;
  }

  return "";
}
