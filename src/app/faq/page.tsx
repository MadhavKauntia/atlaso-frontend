import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import FaqAccordion from "./FaqAccordion";
import s from "@/components/legal.module.css";

export const metadata: Metadata = {
  title: "FAQ | Atlaso",
  description:
    "Answers to common questions about Atlaso travel photobooks: how it works, photos, editing, pricing, shipping, and returns.",
};

export default function FaqPage() {
  return (
    <div className={s.page}>
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
