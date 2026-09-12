"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken, removeToken } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  maxWidth?: string;
}

export default function AppShell({ children, maxWidth = "900px" }: Props) {
  const router = useRouter();

  function signOut() {
    removeToken();
    router.push("/login");
  }

  const isLoggedIn = getToken() !== null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", color: "var(--sb-cream)" }}>
      <header
        style={{
          padding: "14px clamp(16px, 3vw, 34px)",
          borderBottom: "1px solid #ece5d8",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-nunito), sans-serif",
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "-0.03em",
            color: "#000000",
            textDecoration: "none",
          }}
        >
          atlaso<span style={{ color: "var(--sb-cyan)" }}>.</span>
        </Link>

        {isLoggedIn && (
          <button
            onClick={signOut}
            style={{
              background: "none",
              border: "1px solid #d8cfbe",
              borderRadius: 999,
              padding: "7px 16px",
              fontSize: 13,
              color: "#4a443e",
              cursor: "pointer",
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontWeight: 500,
            }}
          >
            sign out
          </button>
        )}
      </header>
      <main style={{ maxWidth, margin: "0 auto", padding: "40px 24px" }}>{children}</main>
    </div>
  );
}
