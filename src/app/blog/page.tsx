import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { POSTS, formatDate, renderPost } from "@/lib/blog";
import l from "@/components/legal.module.css";
import s from "./blog.module.css";

export const metadata: Metadata = {
  title: "Photo Book Guides and Ideas",
  description: "Guides and ideas for turning your trip photos into a travel photo book: choosing photos, layouts, covers, honeymoon books and destination ideas.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  return (
    <div className={l.page}>
      <SiteHeader />
      <div className={l.container}>
        <div className={l.eyebrow}>Blog</div>
        <h1 className={l.title}>Photo book guides and ideas</h1>
        <div className={l.updated}>How to turn a camera roll full of trip photos into a book you&apos;ll keep.</div>
        <div className={s.list}>
          {POSTS.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className={s.card}>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              <span>{formatDate(p.published)} · {renderPost(p).minutes} min read</span>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
