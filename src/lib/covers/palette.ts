/** Atlaso master color palette */
export const COLORS = {
  terracotta: "#C8421F",
  deepTeal:   "#1F4B4C",
  mustard:    "#E5B84B",
  inkNavy:    "#1A3A6B",
  roseBrick:  "#A83A5C",
  olive:      "#4A6B3A",
  bone:       "#E8DDC7",
  sand:       "#D4C4A8",
  sageMist:   "#C9D4D0",
  shell:      "#F2E4D4",
  ink:        "#1C1C1C",
  paper:      "#F5F0E6",
} as const;

/** A curated color pairing for a cover */
export interface CoverPairing {
  id: string;
  /** Display name shown in the palette picker */
  name: string;
  background: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  category: "warm" | "cool" | "neutral";
}

export const PAIRINGS: Record<string, CoverPairing> = {
  "lisbon-sun": {
    id: "lisbon-sun",
    name: "Lisbon Sun",
    background: COLORS.bone,
    accent: COLORS.terracotta,
    textPrimary: COLORS.ink,
    textSecondary: "#5C4033",
    category: "warm",
  },
  "kyoto-night": {
    id: "kyoto-night",
    name: "Kyoto Night",
    background: COLORS.inkNavy,
    accent: COLORS.mustard,
    textPrimary: COLORS.paper,
    textSecondary: "#B8A87A",
    category: "cool",
  },
  "nordic-mist": {
    id: "nordic-mist",
    name: "Nordic Mist",
    background: COLORS.sageMist,
    accent: COLORS.deepTeal,
    textPrimary: COLORS.ink,
    textSecondary: "#3A5A5B",
    category: "cool",
  },
  "desert-rose": {
    id: "desert-rose",
    name: "Desert Rose",
    background: COLORS.shell,
    accent: COLORS.roseBrick,
    textPrimary: COLORS.ink,
    textSecondary: "#7A3A50",
    category: "warm",
  },
  "forest-deep": {
    id: "forest-deep",
    name: "Forest Deep",
    background: COLORS.olive,
    accent: COLORS.sand,
    textPrimary: COLORS.paper,
    textSecondary: "#C4B896",
    category: "neutral",
  },
  "ocean-classic": {
    id: "ocean-classic",
    name: "Ocean Classic",
    background: COLORS.deepTeal,
    accent: COLORS.mustard,
    textPrimary: COLORS.paper,
    textSecondary: "#B8A87A",
    category: "cool",
  },
  "sahara-dusk": {
    id: "sahara-dusk",
    name: "Sahara Dusk",
    background: COLORS.sand,
    accent: COLORS.terracotta,
    textPrimary: COLORS.ink,
    textSecondary: "#7A4A3A",
    category: "warm",
  },
  "paper-trail": {
    id: "paper-trail",
    name: "Paper Trail",
    background: COLORS.paper,
    accent: COLORS.ink,
    textPrimary: COLORS.ink,
    textSecondary: "#5C5C5C",
    category: "neutral",
  },
  "cherry-blossom": {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    background: COLORS.shell,
    accent: COLORS.roseBrick,
    textPrimary: COLORS.inkNavy,
    textSecondary: "#6A4A5C",
    category: "warm",
  },
};
