"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CountryCover from "@/components/covers/CountryCover";
import { coverColors } from "@/lib/covers/countries";
import HeroDoodles from "./HeroDoodles";
import BookPreview from "./BookPreview";
import { hand } from "./fonts";
import s from "./hero.module.css";

interface Props {
  /** shown as the cover title and in the preview */
  dest: string;
  coverSlug: string;
  /** where "start my X book" in the preview goes */
  href: string;
  /** which set of pencil sketches sits around the book (0-4) */
  doodleVariant: number;
  /** seconds before the book slides in */
  enterDelay?: number;
  /** seconds to wait before drawing the sketches (0: draw straight away) */
  doodleStartAt?: number;
  onOpenChange?: (open: boolean) => void;
}

/**
 * The 3D Atlaso book with pencil sketches around it. Clicking it flies it to the middle
 * of the screen, opens the cover and shows a sample book you can page through.
 * Used by the landing hero and the destination pages.
 */
export default function OpenableBook({ dest, coverSlug, href, doodleVariant, enterDelay = 0, doodleStartAt = 0, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const { spine } = coverColors(coverSlug);

  const setOpenAndTell = (v: boolean) => {
    setOpen(v);
    onOpenChange?.(v);
  };
  const closed = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  return (
    <div className={`${s.bookCol} ${s.vars}`} style={{ animationDelay: `${enterDelay.toFixed(2)}s` }}>
      <div className={s.bookStage}>
        <HeroDoodles key={dest} variant={doodleVariant} startAt={doodleStartAt} />
        <button type="button" className={s.bookBtn} aria-label={`Open a preview of the ${dest} photo book`} onClick={() => setOpenAndTell(true)}>
          <div ref={bookRef} className={s.book3d} style={{ visibility: open ? "hidden" : undefined }}>
            <div className={s.spine} style={{ background: spine }} />
            <div key={`${coverSlug}-${dest}`} className={s.cover}>
              <CountryCover
                country={coverSlug}
                title={dest}
                spine={false}
                style={{ boxShadow: "none", borderRadius: "inherit", width: "100%", height: "100%" }}
              />
              <div className={s.cloth} aria-hidden="true" />
              <div className={s.sheen} aria-hidden="true" />
            </div>
          </div>
          <div aria-hidden="true" className={s.bookShadow} />
        </button>
      </div>

      {/* Portalled: the column's slide-in transform would otherwise trap the fixed overlay. */}
      {open && createPortal(
        <BookPreview dest={dest} coverSlug={coverSlug} href={href} handClass={hand.className} originRef={bookRef} onClosed={closed} />,
        document.body,
      )}
    </div>
  );
}
