import Image from "next/image";
import type { SamplePage } from "./samplePages";
import s from "./bookPage.module.css";

/**
 * One page laid out like a printed Atlaso book: cream paper, no page numbers, and the
 * book engine's layouts with its proportions (measured from a printed book: grids sit in
 * a 2.5% margin with 2.2% gutters; a framed photo gets ~10% side and 11% top margins).
 */
const SIZES: Record<SamplePage["layout"], string> = {
  full: "(max-width: 768px) 50vw, 460px",
  framed: "(max-width: 768px) 40vw, 380px",
  twoStacked: "(max-width: 768px) 50vw, 460px",
  twoSide: "(max-width: 768px) 25vw, 230px",
  three: "(max-width: 768px) 50vw, 460px",
  four: "(max-width: 768px) 25vw, 230px",
};

export default function BookPage({ page, side }: { page: SamplePage; side: "left" | "right" }) {
  return (
    <div className={`${s.page} ${side === "left" ? s.left : s.right}`}>
      {/* cqw resolves against the page (the container), so the layout lives one level in */}
      <div className={`${s.inner} ${s[page.layout]}`}>
        {page.photos.map((p, i) => (
          <div key={p.src} className={`${s.slot} ${page.layout === "three" && i === 0 ? s.feature : ""}`}>
            <Image src={p.src} alt={p.alt} fill sizes={SIZES[page.layout]} draggable={false} loading="eager" />
          </div>
        ))}
      </div>
      <span aria-hidden="true" className={s.gutter} />
    </div>
  );
}
