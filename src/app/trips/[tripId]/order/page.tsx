"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBook, type Book } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import FlowTopbar from "@/components/layout/FlowTopbar";
import CoverRenderer from "@/components/covers/CoverRenderer";
import { TEMPLATES } from "@/lib/covers/templates";
import { PAIRINGS } from "@/lib/covers/palette";

const DEFAULT_TEMPLATE_ID = "archway";
const DEFAULT_PAIRING_ID = "lisbon-sun";

const SIZES = [
  { id: "8x8", label: "8 × 8 in", detail: "Compact, travels well", basePrice: 49, delta: null, boxW: 36, boxH: 36 },
  { id: "10x10", label: "10 × 10 in", detail: "Our flagship size", basePrice: 69, delta: "+$20", badge: "Most popular", boxW: 48, boxH: 48 },
  { id: "12x8", label: "12 × 8 in", detail: "Landscape, cinematic", basePrice: 79, delta: "+$30", boxW: 66, boxH: 44 },
];

const PAPERS = [
  { id: "matte", label: "Archival matte", detail: "Warm, soft, non-reflective", price: 0, priceLabel: "Included", swatch: "matte" },
  { id: "gloss", label: "Lustre gloss", detail: "Vivid, sharp, modern", price: 0, priceLabel: "Included", swatch: "gloss" },
  { id: "linen", label: "Linen textured", detail: "Painterly, premium feel", price: 10, priceLabel: "+$10", swatch: "linen" },
];

const COVERS = [
  { id: "hardcover", label: "Hardcover", detail: "Built to sit on a shelf. Cloth spine, rigid boards.", price: 0, priceLabel: "Included" },
  { id: "softcover", label: "Softcover", detail: "Flexible, lighter. Great for travel.", price: -15, priceLabel: "−$15" },
];

const SHIPPING = 8;

function paperSwatch(type: string): React.CSSProperties {
  if (type === "gloss") return {
    background: "linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%), linear-gradient(135deg, #e6ecf5 0%, #a8c5ee 100%)",
  };
  if (type === "linen") return {
    backgroundImage: "repeating-linear-gradient(45deg, rgba(10,26,58,0.04) 0, rgba(10,26,58,0.04) 1px, transparent 1px, transparent 3px), linear-gradient(135deg, #f5f0e6 0%, #e6ddc7 100%)",
  };
  return { backgroundImage: "linear-gradient(135deg, #f8f4ea 0%, #ece4d3 100%)" };
}

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
  const [sizeId, setSizeId] = useState("10x10");
  const [paperId, setPaperId] = useState("matte");
  const [coverId, setCoverId] = useState("hardcover");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!bookId) return;
    getBook(bookId).then(setBook).catch(() => {});
  }, [bookId]);

  if (!ready) return null;

  const size = SIZES.find((s) => s.id === sizeId)!;
  const paper = PAPERS.find((p) => p.id === paperId)!;
  const cover = COVERS.find((c) => c.id === coverId)!;

  const unitPrice = size.basePrice + paper.price + cover.price;
  const extraQtyDiscount = qty > 1 ? Math.round(unitPrice * 0.4 * (qty - 1) * 100) / 100 : 0;
  const subtotal = unitPrice + unitPrice * 0.6 * (qty - 1);
  const total = subtotal + SHIPPING;

  const template = TEMPLATES[book?.coverTemplateId ?? DEFAULT_TEMPLATE_ID] ?? TEMPLATES[DEFAULT_TEMPLATE_ID];
  const pairing = PAIRINGS[book?.coverPaletteId ?? DEFAULT_PAIRING_ID] ?? PAIRINGS[DEFAULT_PAIRING_ID];
  const pageCount = book?.pages?.length ?? 0;

  const selectedOptionStyle = (selected: boolean): React.CSSProperties => ({
    background: "#fff",
    border: `2px solid ${selected ? "var(--blue)" : "rgba(10,26,58,0.08)"}`,
    borderRadius: 12,
    padding: 16,
    cursor: "pointer",
    transition: "border-color 0.15s, transform 0.15s",
    position: "relative",
  });

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
            Pick your size, paper, and cover. Most people go with 10×10 hardcover in archival matte — but every option prints beautifully.
          </p>

          {/* Size */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 20, fontWeight: 500 }}>Size</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", fontFamily: "var(--font-fraunces), serif" }}>All sizes hold the same {pageCount || 48} pages</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {SIZES.map((s) => (
                <div key={s.id} onClick={() => setSizeId(s.id)} style={selectedOptionStyle(sizeId === s.id)}>
                  {s.badge && (
                    <div style={{ display: "inline-block", padding: "2px 8px", background: "rgba(30,82,212,0.1)", color: "var(--blue)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", borderRadius: 100, marginBottom: 8, fontWeight: 500 }}>
                      {s.badge}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80, marginBottom: 12, justifyContent: "center" }}>
                    <div style={{ width: s.boxW, height: s.boxH, background: "var(--muted, #e6ecf5)", border: "1px solid rgba(10,26,58,0.15)", borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.4 }}>{s.detail}</div>
                  <div style={{ marginTop: 10, fontFamily: "var(--font-fraunces), serif", fontSize: 15, fontWeight: 500 }}>
                    ${s.basePrice}{s.delta && <span style={{ color: "var(--blue)", fontSize: 12 }}> {s.delta}</span>}
                  </div>
                  {sizeId === s.id && (
                    <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, background: "var(--blue)", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Paper */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 20, fontWeight: 500 }}>Paper</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", fontFamily: "var(--font-fraunces), serif" }}>All rated archival, 100+ year lifespan</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {PAPERS.map((p) => (
                <div key={p.id} onClick={() => setPaperId(p.id)} style={selectedOptionStyle(paperId === p.id)}>
                  <div style={{ height: 80, borderRadius: 6, marginBottom: 12, ...paperSwatch(p.swatch) }} />
                  <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.4 }}>{p.detail}</div>
                  <div style={{ marginTop: 10, fontFamily: "var(--font-fraunces), serif", fontSize: 15, fontWeight: 500 }}>
                    {p.price > 0 ? (
                      <>${unitPrice - size.basePrice + size.basePrice + p.price} <span style={{ color: "var(--blue)", fontSize: 12 }}>{p.priceLabel}</span></>
                    ) : p.priceLabel}
                  </div>
                  {paperId === p.id && (
                    <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, background: "var(--blue)", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cover type */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 20, fontWeight: 500 }}>Cover</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {COVERS.map((c) => (
                <div key={c.id} onClick={() => setCoverId(c.id)} style={selectedOptionStyle(coverId === c.id)}>
                  <div style={{ height: 80, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.id === "hardcover" ? (
                      <div style={{ width: 48, height: 64, background: "#1a3a6b", borderRadius: 2, boxShadow: "3px 3px 0 #0a1a3a" }} />
                    ) : (
                      <div style={{ width: 48, height: 64, background: "#6fa3e8", borderRadius: 2, transform: "perspective(200px) rotateY(-15deg)" }} />
                    )}
                  </div>
                  <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.4 }}>{c.detail}</div>
                  <div style={{ marginTop: 10, fontFamily: "var(--font-fraunces), serif", fontSize: 15, fontWeight: 500 }}>
                    {c.price < 0 ? <>${unitPrice + c.price} <span style={{ color: "var(--blue)", fontSize: 12 }}>{c.priceLabel}</span></> : c.priceLabel}
                  </div>
                  {coverId === c.id && (
                    <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, background: "var(--blue)", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 20, fontWeight: 500 }}>Quantity</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", fontFamily: "var(--font-fraunces), serif" }}>Extra copies print at 40% off</div>
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
            { label: "Size", value: size.label },
            { label: "Paper", value: paper.label },
            { label: "Cover", value: cover.label },
            { label: "Pages", value: String(pageCount || 48) },
            { label: "Quantity", value: String(qty) },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: 14 }}>
              <div style={{ color: "var(--ink-soft)" }}>{row.label}</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>{row.value}</div>
            </div>
          ))}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(10,26,58,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <div style={{ color: "var(--ink-soft)" }}>Subtotal</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>${subtotal.toFixed(2)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <div style={{ color: "var(--ink-soft)" }}>Shipping</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>${SHIPPING.toFixed(2)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 15 }}>Total</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 28, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>${total.toFixed(0)}</div>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(30,82,212,0.05)", borderRadius: 8, fontSize: 12, color: "var(--blue)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div>📦</div>
            <div>
              <strong style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>Order today, arrives by {deliveryDate()}.</strong>{" "}
              We print within 3 days and ship via DHL Express.
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
          <strong style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--ink)", fontWeight: 500 }}>${total.toFixed(0)}</strong>
          {" · "}{qty} × {book?.title ?? "book"}, {size.label} {cover.label.toLowerCase()} · free returns
        </div>
        <button
          onClick={() => router.push(`/trips/${tripId}/checkout?bookId=${bookId}&size=${sizeId}&paper=${paperId}&cover=${coverId}&qty=${qty}`)}
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
