"use client";

import Link from "next/link";
import Brand from "@/components/Brand";
import s from "./site.module.css";

export default function SiteHeader() {
  return (
    <header className={s.header}>
      <Brand height={28} />
      <nav className={s.nav}>
        <Link href="/create" className={s.navLink}>make a book</Link>
        <Link href="/how-it-works" className={s.navLink}>how it works</Link>
        <Link href="/account" className={s.navLink}>account</Link>
        <Link href="/create" className={s.navCta}>start ›</Link>
      </nav>
    </header>
  );
}
