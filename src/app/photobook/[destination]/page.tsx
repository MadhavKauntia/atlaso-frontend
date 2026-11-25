import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import CountryCover from "@/components/covers/CountryCover";
import { DESTINATIONS, getDestination, type Destination } from "@/lib/destinations";
import { SITE_URL, BOOK_PAGES, BOOK_PRICE_INR, BOOK_LIST_PRICE_INR, BOOK_SIZE, LAUNCH_OFFER_ACTIVE, LAUNCH_OFFER_ENDS_LABEL, formatInr, productJsonLd } from "@/lib/site";
import l from "../../landing.module.css";
import s from "../photobook.module.css";

// Only the listed destinations exist; anything else is a 404 at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ destination: d.path }));
}

type Props = { params: Promise<{ destination: string }> };

function descriptionFor(name: string): string {
  return `Order a ${name} photobook made from your trip photos: a ${BOOK_PAGES}-page hardcover with an illustrated ${name} cover, designed in minutes. ${formatInr(BOOK_PRICE_INR)} with delivery across India.`;
}

/** Questions answered on every destination page, worded for that place. */
function faqsFor(d: Destination): { q: string; a: string }[] {
  const price = LAUNCH_OFFER_ACTIVE
    ? `${formatInr(BOOK_PRICE_INR)} per copy during the launch offer (until ${LAUNCH_OFFER_ENDS_LABEL}; the regular price is ${formatInr(BOOK_LIST_PRICE_INR)})`
    : `${formatInr(BOOK_PRICE_INR)} per copy`;
  const sights = d.moments.length > 1 ? `${d.moments.slice(0, -1).join(", ")} and ${d.moments[d.moments.length - 1]}` : d.moments.join("");
  return [
    {
      q: `How much does a ${d.name} photobook cost?`,
      a: `${price}, with shipping and taxes included. That's for a ${BOOK_PAGES}-page ${BOOK_SIZE} hardcover with an illustrated ${d.name} cover. Building and previewing your book is free, and you only pay when you order.`,
    },
    {
      q: `How many ${d.name} photos do I need?`,
      a: `At least 50, and you can add up to 1,000. There's no need to pick favourites first: add the whole ${d.name} camera roll and Atlaso chooses the best shots and lays them out across the pages.`,
    },
    {
      q: `What photos work best in a ${d.name} photo book?`,
      a: `A mix of the big sights and the small moments. Popular ${d.name} shots include ${sights}, but the candid photos of food, people and the places you stayed are what make the book feel like your trip.`,
    },
    {
      q: `Can I change the layout or the cover?`,
      a: `Yes. Before you order you can swap any photo, reframe or zoom a shot, rearrange pages, and give the ${d.name} cover your own title.`,
    },
    {
      q: `How long does delivery take?`,
      a: `Books are printed within about 3 business days and usually arrive within 7 to 10 days of ordering, anywhere in India.`,
    },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = getDestination((await params).destination);
  if (!d) return {};
  const title = `${d.name} Photo Book | Order a ${d.name} Photobook Online`;
  const description = descriptionFor(d.name);
  const path = `/photobook/${d.path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${d.name} Photo Book | Atlaso`, description, url: path, type: "website", siteName: "Atlaso", locale: "en_IN" },
    twitter: { card: "summary_large_image", title: `${d.name} Photo Book | Atlaso`, description },
  };
}

export default async function DestinationPage({ params }: Props) {
  const d = getDestination((await params).destination);
  if (!d) notFound();

  const url = `${SITE_URL}/photobook/${d.path}`;
  const startHref = `/create?cover=${d.cover}`;
  const others = DESTINATIONS.filter((o) => o.path !== d.path);
  const faqs = faqsFor(d);
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
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
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
              free to build<br />
              {LAUNCH_OFFER_ACTIVE ? <><s>{formatInr(BOOK_LIST_PRICE_INR)}</s> {formatInr(BOOK_PRICE_INR)} launch price</> : <>{formatInr(BOOK_PRICE_INR)} with shipping</>}
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
              <li>
                {LAUNCH_OFFER_ACTIVE
                  ? `${formatInr(BOOK_PRICE_INR)} per copy (launch price until ${LAUNCH_OFFER_ENDS_LABEL}, regular ${formatInr(BOOK_LIST_PRICE_INR)}), shipping and taxes included`
                  : `${formatInr(BOOK_PRICE_INR)} per copy, shipping and taxes included`}
              </li>
            </ul>
          </div>
          <div className={s.card}>
            <h2>how it works</h2>
            <ol>
              <li>Upload your {d.name} photos (at least 50)</li>
              <li>Your {d.name} photobook designs itself in minutes</li>
              <li>Review and tweak any page</li>
              <li>Order, and we print and deliver across India in 7 to 10 days</li>
            </ol>
          </div>
        </div>

        <div className={s.faq}>
          <h2>{d.name} photo books, answered</h2>
          {faqs.map((f) => (
            <details key={f.q} className={s.faqItem}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
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
