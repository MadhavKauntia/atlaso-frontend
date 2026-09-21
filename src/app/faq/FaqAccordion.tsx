"use client";

import { useState } from "react";
import Link from "next/link";
import s from "./faq.module.css";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is Atlaso?",
    a: (
      <p>
        Atlaso turns your trip photos into a beautifully designed hardbound photobook. You upload your
        photos, our AI arranges them into a complete book in minutes, and you can preview, tweak, and
        order a printed copy delivered to your door.
      </p>
    ),
  },
  {
    q: "How does it work?",
    a: (
      <p>
        Upload your trip photos, pick a cover, and we automatically curate and lay them out across the
        pages. You then preview the book and fine-tune anything you like before ordering. See{" "}
        <Link href="/how-it-works">how it works</Link> for a step-by-step walkthrough.
      </p>
    ),
  },
  {
    q: "How many photos do I need?",
    a: (
      <p>
        You need at least <strong>50 photos</strong> to get started, and you can add up to{" "}
        <strong>1,000</strong>. There&apos;s no need to hand-pick your best shots. Just add them all and
        we&apos;ll curate the highlights for you.
      </p>
    ),
  },
  {
    q: "Can I add more photos after my book is generated?",
    a: (
      <p>
        No. Please upload everything before you generate the book. You can still swap, replace, and
        rearrange the shots that made it in from what you uploaded, but new photos can&apos;t be added to a
        book once it&apos;s created. So it&apos;s best to upload your whole trip up front.
      </p>
    ),
  },
  {
    q: "Can I edit the book after it's made?",
    a: (
      <p>
        Absolutely. In the preview you can replace or swap any photo, drag to reframe a shot, zoom in,
        rotate it, change a page&apos;s layout, and edit your cover title. The book updates live as you go.
      </p>
    ),
  },
  {
    q: "What size is the photobook?",
    a: (
      <p>
        Each book is a <strong>6.9 &times; 9.8 inch hardcover</strong> with 50 pages of full-bleed spreads
        on premium matte photo paper.
      </p>
    ),
  },
  {
    q: "How much does it cost?",
    a: (
      <p>
        A photobook is <strong>₹2,499</strong> per copy, all-inclusive, with shipping and taxes covered.
        You can order multiple copies (they make great gifts), and any launch or promo codes can be
        applied at checkout.
      </p>
    ),
  },
  {
    q: "Where do you ship, and how long does it take?",
    a: (
      <p>
        We print and deliver across India. Orders are typically printed within about 3 days and arrive
        within roughly 10 days of ordering. See{" "}
        <Link href="/shipping">shipping &amp; delivery</Link> for details.
      </p>
    ),
  },
  {
    q: "What if my book arrives damaged, or I'm not happy with it?",
    a: (
      <p>
        We stand behind every book. If it arrives damaged we&apos;ll reprint it free, and we offer a
        satisfaction guarantee. See our{" "}
        <Link href="/refund">refunds &amp; cancellation</Link> policy for how it works.
      </p>
    ),
  },
  {
    q: "How do I pay? Is checkout secure?",
    a: (
      <p>
        Payments are handled securely by Razorpay, which supports cards, UPI, and more. Your card details
        never touch our servers.
      </p>
    ),
  },
  {
    q: "Do I need an account?",
    a: (
      <p>
        You can start building right away, and sign in with Google (one click) to save your book and place
        an order. Signing in keeps your books together in your{" "}
        <Link href="/account">account</Link>.
      </p>
    ),
  },
  {
    q: "What happens to my photos?",
    a: (
      <p>
        Your photos are used to build and print your book, and nothing else. See our{" "}
        <Link href="/privacy">privacy policy</Link> for exactly how we handle your data.
      </p>
    ),
  },
  {
    q: "Still have a question?",
    a: (
      <p>
        We&apos;re happy to help. Reach us at{" "}
        <a href="mailto:support@myatlaso.com">support@myatlaso.com</a> or via our{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    ),
  },
];

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
