"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBook, getBookByTripId, exportBook, type Book } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import FullPageLoader from "@/components/FullPageLoader";
import FlowTopbar from "@/components/layout/FlowTopbar";
import CountryCover from "@/components/covers/CountryCover";

// Single product: one hardcover photobook, flat all-inclusive price.
const BOOK_PRICE = 1999; // ₹ per copy

const INCLUDED_FEATURES = [
  "6.9 × 9.8 inch hardbound, cloth spine, rigid boards",
  "Archival matte paper, 100+ year lifespan",
  "50 lay-flat pages so spreads never lose the middle",
  "Free shipping across India, taxes included",
];

function deliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

const DASH = "1px dashed #46403a";

export default function OrderPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    // Re-entering from the account page carries no ?bookId, so fall back to the
    // trip's latest book (same as the preview page) — otherwise the cover and
    // details render as an empty fallback.
    (bookId ? getBook(bookId) : getBookByTripId(tripId)).then((b) => {
      setBook(b);
      if (b.status !== "PDF_READY") exportBook(b).then(setBook).catch(() => {});
    }).catch(() => {});
  }, [bookId, tripId]);

  if (!ready) return <FullPageLoader />;

  const total = BOOK_PRICE * qty;
  const pageCount = book?.pages?.length ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", color: "var(--sb-cream)", paddingBottom: 120, position: "relative" }}>
      <FlowTopbar
        currentStep={4}
        rightSlot={
          <button
            onClick={() => router.push(`/trips/${tripId}/preview?bookId=${book?.id ?? bookId}`)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b6459", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
          >
            ← Back to preview
          </button>
        }
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 48, alignItems: "start" }}>

        {/* LEFT: config */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 700, color: "var(--sb-gold)", marginBottom: 14 }}>
            Step 4 of 4
          </div>
          <h1 style={{ fontFamily: "var(--font-dm-sans)", fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 12, color: "var(--sb-cream)" }}>
            Make it <span style={{ color: "var(--sb-red)" }}>yours</span>.
          </h1>
          <p style={{ fontSize: 15, color: "var(--sb-muted)", marginBottom: 36, lineHeight: 1.5, maxWidth: 520 }}>
            One beautifully made photobook, printed and delivered across India. Choose how many copies you&apos;d like, and that&apos;s it.
          </p>

          {/* Single variant — what's included */}
          <div style={{ marginBottom: 36, background: "var(--sb-panel)", borderRadius: 18, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 22, fontWeight: 800, color: "var(--sb-cream)" }}>The Atlaso photobook</div>
                <div style={{ fontSize: 13, color: "var(--sb-muted)", marginTop: 4 }}>{pageCount || 48} pages · one premium edition</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--sb-cream)" }}>₹{BOOK_PRICE.toLocaleString("en-IN")}</div>
                <div style={{ fontSize: 11, color: "var(--sb-muted)" }}>all-inclusive</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: DASH, paddingTop: 18 }}>
              {INCLUDED_FEATURES.map((feature) => (
                <div key={feature} style={{ display: "flex", gap: 10, fontSize: 14, color: "var(--sb-cream)", lineHeight: 1.45 }}>
                  <div style={{ width: 18, height: 18, background: "rgba(30,138,95,0.18)", color: "var(--sb-green)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>✓</div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 20, fontWeight: 800, color: "var(--sb-cream)" }}>Quantity</div>
              <div style={{ fontSize: 12, color: "var(--sb-muted)" }}>₹{BOOK_PRICE.toLocaleString("en-IN")} per copy</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--sb-panel)", padding: "12px 16px", borderRadius: 14, maxWidth: 280 }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--sb-panel-2)", background: "var(--sb-bg)", color: "var(--sb-cream)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                −
              </button>
              <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 22, fontWeight: 800, minWidth: 40, textAlign: "center", color: "var(--sb-cream)" }}>{qty}</div>
              <button
                onClick={() => setQty((q) => q + 1)}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--sb-panel-2)", background: "var(--sb-bg)", color: "var(--sb-cream)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                +
              </button>
              <div style={{ fontSize: 11, color: "var(--sb-muted)", marginLeft: "auto", textAlign: "right" }}>
                Great for gifts and<br />family keepsakes
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Order summary */}
        <div style={{ position: "sticky", top: 100, background: "var(--sb-panel)", borderRadius: 18, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 20, marginBottom: 20, borderBottom: DASH }}>
            <div style={{ flexShrink: 0 }}>
              <CountryCover country={book?.coverCountry} title={book?.title ?? "Your Trip"} description={book?.subtitle ?? ""} style={{ width: 62 }} />
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--sb-muted)", marginBottom: 4 }}>Your book</div>
              <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 20, fontWeight: 800, lineHeight: 1, marginBottom: 4, color: "var(--sb-cream)" }}>{book?.title ?? "Your Trip"}</div>
              {book?.subtitle && <div style={{ fontSize: 12, color: "var(--sb-muted)" }}>{book.subtitle}</div>}
            </div>
          </div>

          {[
            { label: "Edition", value: "Hardbound" },
            { label: "Format", value: "6.9 × 9.8 in" },
            { label: "Pages", value: String(pageCount || 48) },
            { label: "Quantity", value: String(qty) },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: 14 }}>
              <div style={{ color: "var(--sb-muted)" }}>{row.label}</div>
              <div style={{ fontWeight: 700, color: "var(--sb-cream)" }}>{row.value}</div>
            </div>
          ))}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: DASH }}>
            {qty > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                <div style={{ color: "var(--sb-muted)" }}>₹{BOOK_PRICE.toLocaleString("en-IN")} × {qty}</div>
                <div style={{ fontWeight: 700, color: "var(--sb-cream)" }}>₹{total.toLocaleString("en-IN")}</div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <div style={{ color: "var(--sb-muted)" }}>Shipping &amp; taxes</div>
              <div style={{ fontWeight: 700, color: "var(--sb-cream)" }}>Included</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
              <div style={{ fontFamily: "var(--font-bricolage)", fontWeight: 800, fontSize: 15, color: "var(--sb-cream)" }}>Total</div>
              <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 28, fontWeight: 800, color: "var(--sb-cream)", letterSpacing: "-0.02em" }}>₹{total.toLocaleString("en-IN")}</div>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: "12px 14px", background: "var(--sb-bg)", borderRadius: 12, fontSize: 12, color: "var(--sb-muted)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div>📦</div>
            <div>
              <strong style={{ fontWeight: 700, color: "var(--sb-cream)" }}>Order today, arrives by {deliveryDate()}.</strong>{" "}
              We print within 3 days and deliver across India.
            </div>
          </div>
        </div>

      </div>

      {/* Bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--sb-bg-deep)", padding: "18px 48px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: "1px solid var(--sb-panel-2)", zIndex: 10,
      }}>
        <div style={{ fontSize: 13, color: "var(--sb-muted)" }}>
          <strong style={{ fontFamily: "var(--font-bricolage)", color: "var(--sb-cream)", fontWeight: 800 }}>₹{total.toLocaleString("en-IN")}</strong>
          {" · "}{qty} × {book?.title ?? "book"}, hardbound · free shipping
        </div>
        <button
          onClick={() => router.push(`/trips/${tripId}/checkout?bookId=${book?.id ?? bookId}&qty=${qty}`)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 26px", background: "var(--sb-red)", color: "var(--sb-cream)",
            borderRadius: 999, fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", fontFamily: "var(--font-bricolage)",
          }}
        >
          Proceed to checkout
          <span style={{ width: 24, height: 24, background: "var(--sb-cream)", color: "var(--sb-red)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>→</span>
        </button>
      </div>
    </div>
  );
}
