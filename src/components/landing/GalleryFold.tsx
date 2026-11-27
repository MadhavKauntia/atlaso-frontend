import Link from "next/link";
import Image from "next/image";
import { dmDisplay } from "./fonts";
import s from "./fold.module.css";

/**
 * The book spread the photos fly into, laid out like a printed Atlaso book: a full-bleed
 * photo on the left page, and a feature photo over two on the right page.
 * Photos fly in this order; each starts from its cell in the camera roll.
 */
const FLY = [
  { src: "/assets/hero/hero-3.jpg", cls: s.fly0 },         // left page, full bleed: the beach through the trees
  { src: "/assets/fold/hammock-selfie.jpg", cls: s.fly1 }, // right page, top
  { src: "/assets/hero/hero-2.jpg", cls: s.fly2 },         // right page, bottom left: two glasses on the railing
  { src: "/assets/fold/hammock-book.jpg", cls: s.fly3 },   // right page, bottom right: hammock and book
];
const SLOTS = [s.slot0, s.slot1, s.slot2, s.slot3];

// Camera roll: the trip's photos (from a real Andaman trip). { fly: i } is the cell that
// photo i flies out of; { src } is a photo that stays in the roll.
type Cell = { fly: number } | { src: string };
const r = (n: number): Cell => ({ src: `/assets/fold/andaman-roll/${String(n).padStart(2, "0")}.jpg` });
const ROLL: Cell[] = [
  // rows above the phone's visible area until the roll scrolls in
  r(12), r(13), r(14),
  r(15), r(16), r(17),
  r(18), r(19), r(20),
  r(21), r(22), r(23),
  // visible rows
  { fly: 0 }, r(1), { fly: 2 },
  r(2), { fly: 1 }, r(3),
  { fly: 3 }, r(4), r(5),
  r(6), r(7), r(8),
  r(9), r(10), r(11),
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
              {ROLL.map((c, i) => (
                <div key={i} className={s.cell}>
                  <Image src={"fly" in c ? FLY[c.fly].src : c.src} alt="" fill sizes="90px" />
                </div>
              ))}
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
