"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBook, exportBook, type Book } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import FlowTopbar from "@/components/layout/FlowTopbar";
import CoverRenderer from "@/components/covers/CoverRenderer";
import { TEMPLATES } from "@/lib/covers/templates";
import { PAIRINGS } from "@/lib/covers/palette";

const DEFAULT_TEMPLATE_ID = "archway";
const DEFAULT_PAIRING_ID = "lisbon-sun";

// Single product: one hardcover photobook, flat all-inclusive price.
const BOOK_PRICE = 1999; // ₹ per copy

const INCLUDED_FEATURES = [
  "10 × 10 in hardcover, cloth spine, rigid boards",
  "Archival matte paper — 100+ year lifespan",
  "Lay-flat binding so spreads never lose the middle",
  "Free shipping across India, taxes included",
];

function deliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export default function OrderPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!bookId) return;
    getBook(bookId).then((b) => {
      setBook(b);
      if (b.status !== "PDF_READY") exportBook(b).then(setBook).catch(() => {});
    }).catch(() => {});
  }, [bookId]);

  if (!ready) return null;

  const total = BOOK_PRICE * qty;

  const template = TEMPLATES[book?.coverTemplateId ?? DEFAULT_TEMPLATE_ID] ?? TEMPLATES[DEFAULT_TEMPLATE_ID];
  const pairing = PAIRINGS[book?.coverPaletteId ?? DEFAULT_PAIRING_ID] ?? PAIRINGS[DEFAULT_PAIRING_ID];
  const pageCount = book?.pages?.length ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingBottom: 120, position: "relative" }}>
      {/* Grain */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100,
        opacity: 0.12, mixBlendMode: "multiply",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E")`,
      }} />

      <FlowTopbar currentStep={4} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 48, alignItems: "start" }}>

        {/* LEFT: config */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 500, color: "var(--blue)", marginBottom: 14 }}>
            Step 4 of 4
          </div>
          <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 44, fontWeight: 300, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 12, color: "var(--ink)" }}>
            Make it <em style={{ fontStyle: "italic", color: "var(--blue)" }}>yours</em>.
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", marginBottom: 36, lineHeight: 1.5, maxWidth: 520 }}>
            One beautifully made photobook, printed and delivered across India. Choose how many copies you&apos;d like — that&apos;s it.
          </p>

          {/* Single variant — what's included */}
          <div style={{ marginBottom: 36, background: "#fff", borderRadius: 16, border: "1px solid rgba(10,26,58,0.08)", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 22, fontWeight: 500 }}>The Atlaso photobook</div>
                <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{pageCount || 48} pages · one premium edition</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>₹{BOOK_PRICE.toLocaleString("en-IN")}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>all-inclusive</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid rgba(10,26,58,0.06)", paddingTop: 18 }}>
              {INCLUDED_FEATURES.map((feature) => (
                <div key={feature} style={{ display: "flex", gap: 10, fontSize: 14, color: "var(--ink)", lineHeight: 1.45 }}>
                  <div style={{ width: 18, height: 18, background: "rgba(45,150,80,0.12)", color: "#2d9650", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>✓</div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 20, fontWeight: 500 }}>Quantity</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", fontFamily: "var(--font-fraunces), serif" }}>₹{BOOK_PRICE.toLocaleString("en-IN")} per copy</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(10,26,58,0.08)", maxWidth: 280 }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(10,26,58,0.15)", background: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                −
              </button>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 22, fontWeight: 500, minWidth: 40, textAlign: "center" }}>{qty}</div>
              <button
                onClick={() => setQty((q) => q + 1)}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(10,26,58,0.15)", background: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                +
              </button>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: "auto", textAlign: "right" }}>
                Great for gifts and<br />family keepsakes
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Order summary */}
        <div style={{ position: "sticky", top: 100, background: "#fff", borderRadius: 16, border: "1px solid rgba(10,26,58,0.08)", padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid rgba(10,26,58,0.08)" }}>
            <div style={{ width: 62, height: 82, borderRadius: 2, boxShadow: "0 4px 12px rgba(10,26,58,0.15)", flexShrink: 0, overflow: "hidden" }}>
              <CoverRenderer template={template} pairing={pairing} title={book?.title ?? "Your Trip"} subtitle={book?.subtitle ?? ""} style={{ width: 62, height: 82, display: "block" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--ink-soft)", marginBottom: 4 }}>Your book</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 20, fontWeight: 500, lineHeight: 1, marginBottom: 4 }}>{book?.title ?? "Your Trip"}</div>
              {book?.subtitle && <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic" }}>{book.subtitle}</div>}
            </div>
          </div>

          {[
            { label: "Edition", value: "Hardcover" },
            { label: "Pages", value: String(pageCount || 48) },
            { label: "Quantity", value: String(qty) },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: 14 }}>
              <div style={{ color: "var(--ink-soft)" }}>{row.label}</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>{row.value}</div>
            </div>
          ))}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(10,26,58,0.08)" }}>
            {qty > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                <div style={{ color: "var(--ink-soft)" }}>₹{BOOK_PRICE.toLocaleString("en-IN")} × {qty}</div>
                <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>₹{total.toLocaleString("en-IN")}</div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <div style={{ color: "var(--ink-soft)" }}>Shipping &amp; taxes</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>Included</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 15 }}>Total</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 28, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>₹{total.toLocaleString("en-IN")}</div>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(30,82,212,0.05)", borderRadius: 8, fontSize: 12, color: "var(--blue)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div>📦</div>
            <div>
              <strong style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>Order today, arrives by {deliveryDate()}.</strong>{" "}
              We print within 3 days and deliver across India.
            </div>
          </div>
        </div>

      </div>

      {/* Bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#fff", padding: "18px 48px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: "1px solid rgba(10,26,58,0.08)", zIndex: 10,
      }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          <strong style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--ink)", fontWeight: 500 }}>₹{total.toLocaleString("en-IN")}</strong>
          {" · "}{qty} × {book?.title ?? "book"}, hardcover · free shipping
        </div>
        <button
          onClick={() => router.push(`/trips/${tripId}/checkout?bookId=${bookId}&qty=${qty}`)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 26px", background: "var(--ink)", color: "#fff",
            borderRadius: 100, fontWeight: 500, fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Proceed to payment
          <span style={{ width: 24, height: 24, background: "#fff", color: "var(--ink)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>→</span>
        </button>
      </div>
    </div>
  );
}
