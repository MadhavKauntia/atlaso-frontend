"use client";

import { useState } from "react";
import { FAQS } from "./faqs";
import s from "./faq.module.css";

export default function FaqAccordion() {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className={s.list}>
      {FAQS.map((item, i) => {
        const isOpen = open.has(i);
        return (
          <div key={item.q} className={`${s.item} ${isOpen ? s.open : ""}`}>
            <button
              type="button"
              className={s.trigger}
              aria-expanded={isOpen}
              onClick={() => toggle(i)}
            >
              <span>{item.q}</span>
              <svg className={s.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={s.panel}>
              <div className={s.panelInner}>
                <div className={s.answer}>{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
