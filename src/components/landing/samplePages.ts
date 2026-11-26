/**
 * The sample book in the landing preview: 14 pages using the same layouts, margins and
 * paper as a printed Atlaso book (see BookPage). Photos: our own trip photos plus
 * Unsplash-licensed stock (public/assets/sample-book/CREDITS.txt).
 */

export type PageLayout = "full" | "framed" | "twoStacked" | "twoSide" | "three" | "four";

export interface SamplePhoto { src: string; alt: string }
export interface SamplePage { layout: PageLayout; photos: SamplePhoto[] }

const sb = (name: string, alt: string): SamplePhoto => ({ src: `/assets/sample-book/${name}.jpg`, alt });
const trip = (n: number, alt: string): SamplePhoto => ({ src: `/assets/hero/hero-${n}.jpg`, alt });

export const SAMPLE_PAGES: SamplePage[] = [
  { layout: "full", photos: [sb("sea-arch", "Turquoise sea seen through a rock arch")] },
  { layout: "framed", photos: [sb("waterfall", "A waterfall pouring into a green valley")] },
  { layout: "three", photos: [sb("old-town", "Pastel houses on an old town street"), sb("yellow-door", "A green door in a yellow wall"), sb("white-terrace", "A whitewashed terrace above the sea")] },
  { layout: "full", photos: [trip(3, "Trees framing a blue sky over a beach")] },
  { layout: "four", photos: [trip(2, "Two glasses of fresh juice on a wooden railing"), trip(6, "Woven fish lanterns hanging from a wooden ceiling"), trip(5, "Calm water under a blue sky"), trip(4, "Reading a book in a hammock under trees")] },
  { layout: "framed", photos: [sb("canoe", "Paddling a canoe across a still lake")] },
  { layout: "twoStacked", photos: [sb("fjord", "A fjord between steep cliffs"), sb("coast-cliffs", "Green cliffs above a blue bay")] },
  { layout: "full", photos: [sb("trams", "Yellow trams on a hilly street")] },
  { layout: "four", photos: [sb("canal", "Colourful houses along a canal"), sb("city-street", "A busy city street at golden hour"), sb("red-tram", "A red tram on a pedestrian street"), sb("red-brick-street", "Red umbrellas outside a brick cafe")] },
  { layout: "framed", photos: [sb("santorini", "White houses and windmills on a hillside")] },
  { layout: "three", photos: [sb("green-hills", "A winding road through green hills"), sb("photographer", "A traveller taking a photo"), sb("blue-van", "An old blue camper van")] },
  { layout: "full", photos: [sb("dunes", "Walkers on the ridge of an orange dune")] },
  { layout: "twoSide", photos: [sb("balloon", "A hot air balloon against the sun"), sb("hiker", "A hiker in a yellow jacket looking at fog")] },
  { layout: "full", photos: [sb("sea-stacks", "Sea stacks off a rugged coast")] },
];
