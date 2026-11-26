import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/landing/Hero";
import GalleryFold from "@/components/landing/GalleryFold";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { DESTINATIONS } from "@/lib/destinations";
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, BOOK_PRICE_INR, BOOK_LIST_PRICE_INR, LAUNCH_OFFER_ACTIVE, LAUNCH_OFFER_ENDS_LABEL, formatInr, productJsonLd } from "@/lib/site";
import s from "./landing.module.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    email: "support@myatlaso.com",
    sameAs: ["https://instagram.com/myatlaso", "https://x.com/myatlaso"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  },
  productJsonLd({
    name: "Atlaso Travel Photo Book",
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    image: "/assets/covers/keepsake-bali.jpg",
  }),
];

const TICKER = [
  ["high quality photo paper", "var(--sb-red)"],
  ["hard-bound, coffee table book", "var(--sb-green)"],
  ["layout generated instantly", "var(--sb-orange)"],
  ["a cover for every country", "var(--sb-blue)"],
  ["7-10 day delivery", "var(--sb-gold)"],
  ...(LAUNCH_OFFER_ACTIVE ? [[`launch price ${formatInr(BOOK_PRICE_INR)} till ${LAUNCH_OFFER_ENDS_LABEL.toLowerCase()}`, "var(--sb-red)"]] : []),
];

const COVERS = [
  { src: "/assets/covers/keepsake-bali.jpg", spine: "#2a3f2c", alt: "Bali photobook cover", tf: "rotate(-5deg) translateY(18px)" },
  { src: "/assets/covers/keepsake-italy.jpg", spine: "#f3b53f", alt: "Italy photobook cover", tf: "rotate(3deg) translateY(-14px)" },
  { src: "/assets/covers/keepsake-japan.jpg", spine: "#ac4040", alt: "Japan photobook cover", tf: "rotate(-2deg) translateY(26px)" },
  { src: "/assets/covers/keepsake-thailand.jpg", spine: "#1d4e53", alt: "Thailand photobook cover", tf: "rotate(6deg) translateY(-6px)" },
];

export default function LandingPage() {
  return (
    <div className={s.root}>
      <JsonLd data={HOME_JSON_LD} />
      <SiteHeader />

      <Hero />

      <div className={s.ticker}>
        <div className={s.tickerTrack}>
          {[0, 1].map((dup) =>
            TICKER.map(([label, color], i) => (
              <span key={`${dup}-${i}`} aria-hidden={dup === 1 ? "true" : undefined}>
                {label}
                <span style={{ color: color as string, marginLeft: 22 }}>✦</span>
              </span>
            ))
          )}
        </div>
      </div>

      <section className={s.covers}>
        <div className={s.coversHead}>
          <h2>your keepsake for every trip</h2>
          <p>
            Hardbound travel photo books, 6.9 × 9.8 inches, 50 pages.{" "}
            {LAUNCH_OFFER_ACTIVE ? (
              <><s>{formatInr(BOOK_LIST_PRICE_INR)}</s> <strong>{formatInr(BOOK_PRICE_INR)}</strong> launch price until {LAUNCH_OFFER_ENDS_LABEL}, shipping included.</>
            ) : (
              <>{formatInr(BOOK_PRICE_INR)} with shipping.</>
            )}
          </p>
        </div>
        <div className={s.coversRow}>
          {COVERS.map((c) => (
            <figure key={c.src} className={s.coverFig} style={{ "--tf": c.tf } as React.CSSProperties}>
              <div className={s.coverBook}>
                <div className={s.coverSpine} style={{ background: c.spine }} />
                <Image className={s.coverImg} src={c.src} alt={c.alt} width={537} height={760} sizes="(max-width: 768px) 140px, 206px" />
              </div>
            </figure>
          ))}
        </div>
        <div className={s.destinations}>
          <h3>a photo book for wherever you went</h3>
          <nav className={s.destinationLinks} aria-label="Photo books by destination">
            {DESTINATIONS.map((d) => (
              <Link key={d.path} href={`/photobook/${d.path}`}>{d.name}</Link>
            ))}
          </nav>
        </div>
        <div className={s.coversCta}>
          <Link href="/create">make mine →</Link>
        </div>
      </section>

      <GalleryFold />

      <Footer />
    </div>
  );
}
