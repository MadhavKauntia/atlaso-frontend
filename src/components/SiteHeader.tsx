"use client";

import Link from "next/link";
import s from "./site.module.css";

export default function SiteHeader() {
  return (
    <header className={s.header}>
      <Link href="/" className={s.logo} aria-label="Atlaso home">
        atlaso<span className={s.logoDot}>.</span>
      </Link>
      <nav className={s.nav}>
        <Link href="/create" className={s.navLink}>make a book</Link>
        <Link href="/how-it-works" className={s.navLink}>how it works</Link>
        <Link href="/account" className={s.navLink}>account</Link>
        <Link href="/create" className={s.navCta}>start ›</Link>
      </nav>
    </header>
  );
}
