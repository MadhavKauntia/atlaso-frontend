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
            book is ready in minutes, and we print and ship it across India.
          </p>
          <div className={s.footerSocials}>
            <a
              href="https://instagram.com/myatlaso"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Atlaso on Instagram"
              className={s.footerSocial}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://x.com/myatlaso"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Atlaso on X"
              className={s.footerSocial}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
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
