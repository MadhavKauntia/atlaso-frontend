"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBook, type Book } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import CoverRenderer from "@/components/covers/CoverRenderer";
import { TEMPLATES } from "@/lib/covers/templates";
import { PAIRINGS } from "@/lib/covers/palette";
import Link from "next/link";

const DEFAULT_TEMPLATE_ID = "archway";
const DEFAULT_PAIRING_ID = "lisbon-sun";
const SHIPPING_EXPRESS = 8;
const SHIPPING_STANDARD = 4;

const FIELD_STYLE: React.CSSProperties = {
  width: "100%", padding: "12px 14px", fontSize: 15,
  border: "1px solid rgba(10,26,58,0.15)", borderRadius: 8,
  background: "#fff", fontFamily: "inherit", color: "var(--ink)",
  outline: "none",
};
const LABEL_STYLE: React.CSSProperties = {
  display: "block", fontSize: 11, textTransform: "uppercase",
  letterSpacing: "0.15em", color: "var(--ink-soft)", marginBottom: 6, fontWeight: 500,
};

export default function CheckoutPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";
  const size = searchParams.get("size") ?? "10x10";
  const paper = searchParams.get("paper") ?? "matte";
  const coverType = searchParams.get("cover") ?? "hardcover";
  const qty = parseInt(searchParams.get("qty") ?? "1", 10);
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");
  const [phone, setPhone] = useState("");
  const [shipping, setShipping] = useState<"express" | "standard">("express");
  const [payMethod, setPayMethod] = useState<"card" | "upi" | "gpay">("card");

  useEffect(() => {
    if (!bookId) return;
    getBook(bookId).then(setBook).catch(() => {});
  }, [bookId]);

  if (!ready) return null;

  const template = TEMPLATES[book?.coverTemplateId ?? DEFAULT_TEMPLATE_ID] ?? TEMPLATES[DEFAULT_TEMPLATE_ID];
  const pairing = PAIRINGS[book?.coverPaletteId ?? DEFAULT_PAIRING_ID] ?? PAIRINGS[DEFAULT_PAIRING_ID];
  const pageCount = book?.pages?.length ?? 48;

  const sizeLabels: Record<string, string> = { "8x8": "8×8 in", "10x10": "10×10 in", "12x8": "12×8 in" };
  const paperLabels: Record<string, string> = { matte: "Archival matte", gloss: "Lustre gloss", linen: "Linen textured" };
  const basePrices: Record<string, number> = { "8x8": 49, "10x10": 69, "12x8": 79 };
  const paperExtra: Record<string, number> = { matte: 0, gloss: 0, linen: 10 };
  const coverExtra: Record<string, number> = { hardcover: 0, softcover: -15 };

  const unitPrice = (basePrices[size] ?? 69) + (paperExtra[paper] ?? 0) + (coverExtra[coverType] ?? 0);
  const subtotal = unitPrice + Math.round(unitPrice * 0.6 * (qty - 1) * 100) / 100;
  const shippingCost = shipping === "express" ? SHIPPING_EXPRESS : SHIPPING_STANDARD;
  const tax = country === "India" ? Math.round(subtotal * 0.18 * 100) / 100 : 0;
  const total = subtotal + shippingCost + tax;

  const handlePay = () => {
    // Navigate to confirmation (in a real app, payment gateway would handle this)
    router.push(`/trips/${tripId}/confirmation?bookId=${bookId}`);
  };

  function deliveryDate(extra: number) {
    const d = new Date();
    d.setDate(d.getDate() + extra);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", position: "relative" }}>
      {/* Grain */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100,
        opacity: 0.1, mixBlendMode: "multiply",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E")`,
      }} />

      {/* Topbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid rgba(10,26,58,0.08)", background: "#fff" }}>
        <Link href="/" style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 800, fontSize: 22, display: "flex", alignItems: "center", gap: 8, color: "var(--ink)", textDecoration: "none" }}>
          <span style={{ width: 9, height: 9, background: "var(--blue)", borderRadius: "50%", display: "inline-block" }} />
          Atlaso
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-soft)" }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(45,150,80,0.12)", color: "#2d9650", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🔒</span>
          Secure checkout
        </div>
        <Link href={`/trips/${tripId}/order?bookId=${bookId}`} style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}>
          ← Back to order
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "1fr 400px", gap: 48, alignItems: "start" }}>

        {/* LEFT: form */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 500, color: "var(--blue)", marginBottom: 14 }}>Checkout</div>
          <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 40, fontWeight: 300, lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 12, color: "var(--ink)" }}>
            Where should we <em style={{ fontStyle: "italic", color: "var(--blue)" }}>send</em> it?
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 32, lineHeight: 1.5 }}>
            Enter your shipping address and payment details. We'll print within 3 days and deliver across India.
          </p>

          {/* 1. Contact */}
          <FormSection num={1} title="Contact">
            <div>
              <label style={LABEL_STYLE}>Email for updates</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={FIELD_STYLE} />
            </div>
          </FormSection>

          {/* 2. Shipping address */}
          <FormSection num={2} title="Shipping address">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={LABEL_STYLE}>First name</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={FIELD_STYLE} /></div>
              <div><label style={LABEL_STYLE}>Last name</label><input value={lastName} onChange={(e) => setLastName(e.target.value)} style={FIELD_STYLE} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>Address line 1</label>
              <input value={address1} onChange={(e) => setAddress1(e.target.value)} style={FIELD_STYLE} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>Address line 2 <span style={{ color: "var(--ink-soft)", textTransform: "none", letterSpacing: "normal" }}>(optional)</span></label>
              <input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apartment, suite, etc." style={FIELD_STYLE} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={LABEL_STYLE}>City</label><input value={city} onChange={(e) => setCity(e.target.value)} style={FIELD_STYLE} /></div>
              <div><label style={LABEL_STYLE}>State</label><input value={state} onChange={(e) => setState(e.target.value)} style={FIELD_STYLE} /></div>
              <div><label style={LABEL_STYLE}>Pincode</label><input value={pincode} onChange={(e) => setPincode(e.target.value)} style={FIELD_STYLE} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL_STYLE}>Country</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} style={FIELD_STYLE}>
                  <option>India</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Singapore</option>
                  <option>Australia</option>
                </select>
              </div>
              <div><label style={LABEL_STYLE}>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" style={FIELD_STYLE} /></div>
            </div>
          </FormSection>

          {/* 3. Shipping method */}
          <FormSection num={3} title="Shipping method">
            {[
              { id: "express" as const, label: "DHL Express", detail: `Arrives by ${deliveryDate(10)} · tracked`, price: "$8.00" },
              { id: "standard" as const, label: "Standard post", detail: `Arrives ${deliveryDate(16)}–${deliveryDate(20)} · tracked`, price: "$4.00" },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setShipping(opt.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px",
                  border: `1.5px solid ${shipping === opt.id ? "var(--blue)" : "rgba(10,26,58,0.1)"}`,
                  background: shipping === opt.id ? "rgba(30,82,212,0.03)" : "#fff",
                  borderRadius: 10, cursor: "pointer", marginBottom: 10,
                  transition: "border-color 0.15s",
                }}
              >
                <RadioDot selected={shipping === opt.id} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{opt.detail}</div>
                </div>
                <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500, fontSize: 16 }}>{opt.price}</div>
              </div>
            ))}
          </FormSection>

          {/* 4. Payment */}
          <FormSection num={4} title="Payment">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Card */}
              <div
                onClick={() => setPayMethod("card")}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: `1.5px solid ${payMethod === "card" ? "var(--blue)" : "rgba(10,26,58,0.1)"}`, background: payMethod === "card" ? "rgba(30,82,212,0.03)" : "#fff", borderRadius: 10, cursor: "pointer", transition: "border-color 0.15s" }}
              >
                <RadioDot selected={payMethod === "card"} />
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Credit or debit card</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <PayBadge label="VISA" bg="#1a3a6b" color="#fff" />
                  <PayBadge label="MC" bg="#eb5757" color="#fff" />
                </div>
              </div>
              {payMethod === "card" && (
                <div style={{ marginTop: 2, padding: "14px 16px", borderTop: "1px dashed rgba(10,26,58,0.1)" }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={LABEL_STYLE}>Card number</label>
                    <input placeholder="1234 5678 9012 3456" style={FIELD_STYLE} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={LABEL_STYLE}>Expiry</label><input placeholder="MM / YY" style={FIELD_STYLE} /></div>
                    <div><label style={LABEL_STYLE}>CVC</label><input placeholder="123" style={FIELD_STYLE} /></div>
                  </div>
                </div>
              )}
              <div
                onClick={() => setPayMethod("upi")}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: `1.5px solid ${payMethod === "upi" ? "var(--blue)" : "rgba(10,26,58,0.1)"}`, background: payMethod === "upi" ? "rgba(30,82,212,0.03)" : "#fff", borderRadius: 10, cursor: "pointer", transition: "border-color 0.15s" }}
              >
                <RadioDot selected={payMethod === "upi"} />
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>UPI</div>
                <PayBadge label="UPI" bg="#2d9650" color="#fff" />
              </div>
              <div
                onClick={() => setPayMethod("gpay")}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: `1.5px solid ${payMethod === "gpay" ? "var(--blue)" : "rgba(10,26,58,0.1)"}`, background: payMethod === "gpay" ? "rgba(30,82,212,0.03)" : "#fff", borderRadius: 10, cursor: "pointer", transition: "border-color 0.15s" }}
              >
                <RadioDot selected={payMethod === "gpay"} />
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Google Pay</div>
                <PayBadge label="G·Pay" bg="#f2f2f2" color="#4285F4" />
              </div>
            </div>
          </FormSection>
        </div>

        {/* RIGHT: summary */}
        <div style={{ position: "sticky", top: 20, background: "#fff", borderRadius: 16, border: "1px solid rgba(10,26,58,0.08)", padding: 24 }}>
          <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 18, fontWeight: 500, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid rgba(10,26,58,0.08)" }}>
            Order summary
          </div>

          <div style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid rgba(10,26,58,0.06)" }}>
            <div style={{ width: 58, height: 78, borderRadius: 2, boxShadow: "0 4px 10px rgba(10,26,58,0.15)", flexShrink: 0, overflow: "hidden" }}>
              <CoverRenderer template={template} pairing={pairing} title={book?.title ?? "Your Trip"} subtitle={book?.subtitle ?? ""} style={{ width: 58, height: 78, display: "block" }} />
            </div>
            <div style={{ flex: 1, fontSize: 13 }}>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500, fontSize: 16, marginBottom: 4 }}>{book?.title ?? "Your Trip"}</div>
              <div style={{ color: "var(--ink-soft)", fontSize: 12, lineHeight: 1.5 }}>
                {book?.subtitle && <>{book.subtitle}<br /></>}
                {sizeLabels[size]} {coverType} · {paperLabels[paper]}<br />
                {pageCount} pages · Qty: {qty}
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500, fontSize: 15, whiteSpace: "nowrap" }}>
              ${unitPrice}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {[
              { label: "Subtotal", value: `$${subtotal.toFixed(2)}` },
              { label: "Shipping", value: `$${shippingCost.toFixed(2)}` },
              ...(tax > 0 ? [{ label: "Taxes (18% GST)", value: `$${tax.toFixed(2)}` }] : []),
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                <div style={{ color: "var(--ink-soft)" }}>{row.label}</div>
                <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }}>{row.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, paddingTop: 16, borderTop: "1px solid rgba(10,26,58,0.08)" }}>
            <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 15 }}>Total</div>
            <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>${total.toFixed(2)}</div>
          </div>

          <button
            onClick={handlePay}
            style={{
              display: "flex", width: "100%", marginTop: 20,
              padding: 16, background: "var(--ink)", color: "#fff",
              border: "none", borderRadius: 100, fontSize: 15, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            🔒 Pay ${total.toFixed(2)} securely
          </button>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "256-bit encrypted checkout powered by Stripe",
              "Free reprint if your book arrives damaged",
              "30-day satisfaction guarantee",
            ].map((text) => (
              <div key={text} style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.45 }}>
                <div style={{ width: 16, height: 16, background: "rgba(45,150,80,0.12)", color: "#2d9650", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0 }}>✓</div>
                {text}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function FormSection({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(10,26,58,0.08)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 18, fontWeight: 500 }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--ink)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, marginRight: 8 }}>{num}</span>
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected ? "var(--blue)" : "rgba(10,26,58,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {selected && <div style={{ width: 10, height: 10, background: "var(--blue)", borderRadius: "50%" }} />}
    </div>
  );
}

function PayBadge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <div style={{ width: 32, height: 22, borderRadius: 3, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color, letterSpacing: "0.05em" }}>
      {label}
    </div>
  );
}
