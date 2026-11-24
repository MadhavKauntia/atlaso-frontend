import Link from "next/link";
import Footer from "./Footer";
import Brand from "@/components/Brand";
import s from "./legal.module.css";

export default function PolicyPage({
  title,
  updated,
  eyebrow = "Legal",
  children,
}: {
  title: string;
  /** "Last updated" date; omit on pages where it doesn't apply (e.g. Contact). */
  updated?: string;
  /** Small label above the title. Defaults to "Legal" for the policy pages. */
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={s.page}>
      <div className={s.topbar}>
        <Brand height={26} />
        <Link href="/" className={s.topbarBack}>← back to home</Link>
      </div>

      <div className={s.container}>
        <div className={s.eyebrow}>{eyebrow}</div>
        <h1 className={s.title}>{title}</h1>
        {updated && <div className={s.updated}>Last updated: {updated}</div>}
        <div className={s.prose}>{children}</div>
      </div>

      <Footer />
    </div>
  );
}
