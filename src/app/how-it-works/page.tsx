import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import s from "./hiw.module.css";

export default function HowItWorksPage() {
  return (
    <div className={s.root}>
      <SiteHeader />

      {/* ── Intro hero ─────────────────────────── */}
      <section className={s.hero}>
        <div className={s.eyebrow}>how it works</div>
        <h1 className={s.heroTitle}>
          From camera roll<br />
          to shelf, in four steps
        </h1>
        <p className={s.heroSubtitle}>
          Upload your photos and the whole book builds itself, automatically, in minutes. You
          review and order; we print and ship. Nothing is charged until you order.
        </p>
      </section>

      {/* ── Steps ──────────────────────────────── */}
      <section className={s.steps}>
        {/* Step 1 — upload the roll */}
        <div className={s.step}>
          <div className={s.stepNumber} style={{ background: "var(--sb-orange)" }}>
            1
          </div>
          <div className={`${s.tile} ${s.tile1}`}>
            <div className={`${s.tilePhoto} ${s.tilePhotoA}`} />
            <div className={`${s.tilePhoto} ${s.tilePhotoB}`} />
            <div className={`${s.tilePhoto} ${s.tilePhotoC}`}>
              <span className={s.tilePlus}>+</span>
            </div>
          </div>
          <div className={s.stepBody}>
            <h2 className={s.stepTitle}>upload the roll</h2>
            <p className={s.stepDesc}>
              Pick 50 photos or two hundred at once. Duplicates and blurry frames are set aside
              automatically. Pull any back in.
            </p>
          </div>
        </div>

        {/* Step 2 — the album builds itself */}
        <div className={s.step}>
          <div className={s.stepNumber} style={{ background: "var(--sb-green)" }}>
            2
          </div>
          <div className={s.tile}>
            <div className={s.tileSpread}>
              <div className={s.tileSpreadLeft}>
                <div className={s.tileSpreadHero} />
              </div>
              <div className={s.tileSpreadGrid}>
                <div style={{ background: "var(--sb-orange)" }} />
                <div style={{ background: "#2489a3" }} />
                <div style={{ background: "var(--sb-gold)" }} />
                <div style={{ background: "#b04a42" }} />
              </div>
            </div>
          </div>
          <div className={s.stepBody}>
            <h2 className={s.stepTitle}>the album builds itself</h2>
            <p className={s.stepDesc}>
              In under a minute your photos are grouped by day and paired by shape and colour. Flip
              through every spread, swap any photo, or regenerate the layout instantly, with no
              waiting on anyone.
            </p>
          </div>
        </div>

        {/* Step 3 — name it, and the cover draws itself */}
        <div className={s.step}>
          <div className={s.stepNumber} style={{ background: "#e8a0b4", color: "var(--sb-ink)" }}>
            3
          </div>
          <div className={s.tile} style={{ padding: 16 }}>
            <div className={s.tileBook}>
              <div className={s.tileBookSpine} />
              <img
                src="/assets/covers/bali.jpg"
                alt="Illustrated Bali stamp cover"
                className={s.tileBookImg}
              />
            </div>
          </div>
          <div className={s.stepBody}>
            <h2 className={s.stepTitle}>name it, and the cover draws itself</h2>
            <p className={s.stepDesc}>
              The country you pick gets a matching illustrated stamp cover, foil-stamped on the
              spine. Or type your own title.
            </p>
          </div>
        </div>

        {/* Step 4 — review, order, we ship */}
        <div className={s.step}>
          <div className={s.stepNumber} style={{ background: "var(--sb-blue)" }}>
            4
          </div>
          <div className={s.tile} style={{ padding: 16 }}>
            <div className={s.tileEnvelope}>
              <div className={s.tileEnvelopeFlap} />
              <div className={s.tileEnvelopeStamp} />
            </div>
            <div className={s.tileEnvelopeBar} />
          </div>
          <div className={s.stepBody}>
            <h2 className={s.stepTitle}>review, order, we ship</h2>
            <p className={s.stepDesc}>
              Your finished book is ready to see the moment it's built, with no proof to wait on. Order
              when you love it, and we print and ship it in about 3 days.
            </p>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────── */}
      <section className={s.ctaSection}>
        <h2 className={s.ctaTitle}>ready when you are</h2>
        <p className={s.ctaNote}>ready in minutes · pay at checkout</p>
        <Link href="/create" className={s.cta}>
          start my photo book <span>→</span>
        </Link>
      </section>

      <Footer />
    </div>
  );
}
