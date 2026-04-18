"use client";

import Link from "next/link";
import Nav from "@/components/Nav";
import s from "./hiw.module.css";

export default function HowItWorksPage() {
  return (
    <div className={s.root}>
      <Nav />

      {/* ── Hero ───────────────────────────────── */}
      <section className={s.hero}>
        <div className={`${s.corner} ${s.cornerTl}`}>
          Process<span className={s.cornerCoord}>Step by step</span>
        </div>
        <div className={`${s.corner} ${s.cornerTr}`}>
          From photos<span className={s.cornerCoord}>to your door</span>
        </div>

        <div className={s.stagger}>
          <div className={s.eyebrow}>
            <span className={s.eyebrowDot} />
            How Atlaso works
          </div>

          <h1 className={s.heroTitle}>
            From photos to<br />
            <span className={s.italic}>printed book,</span><br />
            in minutes.
          </h1>

          <p className={s.heroSubtitle}>
            Drop in your travel photos. Our AI handles the rest — selecting, sequencing, and laying out your story into a beautifully printed keepsake.
          </p>
        </div>
      </section>

      {/* ── Steps ──────────────────────────────── */}
      <section className={s.steps}>
        <div className={s.stepsInner}>

          {/* Step 1 — Upload */}
          <div className={s.step}>
            <div>
              <div className={s.stepNumber}>Step 01</div>
              <h2 className={s.stepTitle}>Drop in<br />your photos.</h2>
              <p className={s.stepDesc}>
                Drag and drop your trip photos — JPEGs, PNGs, HEICs, whatever your camera or phone produced. <strong>No resizing or sorting needed.</strong> We handle formats, orientation, and all the messy bits.
              </p>
              <div className={s.stepTag}>
                <span className={s.stepTagDot} />
                JPEG · PNG · HEIC · WebP
              </div>
            </div>

            <div className={s.stepVisual}>
              <div className={s.uploadVisual}>
                <div className={s.uploadBadge}>Auto-rotate ✓</div>
                <div className={s.uploadIcon}>📷</div>
                <div className={s.uploadLabel}>Drop your photos here</div>
                <div className={s.uploadSub}>or click to browse</div>
                <div className={s.uploadMiniPhotos}>
                  <div className={s.miniPhoto} />
                  <div className={s.miniPhoto} />
                  <div className={s.miniPhoto} />
                  <div className={s.miniPhoto} />
                  <div className={s.miniPhoto} />
                  <div className={s.miniPhoto} />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 — AI Curates (reversed) */}
          <div className={`${s.step} ${s.stepReverse}`}>
            <div>
              <div className={s.stepNumber}>Step 02</div>
              <h2 className={s.stepTitle}>AI picks the<br />best moments.</h2>
              <p className={s.stepDesc}>
                Our vision model scores every photo — sharpness, exposure, scene type, burst duplicates. <strong>It selects the best ~30 shots</strong>, balancing landscapes, people, cityscapes, and candid moments for a complete narrative.
              </p>
              <div className={s.stepTag}>
                <span className={s.stepTagDot} />
                GPT-4o vision · ~9 min avg.
              </div>
            </div>

            <div className={s.stepVisual}>
              <div className={s.aiVisual}>
                <div className={`${s.aiCard} ${s.aiCardMain}`}>
                  <div className={s.aiLabel}>Photo analysis</div>
                  <div className={s.aiPhotoRow}>
                    <div className={s.aiPhotoThumb}>
                      <div className={s.aiCheckmark}>✓</div>
                    </div>
                    <div className={s.aiPhotoThumb} />
                    <div className={s.aiPhotoThumb} />
                  </div>
                  <div className={s.aiTagList}>
                    <span className={s.aiTag}>landscape</span>
                    <span className={s.aiTag}>golden hour</span>
                    <span className={s.aiTag}>sharp</span>
                  </div>
                </div>
                <div className={`${s.aiCard} ${s.aiCardSide}`}>
                  <div className={s.aiLabel}>Top pick</div>
                  <div className={s.aiScore}>9.2</div>
                  <div className={s.aiScoreLabel}>Aesthetic score</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 — Preview & Refine */}
          <div className={s.step}>
            <div>
              <div className={s.stepNumber}>Step 03</div>
              <h2 className={s.stepTitle}>Preview &amp;<br />make it yours.</h2>
              <p className={s.stepDesc}>
                Review the AI-generated layout page by page. <strong>Drag photos to reposition them</strong> within their frames. Not happy? Regenerate with a single click and get a fresh take instantly.
              </p>
              <div className={s.stepTag}>
                <span className={s.stepTagDot} />
                Drag to reposition · Regenerate anytime
              </div>
            </div>

            <div className={s.stepVisual}>
              <div className={s.previewVisual}>
                <div className={`${s.bookPage} ${s.bookPageMain}`}>
                  <div className={s.bookPhoto} />
                  <div className={s.bookText}>
                    <div className={s.bookTextLine} />
                    <div className={s.bookTextLine} />
                    <div className={s.bookTextLine} />
                  </div>
                </div>
                <div className={`${s.bookPage} ${s.bookPageAlt}`}>
                  <div className={`${s.bookPhoto} ${s.bookPhoto2}`} />
                </div>
                <div className={s.dragHint}>
                  ✦ drag to reposition
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 — Order & Ship */}
          <div className={`${s.step} ${s.stepReverse}`}>
            <div>
              <div className={s.stepNumber}>Step 04</div>
              <h2 className={s.stepTitle}>Order it.<br />We'll ship it.</h2>
              <p className={s.stepDesc}>
                Happy with the layout? Hit order. We print your book on <strong>archival-quality paper with hardcover binding</strong> and ship it straight to your door — anywhere in the world, within 7 days.
              </p>
              <div className={s.stepTag}>
                <span className={s.stepTagDot} />
                Archival paper · Hardcover · Ships in 7 days
              </div>
            </div>

            <div className={s.stepVisual}>
              <div className={s.exportVisual}>
                <div className={s.pdfStack}>
                  <div className={s.pdfPage}>
                    <div className={s.pdfPhoto} />
                    <div className={s.pdfBottom}>
                      <div className={s.pdfLine} />
                      <div className={s.pdfLine} />
                    </div>
                  </div>
                  <div className={s.pdfPage}>
                    <div className={s.pdfPhoto} />
                    <div className={s.pdfBottom}>
                      <div className={s.pdfLine} />
                      <div className={s.pdfLine} />
                    </div>
                  </div>
                  <div className={s.pdfPage}>
                    <div className={s.pdfPhoto} />
                    <div className={s.pdfBottom}>
                      <div className={s.pdfLine} />
                      <div className={s.pdfLine} />
                    </div>
                  </div>
                  <div className={s.pdfBadge}>Order &amp; ship →</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── CTA ────────────────────────────────── */}
      <section className={s.ctaSection}>
        <h2 className={s.ctaTitle}>Ready to start?</h2>
        <p className={s.ctaSubtitle}>
          Free to preview. You only pay when you love it and want it printed.
        </p>
        <Link href="/create" className={s.cta}>
          <span>Start your photobook</span>
          <span className={s.ctaArrow}>→</span>
        </Link>
      </section>

      {/* ── Ticker ─────────────────────────────── */}
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
