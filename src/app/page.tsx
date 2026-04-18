"use client";

import Link from "next/link";
import Nav from "@/components/Nav";
import s from "./landing.module.css";

export default function LandingPage() {
  return (
    <div className={s.root}>
      <Nav />

      <section className={s.hero}>
        <div className={`${s.corner} ${s.cornerTl}`}>
          North<span className={s.cornerCoord}>48.8566° N</span>
        </div>
        <div className={`${s.corner} ${s.cornerTr}`}>
          East<span className={s.cornerCoord}>2.3522° E</span>
        </div>
        <div className={`${s.corner} ${s.cornerBl}`}>
          Est. 2025<span className={s.cornerCoord}>Vol. I</span>
        </div>
        <div className={`${s.corner} ${s.cornerBr}`}>
          Chapter 01<span className={s.cornerCoord}>The beginning</span>
        </div>

        <div className={`${s.heroContent} ${s.stagger}`}>
          <div className={s.eyebrow}>
            <span className={s.eyebrowDot} />
            AI-crafted travel photobooks
          </div>

          <h1 className={s.h1}>
            Your trip,<br />
            <span className={s.italic}>bound</span> into a<br />
            <span className={s.underline}>keepsake.</span>
          </h1>

          <p className={s.lede}>
            Drop in the photos from your travels. Our AI curates, sequences, and lays them out
            like a proper travel editor would.{" "}
            <strong>You review, we print, it arrives at your door</strong> — a real, tactile
            book of the trip you took.
          </p>

          <div className={s.ctaRow}>
            <Link href="/create" className={s.cta}>
              <span>Start your photobook</span>
              <span className={s.ctaArrow}>→</span>
            </Link>
            <div className={s.ctaNote}>
              Free to preview<span className={s.ctaNoteSep}>·</span>Ships worldwide
            </div>
          </div>

          <div className={s.heroMeta}>
            <div className={s.metaItem}>
              <span className={s.metaNum}>42k+</span>
              <span className={s.metaLabel}>Books printed</span>
            </div>
            <div className={s.metaItem}>
              <span className={s.metaNum}>9 min</span>
              <span className={s.metaLabel}>Avg. to first draft</span>
            </div>
            <div className={s.metaItem}>
              <span className={s.metaNum}>4.9★</span>
              <span className={s.metaLabel}>From 2,100 reviews</span>
            </div>
          </div>
        </div>

        <div className={s.heroVisual}>
          <div className={`${s.annotation} ${s.ann1}`}>
            an evening in Lisbon
            <span className={s.annotationArrow}> ↘</span>
          </div>

          <div className={`${s.polaroid} ${s.p1}`}>
            <div className={`${s.polaroidImg} ${s.imgMountains}`} />
            <div className={s.polaroidCaption}>Dolomites, Italy — July</div>
          </div>

          <div className={`${s.polaroid} ${s.p2}`}>
            <div className={`${s.polaroidImg} ${s.imgOcean}`} />
            <div className={s.polaroidCaption}>Algarve coast, Portugal</div>
          </div>

          <div className={`${s.polaroid} ${s.p3}`}>
            <div className={`${s.polaroidImg} ${s.imgCity}`} />
            <div className={s.polaroidCaption}>Lisbon, at dusk</div>
          </div>

          <div className={`${s.polaroid} ${s.p4}`}>
            <div className={`${s.polaroidImg} ${s.imgForest}`} />
            <div className={s.polaroidCaption}>Harz forest, Germany</div>
          </div>

          <div className={s.sticker}>
            Hand-<br />printed<br />★ no. 001
          </div>

          <div className={`${s.annotation} ${s.ann2}`}>
            <span className={s.annotationArrow}>↗</span><br />
            your best shots,<br />
            curated.
          </div>
        </div>
      </section>

      <div className={s.ticker}>
        <div className={s.tickerTrack}>
          <div className={s.tickerItem}>
            <span>Drop in photos</span>
            <span className={s.tickerSep}>✦</span>
            <span>AI drafts the story</span>
            <span className={s.tickerSep}>✦</span>
            <span>You review &amp; edit</span>
            <span className={s.tickerSep}>✦</span>
            <span>We print on archival paper</span>
            <span className={s.tickerSep}>✦</span>
            <span>Ships in 7 days</span>
            <span className={s.tickerSep}>✦</span>
          </div>
          <div className={s.tickerItem} aria-hidden="true">
            <span>Drop in photos</span>
            <span className={s.tickerSep}>✦</span>
            <span>AI drafts the story</span>
            <span className={s.tickerSep}>✦</span>
            <span>You review &amp; edit</span>
            <span className={s.tickerSep}>✦</span>
            <span>We print on archival paper</span>
            <span className={s.tickerSep}>✦</span>
            <span>Ships in 7 days</span>
            <span className={s.tickerSep}>✦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
