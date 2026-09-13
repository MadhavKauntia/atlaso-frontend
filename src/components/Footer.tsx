import Link from "next/link";
import Brand from "@/components/Brand";
import s from "./site.module.css";

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <div className={s.footerBrand}>
          <Brand dark height={24} />
          <p className={s.footerTagline}>
            Travel photobooks that build themselves. Drop in your photos, pick a country, and your
            book is ready in minutes — we print and ship it across India.
          </p>
        </div>

        <div className={s.footerCol}>
          <div className={s.footerColTitle}>Product</div>
          <nav>
            <Link href="/how-it-works" className={s.footerLink}>how it works</Link>
            <Link href="/create" className={s.footerLink}>start a book</Link>
            <Link href="/account" className={s.footerLink}>account</Link>
          </nav>
        </div>

        <div className={s.footerCol}>
          <div className={s.footerColTitle}>Legal</div>
          <nav>
            <Link href="/privacy" className={s.footerLink}>privacy policy</Link>
            <Link href="/terms" className={s.footerLink}>terms &amp; conditions</Link>
            <Link href="/refund" className={s.footerLink}>refunds &amp; cancellation</Link>
            <Link href="/shipping" className={s.footerLink}>shipping &amp; delivery</Link>
          </nav>
        </div>

        <div className={s.footerCol}>
          <div className={s.footerColTitle}>Support</div>
          <nav>
            <Link href="/contact" className={s.footerLink}>contact us</Link>
            <a href="mailto:support@myatlaso.com" className={s.footerLink}>support@myatlaso.com</a>
          </nav>
        </div>
      </div>

      <div className={s.footerBottom}>
        <div>© {YEAR} Atlaso. All rights reserved.</div>
        <div>Made by travellers, for travellers.</div>
      </div>
    </footer>
  );
}
