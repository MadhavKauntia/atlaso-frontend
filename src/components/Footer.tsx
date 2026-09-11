import Link from "next/link";
import s from "./legal.module.css";

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <div className={s.footerBrand}>
          <Link href="/" className={s.footerLogo}>
            <span className={s.footerLogoMark} />
            Atlaso
          </Link>
          <p className={s.footerTagline}>
            AI-crafted travel photobooks. Drop in your photos, we curate the story and print it on
            archival paper, delivered across India.
          </p>
        </div>

        <div className={s.footerCol}>
          <div className={s.footerColTitle}>Product</div>
          <Link href="/how-it-works" className={s.footerLink}>How it works</Link>
          <Link href="/create" className={s.footerLink}>Start a book</Link>
          <Link href="/account" className={s.footerLink}>Account</Link>
        </div>

        <div className={s.footerCol}>
          <div className={s.footerColTitle}>Legal</div>
          <Link href="/privacy" className={s.footerLink}>Privacy Policy</Link>
          <Link href="/terms" className={s.footerLink}>Terms &amp; Conditions</Link>
          <Link href="/refund" className={s.footerLink}>Refund &amp; Cancellation</Link>
          <Link href="/shipping" className={s.footerLink}>Shipping &amp; Delivery</Link>
        </div>

        <div className={s.footerCol}>
          <div className={s.footerColTitle}>Support</div>
          <Link href="/contact" className={s.footerLink}>Contact us</Link>
          <a href="mailto:support@myatlaso.com" className={s.footerLink}>support@myatlaso.com</a>
        </div>
      </div>

      <div className={s.footerBottom}>
        <div>© {YEAR} Atlaso. All rights reserved.</div>
        <div>Made for travellers who keep their memories in print.</div>
      </div>
    </footer>
  );
}
