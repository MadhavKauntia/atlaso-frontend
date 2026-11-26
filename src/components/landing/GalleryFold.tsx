import Link from "next/link";
import Image from "next/image";
import { dmDisplay } from "./fonts";
import s from "./fold.module.css";

/** Photos that fly from the camera roll into the book, in landing order. */
const FLY = [
  { src: "/assets/hero/hero-3.jpg", cls: s.fly0 },
  { src: "/assets/hero/hero-5.jpg", cls: s.fly1 },
  { src: "/assets/hero/hero-2.jpg", cls: s.fly2 },
  { src: "/assets/hero/hero-6.jpg", cls: s.fly3 },
  { src: "/assets/hero/hero-4.jpg", cls: s.fly4 },
];
const SLOTS = [s.slot0, s.slot1, s.slot2, s.slot3, s.slot4];

// Camera roll: colour swatches with the trip's photos mixed in.
type Cell = string | { photo: number };
const ROLL: Cell[] = [
  "#C9A27A", "#A7B58F", "#B5A489",
  "#9AAFC4", "#C7966B", "#7E9B8A",
  "#E0C3A0", "#86A3A8", "#B88A72",
  "#93A9A0", "#D8B98C", "#8D7F96",
  { photo: 0 }, "#A7B58F", { photo: 2 },
  "#9AAFC4", { photo: 1 }, "#7E9B8A",
  { photo: 3 }, "#86A3A8", { photo: 4 },
  "#93A9A0", "#D8B98C", "#8D7F96",
  "#C9A27A", "#A7B58F", "#B5A489",
];

export default function GalleryFold() {
  return (
    <section className={`${s.fold} ${dmDisplay.variable}`}>
      <div className={s.inner}>
        <h2 className={s.h2}>some trips deserve better than a phone gallery</h2>

        <div className={s.stage} role="img" aria-label="Photos lifting out of a phone's camera roll and landing in the pages of a photo book">
          <svg className={s.arrow} viewBox="0 0 1040 540" aria-hidden="true">
            <g fill="none" stroke="#E5B94B" strokeLinecap="round" strokeLinejoin="round">
              <path d="M316 292 C 344 214, 390 168, 424 186 C 452 201, 440 238, 414 232 C 390 226, 398 184, 432 168 C 450 160, 466 166, 478 180" strokeWidth="3.2" />
              <path d="M317 296 C 346 216, 391 171, 425 189 C 450 203, 438 236, 415 230" strokeWidth="1.4" opacity="0.5" />
              <path d="M459 176 L480 182 L472 162" strokeWidth="3.2" />
            </g>
          </svg>

          {/* phone */}
          <div className={s.phone} aria-hidden="true">
            <div className={s.screen}>
              <p className={s.recents}>Recents</p>
              <p className={s.select}>Select</p>
            </div>
          </div>
          <div className={s.rollWindow} aria-hidden="true">
            <div className={s.roll}>
              {ROLL.map((c, i) =>
                typeof c === "string" ? (
                  <div key={i} className={s.cell} style={{ background: c }} />
                ) : (
                  <div key={i} className={s.cell}>
                    <Image src={FLY[c.photo].src} alt="" fill sizes="90px" />
                  </div>
                )
              )}
            </div>
          </div>

          {/* open book */}
          <div className={s.book} aria-hidden="true">
            <div className={s.pageL} />
            <div className={s.pageR} />
          </div>
          {SLOTS.map((cls, i) => <div key={i} className={`${s.slotline} ${cls}`} aria-hidden="true" />)}
          {FLY.map((f) => (
            <div key={f.src} className={`${s.flyer} ${f.cls}`} aria-hidden="true">
              <Image src={f.src} alt="" fill sizes="(max-width: 768px) 40vw, 240px" />
            </div>
          ))}
          <p className={s.badge} aria-hidden="true">designed itself ✓</p>
        </div>

        <Link href="/create" className={s.cta}>
          <span>start my photo book</span>
          <span aria-hidden="true" className={s.ctaArrow}>→</span>
        </Link>
      </div>
    </section>
  );
}
