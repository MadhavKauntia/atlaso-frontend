"use client";

import Link from "next/link";
import Brand from "@/components/Brand";
import ResumeBanner from "@/components/ResumeBanner";
import OfferModal from "@/components/promo/OfferModal";
import { BOOK_PRICE_INR, BOOK_LIST_PRICE_INR, LAUNCH_OFFER_ACTIVE, LAUNCH_OFFER_ENDS_LABEL, formatInr } from "@/lib/site";
import s from "./site.module.css";

export default function SiteHeader() {
  return (
    <>
    {LAUNCH_OFFER_ACTIVE && (
      <Link href="/create" className={s.offerBar}>
        <span className={s.offerTag}>launch offer</span>
        <span>
          <s>{formatInr(BOOK_LIST_PRICE_INR)}</s> <strong>{formatInr(BOOK_PRICE_INR)}</strong> per book, shipping included
          <span className={s.offerUntil}> · until {LAUNCH_OFFER_ENDS_LABEL}</span>
        </span>
        <span className={s.offerArrow} aria-hidden="true">→</span>
      </Link>
    )}
    <header className={s.header}>
      <Brand height={28} />
      <nav className={s.nav}>
        <Link href="/create" className={s.navLink}>make a book</Link>
        <Link href="/how-it-works" className={s.navLink}>how it works</Link>
        <Link href="/faq" className={s.navLink}>faq</Link>
        <Link href="/account" className={s.navLink}>account</Link>
        <Link href="/create" className={s.navCta}>start ›</Link>
      </nav>
    </header>
    <ResumeBanner />
    <OfferModal />
    </>
  );
}
