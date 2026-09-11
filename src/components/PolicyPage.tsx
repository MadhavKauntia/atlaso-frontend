import Link from "next/link";
import Footer from "./Footer";
import s from "./legal.module.css";

export default function PolicyPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className={s.page}>
      <div className={s.topbar}>
        <Link href="/" className={s.topbarLogo}>
          <span style={{ width: 9, height: 9, background: "var(--blue)", borderRadius: "50%", display: "inline-block" }} />
          Atlaso
        </Link>
        <Link href="/" className={s.topbarBack}>← Back to home</Link>
      </div>

      <div className={s.container}>
        <div className={s.eyebrow}>Legal</div>
        <h1 className={s.title}>{title}</h1>
        <div className={s.updated}>Last updated: {updated}</div>
        <div className={s.prose}>{children}</div>
      </div>

      <Footer />
    </div>
  );
}
