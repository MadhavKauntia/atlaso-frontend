import Link from "next/link";
import s from "./site.module.css";

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <div className={s.footerBrand}>
          <Link href="/" className={s.footerLogo}>
            atlaso<span className={s.footerLogoDot}>.</span>
          </Link>
          <p className={s.footerTagline}>
            Travel photobooks. Drop in your photos, we lay out the album, illustrate the cover and
            print it — delivered across India.
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
        <div>Made for travellers who keep their memories in print.</div>
      </div>
    </footer>
  );
}
