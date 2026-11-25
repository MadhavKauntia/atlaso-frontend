import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import CountryCover from "@/components/covers/CountryCover";
import { DESTINATIONS, getDestination } from "@/lib/destinations";
import { SITE_URL, BOOK_PAGES, BOOK_PRICE_INR, BOOK_SIZE, formatInr, productJsonLd } from "@/lib/site";
import l from "../../landing.module.css";
import s from "../photobook.module.css";

// Only the listed destinations exist; anything else is a 404 at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ destination: d.path }));
}

type Props = { params: Promise<{ destination: string }> };

function descriptionFor(name: string): string {
  return `Turn your ${name} trip photos into a hardbound travel photo book with an illustrated ${name} cover. Designed in minutes, ${formatInr(BOOK_PRICE_INR)} with delivery across India.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = getDestination((await params).destination);
  if (!d) return {};
  const title = `${d.name} Travel Photo Book`;
  const description = descriptionFor(d.name);
  const path = `/photobook/${d.path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${d.name} Photo Book | Atlaso`, description, url: path },
    twitter: { title: `${d.name} Photo Book | Atlaso`, description },
  };
}

export default async function DestinationPage({ params }: Props) {
  const d = getDestination((await params).destination);
  if (!d) notFound();

  const url = `${SITE_URL}/photobook/${d.path}`;
  const startHref = `/create?cover=${d.cover}`;
  const others = DESTINATIONS.filter((o) => o.path !== d.path);
  const structured = [
    productJsonLd({
      name: `${d.name} Travel Photo Book`,
      description: descriptionFor(d.name),
      url,
      image: `/assets/stamps/${d.cover}.png`,
    }),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Atlaso", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Photo books", item: `${SITE_URL}/photobook` },
        { "@type": "ListItem", position: 3, name: `${d.name} photo book`, item: url },
      ],
    },
  ];

  return (
    <div className={l.root}>
      <JsonLd data={structured} />
      <SiteHeader />

      <section className={l.hero}>
        <div className={l.heroCopy}>
          <nav className={s.crumbs} aria-label="Breadcrumb">
            <Link href="/">home</Link><span>/</span>
            <Link href="/photobook">photo books</Link><span>/</span>
            <span>{d.name}</span>
          </nav>
          <h1 className={l.h1}>
            your {d.name} trip,<br />
            <em>as a photo book</em>
          </h1>
          <p className={l.lede}>
            {d.blurb} Upload your photos and Atlaso designs a {BOOK_PAGES}-page hardbound {d.name} photo
            book in minutes, with an illustrated {d.name} cover.
          </p>
          <div className={l.ctaRow}>
            <Link href={startHref} className={l.cta}>
              start my {d.name} book <span>→</span>
            </Link>
            <div className={l.ctaNote}>
              free to build<br />{formatInr(BOOK_PRICE_INR)} with shipping
            </div>
          </div>
        </div>

        <div className={s.heroCover}>
          <div className={s.heroCoverBook}>
            <CountryCover country={d.cover} title={d.name} />
          </div>
        </div>
      </section>

      <section className={l.covers}>
        <div className={l.coversHead}>
          <h2>what goes in a {d.name} photo book</h2>
          <p>
            Add your whole camera roll, up to 1,000 photos. We pick the best shots and lay them out
            across the pages, and you can swap, reframe or rearrange anything before you order.
          </p>
        </div>

        <div className={s.detailGrid}>
          <div className={s.card}>
            <h2>the photos people bring back</h2>
            <ul>
              {d.moments.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
          <div className={s.card}>
            <h2>the book</h2>
            <ul>
              <li>{BOOK_SIZE} hardcover, {BOOK_PAGES} pages</li>
              <li>Premium matte photo paper, full-bleed spreads</li>
              <li>Illustrated {d.name} cover with your own title</li>
              <li>{formatInr(BOOK_PRICE_INR)} per copy, shipping and taxes included</li>
            </ul>
          </div>
          <div className={s.card}>
            <h2>how it works</h2>
            <ol>
              <li>Upload your {d.name} photos (at least 50)</li>
              <li>Your book designs itself in minutes</li>
              <li>Review and tweak any page</li>
              <li>Order, and we print and deliver across India</li>
            </ol>
          </div>
        </div>

        <div className={l.destinations}>
          <h3>photo books for other trips</h3>
          <nav className={l.destinationLinks} aria-label="Other destinations">
            {others.map((o) => (
              <Link key={o.path} href={`/photobook/${o.path}`}>{o.name}</Link>
            ))}
          </nav>
        </div>
      </section>

      <section className={l.closing}>
        <h2>
          that {d.name} trip deserves<br />better than a phone
        </h2>
        <p className={l.closingNote}>ready in minutes · pay only if you love it</p>
        <Link href={startHref} className={l.closingCta}>
          start my {d.name} book <span>→</span>
        </Link>
      </section>

      <Footer />
    </div>
  );
}
