// One landing page per destination cover, at /photobook/{path}.
// `cover` is the slug in COUNTRIES (src/lib/covers/countries.ts); `path` is the
// hyphenated URL form. The blurb and moments make each page specific to the place,
// so the pages are useful on their own rather than near-duplicates.

import { getCountry } from "@/lib/covers/countries";

export interface Destination {
  path: string;
  cover: string;
  name: string;
  /** One or two sentences about the trip this book is for. */
  blurb: string;
  /** The kinds of photos people bring back, shown as a list. */
  moments: string[];
}

export const DESTINATIONS: Destination[] = [
  {
    path: "bali", cover: "bali", name: "Bali",
    blurb: "Rice terraces, temple gates and long beach sunsets. A Bali trip fills a camera roll fast, and it all deserves more than a scroll.",
    moments: ["Tegallalang rice terraces", "Uluwatu at sunset", "Ubud cafés and markets", "Nusa Penida cliffs"],
  },
  {
    path: "italy", cover: "italy", name: "Italy",
    blurb: "Piazzas, coastlines and far too many plates of pasta. Keep the whole Italian summer together in one book.",
    moments: ["Amalfi Coast villages", "Rome's piazzas and ruins", "Florence from above", "Venice canals"],
  },
  {
    path: "japan", cover: "japan", name: "Japan",
    blurb: "Neon streets one day, quiet shrines the next. A Japan trip has range, and a photo book shows all of it side by side.",
    moments: ["Shibuya crossing at night", "Kyoto temples and torii gates", "Mount Fuji views", "Ramen counters and izakayas"],
  },
  {
    path: "sri-lanka", cover: "srilanka", name: "Sri Lanka",
    blurb: "Tea country, coastal forts and the train ride everyone photographs. Bring your Sri Lanka trip home in print.",
    moments: ["The Ella train ride", "Sigiriya rock", "Galle Fort", "Tea estates in Nuwara Eliya"],
  },
  {
    path: "thailand", cover: "thailand", name: "Thailand",
    blurb: "Island hopping, street food and golden temples. Turn the Thailand photos into a book you'll actually flip through.",
    moments: ["Phi Phi and the islands", "Bangkok temples and night markets", "Chiang Mai old city", "Long-tail boats at sunset"],
  },
  {
    path: "vietnam", cover: "vietnam", name: "Vietnam",
    blurb: "Limestone bays, lantern-lit streets and motorbike-filled cities. A Vietnam trip makes a book full of colour.",
    moments: ["Ha Long Bay cruises", "Hoi An lanterns", "Hanoi's Old Quarter", "Rice fields in Sapa"],
  },
  {
    path: "greece", cover: "greece", name: "Greece",
    blurb: "Whitewashed villages, blue domes and clear water. Your Greek island trip, printed the way it looked.",
    moments: ["Santorini sunsets in Oia", "Mykonos windmills", "The Acropolis", "Beach days on the islands"],
  },
  {
    path: "singapore", cover: "singapore", name: "Singapore",
    blurb: "Supertrees, hawker centres and a skyline that lights up every night. Keep the Singapore trip in one place.",
    moments: ["Gardens by the Bay", "Marina Bay Sands skyline", "Hawker centre feasts", "Sentosa island"],
  },
  {
    path: "australia", cover: "australia", name: "Australia",
    blurb: "Harbour views, the reef and long coastal drives. An Australia trip covers a lot of ground, and the book holds all of it.",
    moments: ["Sydney Opera House and harbour", "The Great Barrier Reef", "The Great Ocean Road", "Melbourne laneways"],
  },
  {
    path: "dubai", cover: "dubai", name: "Dubai",
    blurb: "Desert dunes, record-breaking towers and evenings by the marina. Turn the Dubai photos into a keepsake.",
    moments: ["The Burj Khalifa", "Desert safari", "Dubai Marina at night", "The old souks"],
  },
  {
    path: "malaysia", cover: "malaysia", name: "Malaysia",
    blurb: "City towers, island beaches and cool highland tea farms. A Malaysia trip in one hardbound book.",
    moments: ["The Petronas Towers", "Langkawi beaches", "Cameron Highlands", "Penang street art"],
  },
  {
    path: "maldives", cover: "maldives", name: "Maldives",
    blurb: "Overwater villas and water so clear it looks edited. The Maldives photos belong on paper, not lost in a camera roll.",
    moments: ["Overwater villas", "Snorkelling with turtles and rays", "Sandbank picnics", "Sunset cruises"],
  },
  {
    path: "seychelles", cover: "seychelles", name: "Seychelles",
    blurb: "Granite boulders, empty beaches and giant tortoises. Keep your Seychelles island hopping together in one book.",
    moments: ["Anse Source d'Argent", "Praslin and La Digue", "Vallée de Mai", "Giant tortoises"],
  },
  {
    path: "london", cover: "london", name: "London",
    blurb: "Red buses, royal parks and markets on every corner. Make a book of the London trip, rain and all.",
    moments: ["Tower Bridge and the Thames", "Borough and Camden markets", "Hyde Park", "West End nights"],
  },
  {
    path: "new-york", cover: "newyork", name: "New York",
    blurb: "Skyline views, yellow cabs and walks that never end. Your New York trip, printed in one book.",
    moments: ["Times Square", "Central Park", "The Brooklyn Bridge", "Views from the top"],
  },
  {
    path: "usa", cover: "usa", name: "USA",
    blurb: "National parks, road trips and big cities. A USA trip covers a lot of miles, so give it a book that keeps up.",
    moments: ["National park trails", "Road trip stops", "City skylines", "The Grand Canyon"],
  },
  {
    path: "paris", cover: "paris", name: "Paris",
    blurb: "Café mornings, the Seine and the tower at night. Turn your Paris photos into a book you'll keep on the shelf.",
    moments: ["The Eiffel Tower at night", "Montmartre streets", "The Louvre", "Walks along the Seine"],
  },
  {
    path: "switzerland", cover: "switzerland", name: "Switzerland",
    blurb: "Snow peaks, lakes and scenic train rides. Your Swiss Alps trip deserves pages, not just a phone screen.",
    moments: ["Jungfraujoch and the Alps", "Lake Lucerne", "Scenic train journeys", "Interlaken and Grindelwald"],
  },
  {
    path: "georgia", cover: "georgia", name: "Georgia",
    blurb: "Mountain churches, old Tbilisi and long wine dinners. Keep your Georgia trip together in print.",
    moments: ["Old Tbilisi", "Kazbegi and Gergeti Trinity Church", "Kakheti wine country", "Mountain roads"],
  },
  {
    path: "turkey", cover: "turkey", name: "Turkey",
    blurb: "Hot air balloons at dawn, bazaars and the Bosphorus. Turn your Turkey photos into a book.",
    moments: ["Cappadocia balloons", "Istanbul's mosques and bazaars", "Bosphorus cruises", "Pamukkale terraces"],
  },
  {
    path: "nepal", cover: "nepal", name: "Nepal",
    blurb: "Himalayan treks, prayer flags and old Kathmandu. A Nepal trip belongs in a book you can hold.",
    moments: ["Himalayan treks", "Pokhara and Phewa Lake", "Kathmandu Durbar Square", "Prayer flags on the trail"],
  },
  {
    path: "spain", cover: "spain", name: "Spain",
    blurb: "Gaudí's Barcelona, tapas nights and Andalusian sun. Keep the Spain trip in one hardbound book.",
    moments: ["Sagrada Família", "Tapas nights", "Seville and Granada", "Beaches on the coast"],
  },
  {
    path: "hong-kong", cover: "hongkong", name: "Hong Kong",
    blurb: "Harbour skylines, dim sum and views from the Peak. Turn the Hong Kong trip into a book.",
    moments: ["Victoria Peak views", "The Star Ferry", "Dim sum and street food", "Neon nights in Mong Kok"],
  },
  {
    path: "amsterdam", cover: "amsterdam", name: "Amsterdam",
    blurb: "Canals, bikes and tulip fields. Your Amsterdam trip, printed in one book.",
    moments: ["Canal rides", "Tulip fields", "Museum days", "Bikes everywhere"],
  },
  {
    path: "egypt", cover: "egypt", name: "Egypt",
    blurb: "Pyramids, the Nile and temples thousands of years old. Bring the Egypt trip home in print.",
    moments: ["The Pyramids of Giza", "A Nile cruise", "Luxor's temples", "Abu Simbel"],
  },
];

export function getDestination(path: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.path === path);
}

/** Maps a cover slug from a URL (?cover=) to a known destination cover, or null. */
export function validCoverSlug(slug: string | null | undefined): string | null {
  return slug && getCountry(slug) ? slug : null;
}
