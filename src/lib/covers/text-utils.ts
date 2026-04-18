import type { FontSizeBreakpoint } from "./types";

/** Returns the correct font size given title length and breakpoint config */
export function getAutoFontSize(text: string, breakpoints: FontSizeBreakpoint[]): number {
  for (const bp of breakpoints) {
    if (text.length > bp.chars) return bp.size;
  }
  return breakpoints[0]?.size ?? 32;
}

/** Sanitises title: uppercase, strip special chars, collapse spaces, clamp */
export function sanitizeCoverTitle(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12);
}

/** Sanitises subtitle: trim and clamp only */
export function sanitizeCoverSubtitle(input: string): string {
  return input.trim().slice(0, 40);
}

/** Rough SVG text width estimate (uppercase serif, avg 0.6× fontSize per char) */
export function estimateTextWidth(text: string, fontSize: number, letterSpacing: number): number {
  return text.length * fontSize * 0.6 + (text.length - 1) * letterSpacing;
}

/** Shrinks font size until text fits maxWidth, never below minFontSize */
export function fitTextToWidth(
  text: string,
  maxWidth: number,
  baseFontSize: number,
  minFontSize: number,
  letterSpacing: number
): { fontSize: number; fits: boolean } {
  let fontSize = baseFontSize;
  while (fontSize > minFontSize) {
    if (estimateTextWidth(text, fontSize, letterSpacing) <= maxWidth) {
      return { fontSize, fits: true };
    }
    fontSize -= 1;
  }
  return { fontSize: minFontSize, fits: estimateTextWidth(text, minFontSize, letterSpacing) <= maxWidth };
}
