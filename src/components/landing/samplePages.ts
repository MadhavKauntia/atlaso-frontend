/**
 * The sample book in the landing preview: 10 pages from a real Bali trip using the same layouts, margins and
 * paper as a printed Atlaso book (see BookPage). Photos: public/assets/sample-book/bali-*.jpg.
 */

export type PageLayout = "full" | "framed" | "twoStacked" | "twoSide" | "three" | "four";

export interface SamplePhoto { src: string; alt: string }
export interface SamplePage { layout: PageLayout; photos: SamplePhoto[] }

const sb = (name: string, alt: string): SamplePhoto => ({ src: `/assets/sample-book/${name}.jpg`, alt });

export const SAMPLE_PAGES: SamplePage[] = [
  { layout: "full", photos: [sb("bali-plane", "Clouds seen from a plane window over the wing")] },
  { layout: "framed", photos: [sb("bali-temple", "Standing at a clifftop temple wall above the sea")] },
  { layout: "full", photos: [sb("bali-night-walk", "Friends walking down a lantern-lit stone path at night")] },
  { layout: "framed", photos: [sb("bali-beach-walk", "Walking into shallow water at sunset")] },
  { layout: "twoStacked", photos: [sb("bali-dive", "Scuba divers waving underwater over a reef"), sb("bali-party", "A beach party under pink lights at night")] },
  { layout: "full", photos: [sb("bali-volcano", "The moon over misty hills and a lake at dawn")] },
  { layout: "framed", photos: [sb("bali-lake", "A painted-nail hand against a lake and hills")] },
  { layout: "full", photos: [sb("bali-scooter", "Sitting on a scooter under string lights at night")] },
  { layout: "framed", photos: [sb("bali-deck", "Smiling on a deck at dusk")] },
  { layout: "full", photos: [sb("bali-sunset", "An orange sunset over the beach")] },
];
