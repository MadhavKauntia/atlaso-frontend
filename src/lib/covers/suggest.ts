import { TEMPLATES } from "./templates";
import { PAIRINGS } from "./palette";
import type { CoverTemplate } from "./types";
import type { CoverPairing } from "./palette";

type DestType = "city" | "beach" | "mountain" | "island" | "desert" | "forest";
type Region = "europe" | "asia" | "americas" | "africa" | "oceania" | "middle-east";
type Climate = "tropical" | "temperate" | "cold" | "arid";

interface DestHint {
  type: DestType;
  region: Region;
  climate: Climate;
  coordinates?: string;
}

const DESTINATION_HINTS: Record<string, DestHint> = {
  paris:        { type: "city",     region: "europe",      climate: "temperate", coordinates: "48.8566° N, 2.3522° E" },
  london:       { type: "city",     region: "europe",      climate: "temperate", coordinates: "51.5074° N, 0.1278° W" },
  rome:         { type: "city",     region: "europe",      climate: "temperate", coordinates: "41.9028° N, 12.4964° E" },
  barcelona:    { type: "city",     region: "europe",      climate: "temperate", coordinates: "41.3851° N, 2.1734° E" },
  amsterdam:    { type: "city",     region: "europe",      climate: "temperate", coordinates: "52.3676° N, 4.9041° E" },
  lisbon:       { type: "city",     region: "europe",      climate: "temperate", coordinates: "38.7169° N, 9.1395° W" },
  prague:       { type: "city",     region: "europe",      climate: "cold",      coordinates: "50.0755° N, 14.4378° E" },
  vienna:       { type: "city",     region: "europe",      climate: "temperate", coordinates: "48.2082° N, 16.3738° E" },
  reykjavik:    { type: "city",     region: "europe",      climate: "cold",      coordinates: "64.1466° N, 21.9426° W" },
  oslo:         { type: "city",     region: "europe",      climate: "cold",      coordinates: "59.9139° N, 10.7522° E" },
  stockholm:    { type: "city",     region: "europe",      climate: "cold",      coordinates: "59.3293° N, 18.0686° E" },
  copenhagen:   { type: "city",     region: "europe",      climate: "cold",      coordinates: "55.6761° N, 12.5683° E" },
  tokyo:        { type: "city",     region: "asia",        climate: "temperate", coordinates: "35.6762° N, 139.6503° E" },
  kyoto:        { type: "city",     region: "asia",        climate: "temperate", coordinates: "35.0116° N, 135.7681° E" },
  seoul:        { type: "city",     region: "asia",        climate: "temperate", coordinates: "37.5665° N, 126.9780° E" },
  bangkok:      { type: "city",     region: "asia",        climate: "tropical",  coordinates: "13.7563° N, 100.5018° E" },
  singapore:    { type: "city",     region: "asia",        climate: "tropical",  coordinates: "1.3521° N, 103.8198° E" },
  "hong kong":  { type: "city",     region: "asia",        climate: "tropical",  coordinates: "22.3193° N, 114.1694° E" },
  bali:         { type: "island",   region: "asia",        climate: "tropical",  coordinates: "8.3405° S, 115.0920° E" },
  "new york":   { type: "city",     region: "americas",    climate: "temperate", coordinates: "40.7128° N, 74.0060° W" },
  "los angeles":{ type: "city",     region: "americas",    climate: "temperate", coordinates: "34.0522° N, 118.2437° W" },
  miami:        { type: "city",     region: "americas",    climate: "tropical",  coordinates: "25.7617° N, 80.1918° W" },
  "mexico city":{ type: "city",     region: "americas",    climate: "temperate", coordinates: "19.4326° N, 99.1332° W" },
  "buenos aires":{ type: "city",    region: "americas",    climate: "temperate", coordinates: "34.6037° S, 58.3816° W" },
  "rio de janeiro":{ type: "city",  region: "americas",    climate: "tropical",  coordinates: "22.9068° S, 43.1729° W" },
  havana:       { type: "city",     region: "americas",    climate: "tropical",  coordinates: "23.1136° N, 82.3666° W" },
  cartagena:    { type: "city",     region: "americas",    climate: "tropical",  coordinates: "10.3910° N, 75.4794° W" },
  "cape town":  { type: "city",     region: "africa",      climate: "temperate", coordinates: "33.9249° S, 18.4241° E" },
  marrakech:    { type: "city",     region: "africa",      climate: "arid",      coordinates: "31.6295° N, 7.9811° W" },
  cairo:        { type: "city",     region: "africa",      climate: "arid",      coordinates: "30.0444° N, 31.2357° E" },
  dubai:        { type: "city",     region: "middle-east", climate: "arid",      coordinates: "25.2048° N, 55.2708° E" },
  istanbul:     { type: "city",     region: "middle-east", climate: "temperate", coordinates: "41.0082° N, 28.9784° E" },
  petra:        { type: "desert",   region: "middle-east", climate: "arid",      coordinates: "30.3285° N, 35.4444° E" },
  sydney:       { type: "city",     region: "oceania",     climate: "temperate", coordinates: "33.8688° S, 151.2093° E" },
  melbourne:    { type: "city",     region: "oceania",     climate: "temperate", coordinates: "37.8136° S, 144.9631° E" },
  "new zealand":{ type: "mountain", region: "oceania",     climate: "temperate", coordinates: "40.9006° S, 174.8860° E" },
  maldives:     { type: "island",   region: "asia",        climate: "tropical",  coordinates: "3.2028° N, 73.2207° E" },
  santorini:    { type: "island",   region: "europe",      climate: "temperate", coordinates: "36.3932° N, 25.4615° E" },
  mykonos:      { type: "island",   region: "europe",      climate: "temperate", coordinates: "37.4467° N, 25.3289° E" },
  amalfi:       { type: "beach",    region: "europe",      climate: "temperate", coordinates: "40.6340° N, 14.6027° E" },
  patagonia:    { type: "mountain", region: "americas",    climate: "cold",      coordinates: "51.6230° S, 69.2168° W" },
  himalayas:    { type: "mountain", region: "asia",        climate: "cold",      coordinates: "27.9881° N, 86.9250° E" },
  alaska:       { type: "mountain", region: "americas",    climate: "cold",      coordinates: "61.3850° N, 152.2683° W" },
  sahara:       { type: "desert",   region: "africa",      climate: "arid",      coordinates: "23.4162° N, 25.6628° E" },
  iceland:      { type: "mountain", region: "europe",      climate: "cold",      coordinates: "64.9631° N, 19.0208° W" },
  zanzibar:     { type: "island",   region: "africa",      climate: "tropical",  coordinates: "6.1659° S, 39.2026° E" },
  phuket:       { type: "island",   region: "asia",        climate: "tropical",  coordinates: "7.8804° N, 98.3923° E" },
};

const TYPE_TO_CATEGORY: Record<DestType, CoverTemplate["category"]> = {
  city:     "landmark",
  beach:    "coastal",
  mountain: "nature",
  island:   "coastal",
  desert:   "abstract",
  forest:   "nature",
};

const CLIMATE_TO_PALETTE_CATEGORY: Record<Climate, CoverPairing["category"]> = {
  tropical:  "warm",
  arid:      "warm",
  temperate: "neutral",
  cold:      "cool",
};

export interface SuggestResult {
  templateId: string;
  paletteId: string;
  coordinates?: string;
}

export function suggestTemplate(destination: string): SuggestResult {
  const key = destination.toLowerCase().trim();
  const hint = DESTINATION_HINTS[key];

  const templateList = Object.values(TEMPLATES);
  const pairingList = Object.values(PAIRINGS);

  const fallback: SuggestResult = {
    templateId: templateList[0].id,
    paletteId: templateList[0].paletteId,
  };

  if (!hint) return fallback;

  const targetCategory = TYPE_TO_CATEGORY[hint.type];
  const targetPaletteCategory = CLIMATE_TO_PALETTE_CATEGORY[hint.climate];

  // Find matching template
  const matchedTemplate =
    templateList.find((t) => t.category === targetCategory) ?? templateList[0];

  // Find best palette: must be compatible with template + match climate category
  const compatiblePalettes = matchedTemplate.compatiblePalettes
    .map((id) => pairingList.find((p) => p.id === id))
    .filter((p): p is CoverPairing => p != null);

  const matchedPairing =
    compatiblePalettes.find((p) => p.category === targetPaletteCategory) ??
    compatiblePalettes[0] ??
    pairingList.find((p) => p.id === matchedTemplate.paletteId)!;

  return {
    templateId: matchedTemplate.id,
    paletteId: matchedPairing.id,
    coordinates: hint.coordinates,
  };
}
