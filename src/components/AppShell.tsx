import Link from "next/link";

interface Props {
  children: React.ReactNode;
  maxWidth?: string;
}

export default function AppShell({ children, maxWidth = "900px" }: Props) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <header style={{
        padding: "20px 40px",
        borderBottom: "1px solid rgba(10,26,58,0.1)",
        background: "var(--white)",
        display: "flex",
        alignItems: "center",
      }}>
        <Link href="/" style={{
          fontFamily: "var(--font-fraunces), serif",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{
            width: 9, height: 9,
            background: "var(--blue)",
            borderRadius: "50%",
            display: "inline-block",
          }} />
          Atlaso
        </Link>
      </header>
      <main style={{ maxWidth, margin: "0 auto", padding: "40px 24px" }}>
        {children}
      </main>
    </div>
  );
}
