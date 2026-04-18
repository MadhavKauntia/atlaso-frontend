/** Font size shrinks at these character-count thresholds */
export interface FontSizeBreakpoint {
  /** When title length exceeds this, use `size` */
  chars: number;
  size: number;
}

/** Positioning and sizing config for the title text element */
export interface TitleConfig {
  x: number;
  y: number;
  /** Hard cap — input is clamped to this before rendering */
  maxChars: number;
  /** Font size when title is short */
  baseFontSize: number;
  /** Auto-shrink steps ordered from most chars (smallest size) to fewest */
  fontSizeBreakpoints: FontSizeBreakpoint[];
}

/** Positioning and sizing config for the subtitle text element */
export interface SubtitleConfig {
  x: number;
  y: number;
  maxChars: number;
  fontSize: number;
}

/** Positioning for the "ATLASO · VOL. N" label */
export interface VolumeLabel {
  x: number;
  y: number;
}

/** Positioning for the coordinate string */
export interface CoordinateLabel {
  x: number;
  y: number;
}

/** A single cover design template */
export interface CoverTemplate {
  id: string;
  /** Human-readable name shown in the template picker */
  name: string;
  /** Default palette pairing id */
  paletteId: string;
  /** All palette ids that look good with this template */
  compatiblePalettes: string[];
  category: "landmark" | "nature" | "coastal" | "urban" | "abstract" | "minimal";
  titleConfig: TitleConfig;
  subtitleConfig: SubtitleConfig;
  volumeLabel: VolumeLabel;
  coordinateLabel: CoordinateLabel;
  /** SVG path data for the main illustration (relative to 300×400 viewBox) */
  illustration: string;
}

/** What the user actually edits in the cover editor */
export interface CoverUserInput {
  title: string;
  subtitle: string;
  paletteId?: string;
}

/** The full cover config saved to the book record */
export interface CoverConfig {
  templateId: string;
  paletteId: string;
  title: string;
  subtitle: string;
  volumeNumber?: number;
  coordinates?: string;
}
