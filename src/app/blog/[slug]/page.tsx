import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { POSTS, getPost, renderPost, formatDate } from "@/lib/blog";
import { getDestination } from "@/lib/destinations";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import l from "@/components/legal.module.css";
import s from "../blog.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  return {
    title: post.seoTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: path,
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
    },
    twitter: { title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  const { html, toc, minutes } = renderPost(post);
  const url = `${SITE_URL}/blog/${post.slug}`;
  const related = (post.related ?? []).map(getDestination).filter((d) => d !== undefined);
  const otherPosts = POSTS.filter((p) => p.slug !== post.slug);

  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.published,
      dateModified: post.updated ?? post.published,
      mainEntityOfPage: url,
      image: `${SITE_URL}/og-image.png`,
      keywords: post.keywords.join(", "),
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Atlaso", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <div className={l.page}>
      <JsonLd data={structured} />
      <SiteHeader />

      <article className={`${l.container} ${s.article}`}>
        <div className={l.eyebrow}><Link href="/blog" style={{ color: "inherit" }}>Blog</Link></div>
        <h1 className={l.title}>{post.title}</h1>
        <div className={s.meta}>
          {formatDate(post.published)} · {minutes} min read · by the Atlaso team
        </div>

        {toc.length > 2 && (
          <nav className={s.toc} aria-label="Contents">
            <div className={s.tocTitle}>In this guide</div>
            <ol>
              {toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.text}</a></li>)}
            </ol>
          </nav>
        )}

        <div className={`${l.prose} ${s.body}`} dangerouslySetInnerHTML={{ __html: html }} />

        <section className={`${l.prose} ${s.faq}`}>
          <h2>Frequently asked questions</h2>
          {post.faqs.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </section>

        <aside className={s.cta}>
          <h2>Turn your trip into a book</h2>
          <p>Upload your photos and get a finished 50-page hardcover in minutes. Free to build.</p>
          <Link href="/create" className={s.ctaBtn}>start my photo book →</Link>
        </aside>

        {related.length > 0 && (
          <div className={s.related}>
            <h2>Photo books by destination</h2>
            <div className={s.chips}>
              {related.map((d) => <Link key={d.path} href={`/photobook/${d.path}`}>{d.name} photo book</Link>)}
            </div>
          </div>
        )}

        <div className={s.related}>
          <h2>More guides</h2>
          <div className={s.chips}>
            {otherPosts.map((p) => <Link key={p.slug} href={`/blog/${p.slug}`}>{p.title}</Link>)}
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
