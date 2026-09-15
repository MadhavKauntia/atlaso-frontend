import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import s from "./landing.module.css";

const TICKER = [
  ["high quality photo paper", "var(--sb-red)"],
  ["hard-bound, coffee table book", "var(--sb-green)"],
  ["layout generated instantly", "var(--sb-orange)"],
  ["a cover for every country", "var(--sb-blue)"],
  ["7-10 day delivery", "var(--sb-gold)"],
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
      <SiteHeader />

      <section className={s.hero}>
        <div className={s.heroCopy}>
          <h1 className={s.h1}>
            your camera roll<br />
            <em>is a photo book</em><br />
            waiting to happen
          </h1>
          <p className={s.lede}>
            Dump in your photos and pick a country. Your photobook designs itself in minutes.
            You review and order; we print and ship.
          </p>
          <div className={s.ctaRow}>
            <Link href="/create" className={s.cta}>
              start my photo book <span>→</span>
            </Link>
            <div className={s.ctaNote}>
              free to build<br />ships in 3 days
            </div>
          </div>
        </div>

        <div className={s.heroVisual}>
          <div className={s.spread}>
            <div className={s.spreadLeft}>
              <div className={s.slot}>
                <img className={s.slotImg} src="/assets/hero/hero-3.jpg" alt="A photo from the trip" />
              </div>
            </div>
            <div className={s.spreadRight}>
              <div className={s.slot}>
                <img className={s.slotImg} src="/assets/hero/hero-5.jpg" alt="A photo from the trip" />
              </div>
              <div className={s.slot}>
                <img className={s.slotImg} src="/assets/hero/hero-2.jpg" alt="A photo from the trip" />
              </div>
              <div className={s.slot}>
                <img className={s.slotImg} src="/assets/hero/hero-6.jpg" alt="A photo from the trip" />
              </div>
              <div className={s.slot}>
                <img className={s.slotImg} src="/assets/hero/hero-4.jpg" alt="A photo from the trip" />
              </div>
            </div>
            <div className={s.tapeTop} />
          </div>

          <div className={s.postcard}>
            <img src="/assets/postcard-bali.png" alt="Bali postcard cover illustration" />
          </div>
        </div>
      </section>

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
          <p>6.9 × 9.8 inches, 50 pages, hardbound</p>
        </div>
        <div className={s.coversRow}>
          {COVERS.map((c) => (
            <figure key={c.src} className={s.coverFig} style={{ "--tf": c.tf } as React.CSSProperties}>
              <div className={s.coverBook}>
                <div className={s.coverSpine} style={{ background: c.spine }} />
                <img className={s.coverImg} src={c.src} alt={c.alt} />
              </div>
            </figure>
          ))}
        </div>
        <div className={s.coversCta}>
          <Link href="/create">make mine →</Link>
        </div>
      </section>

      <section className={s.closing}>
        <h2>
          that trip deserves<br />better than a phone
        </h2>
        <p className={s.closingNote}>ready in minutes · pay only if you love it</p>
        <Link href="/create" className={s.closingCta}>
          start my photo book <span>→</span>
        </Link>
      </section>

      <Footer />
    </div>
  );
}
