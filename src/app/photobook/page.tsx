import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import CountryCover from "@/components/covers/CountryCover";
import { DESTINATIONS } from "@/lib/destinations";
import { BOOK_PRICE_INR, formatInr } from "@/lib/site";
import l from "../landing.module.css";
import s from "./photobook.module.css";

export const metadata: Metadata = {
  title: "Travel Photo Books by Destination",
  description: `Illustrated covers for Bali, Japan, Thailand, Italy and more. Pick your destination and turn your trip photos into a hardbound travel photo book, ${formatInr(BOOK_PRICE_INR)} with delivery across India.`,
  alternates: { canonical: "/photobook" },
};

export default function PhotobookHub() {
  return (
    <div className={l.root}>
      <SiteHeader />

      <section className={l.covers}>
        <div className={l.coversHead}>
          <h1 style={{ fontSize: "clamp(34px, 4.4vw, 58px)", letterSpacing: "-0.04em", margin: 0 }}>
            travel photo books for every destination
          </h1>
          <p>
            Every destination has its own illustrated cover. Pick where you went, upload your photos,
            and your book designs itself in minutes.
          </p>
        </div>

        <div className={s.hubGrid}>
          {DESTINATIONS.map((d) => (
            <Link key={d.path} href={`/photobook/${d.path}`} className={s.hubItem}>
              <CountryCover country={d.cover} title={d.name} />
              <span>{d.name} photo book</span>
            </Link>
          ))}
        </div>

        <div className={l.coversCta}>
          <Link href="/create">start my photo book →</Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
