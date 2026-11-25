import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import FaqAccordion from "./FaqAccordion";
import { FAQS, answerText } from "./faqs";
import s from "@/components/legal.module.css";

export const metadata: Metadata = {
  title: "Photo Book FAQ: Pricing, Shipping and Editing",
  description:
    "Answers to common questions about Atlaso travel photo books: how it works, how many photos you need, editing, pricing (₹2,499 with shipping), delivery across India, and returns.",
  alternates: { canonical: "/faq" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: answerText(f.a).replace(/\s+/g, " ").trim() },
  })),
};

export default function FaqPage() {
  return (
    <div className={s.page}>
      <JsonLd data={faqJsonLd} />
      <SiteHeader />

      <div className={s.container}>
        <div className={s.eyebrow}>Help</div>
        <h1 className={s.title}>Frequently asked questions</h1>
        <div className={s.updated}>Everything you need to know about building and ordering your book.</div>

        <FaqAccordion />
      </div>

      <Footer />
    </div>
  );
}
