"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "@/app/landing.module.css";
import { getToken } from "@/lib/auth";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getToken());
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
        {loggedIn && <Link href="/account">Account</Link>}
      </div>
    </nav>
  );
}
