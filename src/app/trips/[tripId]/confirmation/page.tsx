"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBook, getBookByTripId, downloadReceipt, type Book } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import CountryCover from "@/components/covers/CountryCover";
import Brand from "@/components/Brand";

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
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";

  const [book, setBook] = useState<Book | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);

  useEffect(() => {
    const fetch = bookId ? getBook(bookId) : getBookByTripId(tripId);
    fetch.then(setBook).catch(() => {});
  }, [bookId, tripId]);

  if (!ready) return null;

  const title = book?.title ?? "Your Trip";

  const handleCopyReferral = () => {
    navigator.clipboard.writeText("https://atlaso.com/ref/you").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", color: "var(--sb-cream)", position: "relative" }}>
      {/* Topbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid rgba(38,34,32,0.08)", background: "#fff" }}>
        <Brand height={26} />
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--sb-red)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, fontFamily: "var(--font-bricolage), sans-serif" }}>
          A
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "60px 32px 40px", textAlign: "center", maxWidth: 780, margin: "0 auto" }}>
        <div style={{
          width: 64, height: 64, margin: "0 auto 28px",
          background: "var(--sb-green)", color: "#fff",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 700,
          animation: "pop 0.6s cubic-bezier(0.2,0.8,0.2,1)",
        }}>
          ✓
        </div>

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 700, color: "var(--sb-green)", marginBottom: 14 }}>
          Order confirmed
        </div>

        <h1 style={{ fontFamily: "var(--font-bricolage), sans-serif", fontSize: 52, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.03em", marginBottom: 16, color: "var(--sb-cream)" }}>
          Your <span style={{ color: "var(--sb-gold)" }}>{title}</span> is on its way.
        </h1>

        <p style={{ fontSize: 17, color: "var(--sb-muted)", lineHeight: 1.55, maxWidth: 520, margin: "0 auto", fontFamily: "var(--font-dm-sans), sans-serif" }}>
          We'll send you a shipping confirmation when your book leaves our studio. You'll get another email the moment it ships.
        </p>

        {/* Cover showcase */}
        <div style={{ margin: "48px auto 0", display: "flex", justifyContent: "center", perspective: 1000 }}>
          <div style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.45))", animation: "drift 5s ease-in-out infinite" }}>
            <CountryCover country={book?.coverCountry} title={title} description={book?.subtitle ?? ""} style={{ width: 240 }} />
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ maxWidth: 780, margin: "48px auto 40px", padding: "0 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "var(--sb-panel)", border: "1px solid #46403a", borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, color: "var(--sb-muted-2)", marginBottom: 10 }}>Order number</div>
          <div style={{ fontFamily: "var(--font-bricolage), sans-serif", fontSize: 22, fontWeight: 800, lineHeight: 1.1, marginBottom: 6, color: "var(--sb-cream)" }}>{ORDER_NUM}</div>
          <div style={{ fontSize: 13, color: "var(--sb-muted)", lineHeight: 1.5, fontFamily: "var(--font-dm-sans), sans-serif" }}>
            Placed on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div style={{ background: "var(--sb-panel)", border: "1px solid #46403a", borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, color: "var(--sb-muted-2)", marginBottom: 10 }}>Shipping to</div>
          <div style={{ fontFamily: "var(--font-bricolage), sans-serif", fontSize: 22, fontWeight: 800, lineHeight: 1.1, marginBottom: 6, color: "var(--sb-cream)" }}>Your Address</div>
          <div style={{ fontSize: 13, color: "var(--sb-muted)", lineHeight: 1.5, fontFamily: "var(--font-dm-sans), sans-serif" }}>
            We'll confirm your shipping address via email.
          </div>
        </div>

        {/* Timeline card — full width */}
        <div style={{ background: "var(--sb-panel)", border: "1px solid #46403a", borderRadius: 20, padding: 24, gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, color: "var(--sb-muted-2)", marginBottom: 20 }}>Tracking your book</div>

          <div style={{ position: "relative" }}>
            {/* Track line */}
            <div style={{ position: "absolute", top: 10, left: "10%", right: "10%", height: 2, background: "#46403a" }} />
            {/* Progress */}
            <div style={{ position: "absolute", top: 10, left: "10%", width: "12%", height: 2, background: "var(--sb-gold)" }} />

            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
              {TIMELINE_STEPS.map((step, i) => (
                <div key={step.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: step.status === "done" ? "var(--sb-gold)" : "var(--sb-bg-deep)",
                    border: `2px solid ${step.status === "pending" ? "#46403a" : "var(--sb-gold)"}`,
                    marginBottom: 10,
                    boxShadow: step.status === "current" ? "0 0 0 4px rgba(232,179,44,0.2)" : "none",
                  }} />
                  <div style={{
                    fontSize: 11, textAlign: "center", maxWidth: 80,
                    color: step.status === "pending" ? "var(--sb-muted-2)" : "var(--sb-cream)",
                    fontWeight: step.status === "pending" ? 400 : 700,
                    lineHeight: 1.3,
                    fontFamily: "var(--font-dm-sans), sans-serif",
                  }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--sb-muted)", marginTop: 3, fontFamily: "var(--font-dm-sans), sans-serif" }}>
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
          style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 26px", borderRadius: 999, fontWeight: 800, fontSize: 14, background: "var(--sb-red)", color: "var(--sb-cream)", border: "none", cursor: "pointer", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          View order details →
        </button>
        <button
          onClick={() => {
            setReceiptBusy(true);
            downloadReceipt(tripId)
              .catch(() => alert("Couldn't download your receipt. Please try again in a moment."))
              .finally(() => setReceiptBusy(false));
          }}
          disabled={receiptBusy}
          style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 26px", borderRadius: 999, fontWeight: 800, fontSize: 14, background: "transparent", color: "var(--sb-gold)", border: "1px solid #5a5249", cursor: receiptBusy ? "not-allowed" : "pointer", opacity: receiptBusy ? 0.6 : 1, fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {receiptBusy ? "Preparing…" : "Download receipt"}
        </button>
      </div>

      {/* Referral band */}
      <div style={{ maxWidth: 780, margin: "0 auto 60px", padding: "28px 32px", borderTop: "1px solid #46403a", borderBottom: "1px solid #46403a", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 20, fontWeight: 700, lineHeight: 1.3, maxWidth: 380, letterSpacing: "-0.02em", color: "var(--sb-cream)" }}>
          Know someone who'd love Atlaso? Give them{" "}
          <span style={{ color: "var(--sb-gold)", fontWeight: 800 }}>₹400 off</span>{" "}
          their first book.
        </div>
        <button
          onClick={handleCopyReferral}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "12px 22px", background: copied ? "rgba(30,138,95,0.15)" : "var(--sb-panel-2)",
            color: copied ? "var(--sb-green)" : "var(--sb-gold)", borderRadius: 999,
            fontWeight: 800, fontSize: 14,
            border: `1px solid ${copied ? "rgba(30,138,95,0.4)" : "#5a5249"}`,
            cursor: "pointer", fontFamily: "var(--font-bricolage), sans-serif", transition: "all 0.2s",
          }}
        >
          {copied ? "Copied! ✓" : "Copy your referral link ↗"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 32px 48px", textAlign: "center", fontSize: 13, color: "var(--sb-muted)", lineHeight: 1.7, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        Questions about your order? Reach us at{" "}
        <a href="mailto:hello@atlaso.com" style={{ color: "var(--sb-gold)", textDecoration: "none" }}>hello@atlaso.com</a>
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
