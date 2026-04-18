"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBook, type Book } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import CoverRenderer from "@/components/covers/CoverRenderer";
import { TEMPLATES } from "@/lib/covers/templates";
import { PAIRINGS } from "@/lib/covers/palette";
import Link from "next/link";

const DEFAULT_TEMPLATE_ID = "archway";
const DEFAULT_PAIRING_ID = "lisbon-sun";

const TIMELINE_STEPS = [
  { label: "Order placed", status: "done" as const },
  { label: "In production", status: "current" as const },
  { label: "Quality check", status: "pending" as const },
  { label: "Shipped", status: "pending" as const },
  { label: "Delivered", status: "pending" as const },
];

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TIMELINE_DATES = [
  "Today",
  `${addDays(1)}–${addDays(3)}`,
  addDays(4),
  addDays(5),
  `By ${addDays(10)}`,
];

function orderNumber() {
  const n = Math.floor(Math.random() * 9000) + 1000;
  const y = new Date().getFullYear();
  return `#ATL-${y}-${n}`;
}

const ORDER_NUM = orderNumber();

export default function ConfirmationPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  use(params); // needed to extract tripId if required
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";

  const [book, setBook] = useState<Book | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    getBook(bookId).then(setBook).catch(() => {});
  }, [bookId]);

  if (!ready) return null;

  const template = TEMPLATES[book?.coverTemplateId ?? DEFAULT_TEMPLATE_ID] ?? TEMPLATES[DEFAULT_TEMPLATE_ID];
  const pairing = PAIRINGS[book?.coverPaletteId ?? DEFAULT_PAIRING_ID] ?? PAIRINGS[DEFAULT_PAIRING_ID];
  const title = book?.title ?? "Your Trip";

  const handleCopyReferral = () => {
    navigator.clipboard.writeText("https://atlaso.com/ref/you").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", position: "relative" }}>
      {/* Grain */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100,
        opacity: 0.12, mixBlendMode: "multiply",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E")`,
      }} />

      {/* Ambient gradients */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: -1,
        background: `
          radial-gradient(ellipse 70% 50% at 85% 15%, rgba(168,197,238,0.4), transparent 60%),
          radial-gradient(ellipse 60% 40% at 10% 90%, rgba(111,163,232,0.25), transparent 60%)
        `,
      }} />

      {/* Topbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid rgba(10,26,58,0.08)", background: "#fff" }}>
        <Link href="/" style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 800, fontSize: 22, display: "flex", alignItems: "center", gap: 8, color: "var(--ink)", textDecoration: "none" }}>
          <span style={{ width: 9, height: 9, background: "var(--blue)", borderRadius: "50%", display: "inline-block" }} />
          Atlaso
        </Link>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--blue)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>
          A
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "60px 32px 40px", textAlign: "center", maxWidth: 780, margin: "0 auto" }}>
        <div style={{
          width: 64, height: 64, margin: "0 auto 28px",
          background: "rgba(45,150,80,0.12)", color: "#2d9650",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 500,
          animation: "pop 0.6s cubic-bezier(0.2,0.8,0.2,1)",
        }}>
          ✓
        </div>

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 500, color: "#2d9650", marginBottom: 14 }}>
          Order confirmed
        </div>

        <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 52, fontWeight: 300, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 16, color: "var(--ink)" }}>
          Your <em style={{ fontStyle: "italic", color: "var(--blue)" }}>{title}</em> is on its way.
        </h1>

        <p style={{ fontSize: 17, color: "var(--ink-soft)", lineHeight: 1.55, maxWidth: 520, margin: "0 auto" }}>
          We'll send you a shipping confirmation when your book leaves our studio. You'll get another email the moment it ships.
        </p>

        {/* Cover showcase */}
        <div style={{ margin: "48px auto 0", display: "flex", justifyContent: "center", perspective: 1000 }}>
          <div style={{ filter: "drop-shadow(0 30px 60px rgba(10,26,58,0.25))", animation: "drift 5s ease-in-out infinite" }}>
            <CoverRenderer
              template={template}
              pairing={pairing}
              title={title}
              subtitle={book?.subtitle ?? ""}
              style={{ width: 240, height: 320, display: "block", borderRadius: 2 }}
            />
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ maxWidth: 780, margin: "48px auto 40px", padding: "0 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", border: "1px solid rgba(10,26,58,0.08)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 500, color: "var(--ink-soft)", marginBottom: 10 }}>Order number</div>
          <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 22, fontWeight: 500, lineHeight: 1.1, marginBottom: 6 }}>{ORDER_NUM}</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            Placed on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid rgba(10,26,58,0.08)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 500, color: "var(--ink-soft)", marginBottom: 10 }}>Shipping to</div>
          <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 22, fontWeight: 500, lineHeight: 1.1, marginBottom: 6 }}>Your Address</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            We'll confirm your shipping address via email.
          </div>
        </div>

        {/* Timeline card — full width */}
        <div style={{ background: "#fff", border: "1px solid rgba(10,26,58,0.08)", borderRadius: 14, padding: 24, gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 500, color: "var(--ink-soft)", marginBottom: 20 }}>Tracking your book</div>

          <div style={{ position: "relative" }}>
            {/* Track line */}
            <div style={{ position: "absolute", top: 10, left: "10%", right: "10%", height: 2, background: "rgba(10,26,58,0.08)" }} />
            {/* Progress */}
            <div style={{ position: "absolute", top: 10, left: "10%", width: "12%", height: 2, background: "var(--blue)" }} />

            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
              {TIMELINE_STEPS.map((step, i) => (
                <div key={step.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: step.status === "done" ? "var(--blue)" : "#fff",
                    border: `2px solid ${step.status === "pending" ? "rgba(10,26,58,0.15)" : "var(--blue)"}`,
                    marginBottom: 10,
                    boxShadow: step.status === "current" ? "0 0 0 4px rgba(30,82,212,0.15)" : "none",
                  }} />
                  <div style={{
                    fontSize: 11, textAlign: "center", maxWidth: 80,
                    color: step.status === "pending" ? "var(--ink-soft)" : "var(--ink)",
                    fontWeight: step.status === "pending" ? 400 : 500,
                    lineHeight: 1.3,
                  }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-soft)", marginTop: 3, fontFamily: "var(--font-fraunces), serif", fontStyle: "italic" }}>
                    {TIMELINE_DATES[i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA row */}
      <div style={{ maxWidth: 780, margin: "0 auto 60px", padding: "0 32px", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => {}}
          style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 26px", borderRadius: 100, fontWeight: 500, fontSize: 14, background: "var(--ink)", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          View order details →
        </button>
        <button
          onClick={() => {}}
          style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 26px", borderRadius: 100, fontWeight: 500, fontSize: 14, background: "transparent", color: "var(--ink)", border: "1px solid rgba(10,26,58,0.2)", cursor: "pointer", fontFamily: "inherit" }}
        >
          Download PDF preview
        </button>
      </div>

      {/* Referral band */}
      <div style={{ maxWidth: 780, margin: "0 auto 60px", padding: "28px 32px", borderTop: "1px solid rgba(10,26,58,0.08)", borderBottom: "1px solid rgba(10,26,58,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 20, fontWeight: 400, lineHeight: 1.3, maxWidth: 380 }}>
          Know someone who'd love Atlaso? Give them{" "}
          <em style={{ fontStyle: "italic", color: "var(--blue)", fontWeight: 600 }}>₹400 off</em>{" "}
          their first book.
        </div>
        <button
          onClick={handleCopyReferral}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "12px 22px", background: copied ? "rgba(45,150,80,0.1)" : "rgba(30,82,212,0.08)",
            color: copied ? "#2d9650" : "var(--blue)", borderRadius: 100,
            fontWeight: 500, fontSize: 14,
            border: `1px solid ${copied ? "rgba(45,150,80,0.2)" : "rgba(30,82,212,0.2)"}`,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
          }}
        >
          {copied ? "Copied! ✓" : "Copy your referral link ↗"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 32px 48px", textAlign: "center", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7 }}>
        Questions about your order? Reach us at{" "}
        <a href="mailto:hello@atlaso.com" style={{ color: "var(--blue)", textDecoration: "none" }}>hello@atlaso.com</a>
        <br />
        <span style={{ opacity: 0.7 }}>Every book is printed in Bengaluru and shipped from our studio.</span>
      </div>

      <style>{`
        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drift {
          0%, 100% { transform: rotateY(-8deg) rotateX(2deg); }
          50% { transform: rotateY(-4deg) rotateX(-1deg) translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
