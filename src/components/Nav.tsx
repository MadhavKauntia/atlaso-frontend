"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "@/app/landing.module.css";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`${s.nav}${scrolled ? ` ${s.navScrolled}` : ""}`}>
      <Link href="/" className={s.logo}>
        <span className={s.logoMark} />
        Atlaso
      </Link>
      <div className={s.navLinks}>
        <Link href="/how-it-works">How it works</Link>
        <a href="#">Examples</a>
        <a href="#">Pricing</a>
        <a href="#">Journal</a>
      </div>
    </nav>
  );
}
