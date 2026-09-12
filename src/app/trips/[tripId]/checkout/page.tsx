"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBook, createRazorpayOrder, verifyRazorpayPayment, type Book } from "@/lib/api";
import { loadRazorpayScript } from "@/lib/razorpay";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import CountryCover from "@/components/covers/CountryCover";
import Link from "next/link";

const BOOK_PRICE = 1999; // ₹ per copy, all-inclusive (shipping + taxes included)

const DASH = "1px dashed #46403a";

const FIELD_STYLE: React.CSSProperties = {
  width: "100%", padding: "13px 16px", fontSize: 15,
  border: "1px solid var(--sb-panel-2)", borderRadius: 12,
  background: "var(--sb-bg)", fontFamily: "inherit", color: "var(--sb-cream)",
  outline: "none",
};
const LABEL_STYLE: React.CSSProperties = {
  display: "block", fontSize: 11, textTransform: "uppercase",
  letterSpacing: "0.15em", color: "var(--sb-muted)", marginBottom: 6, fontWeight: 700,
};

export default function CheckoutPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";
  const qty = Math.max(1, parseInt(searchParams.get("qty") ?? "1", 10));
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
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    getBook(bookId).then(setBook).catch(() => {});
  }, [bookId]);

  if (!ready) return null;

  const pageCount = book?.pages?.length ?? 48;

  const total = BOOK_PRICE * qty;

  const handlePay = async () => {
    setPayError(null);
    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Couldn't load the payment gateway. Check your connection and try again.");

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId) throw new Error("Payments are not configured. Please contact support.");

      // Razorpay expects the amount in the smallest currency unit (paise for INR).
      const amountPaise = Math.round(total * 100);
      const order = await createRazorpayOrder(amountPaise, "INR", `trip_${tripId}`);

      const rzp = new window.Razorpay({
        key: keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Atlaso",
        description: `${book?.title ?? "Photobook"} · ${qty} ${qty > 1 ? "copies" : "copy"}`,
        prefill: {
          name: `${firstName} ${lastName}`.trim(),
          email,
          contact: phone,
        },
        theme: { color: "#c9352c" },
        handler: async (response) => {
          try {
            const result = await verifyRazorpayPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              tripId,
              quantity: qty,
            });
            if (!result.verified) throw new Error("We couldn't verify your payment. You have not been charged twice — please contact support.");
            router.push(`/trips/${tripId}/confirmation?bookId=${bookId}`);
          } catch (err) {
            setPayError(err instanceof Error ? err.message : "Payment verification failed.");
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });

      rzp.on("payment.failed", (resp) => {
        const description = (resp as { error?: { description?: string } })?.error?.description;
        setPayError(description ?? "Payment failed. Please try again.");
        setPaying(false);
      });

      rzp.open();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", color: "var(--sb-cream)", position: "relative" }}>
      {/* Topbar — white atlaso header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 48px", borderBottom: "1px solid rgba(38,34,32,0.08)", background: "#fff" }}>
        <Link href="/" style={{ fontFamily: "var(--font-nunito), sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", color: "var(--sb-ink)", textDecoration: "none" }}>
          atlaso<span style={{ color: "var(--sb-cyan)" }}>.</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b6459" }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(30,138,95,0.14)", color: "var(--sb-green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🔒</span>
          Secure checkout
        </div>
        <Link href={`/trips/${tripId}/order?bookId=${bookId}`} style={{ fontSize: 13, color: "#6b6459", textDecoration: "none" }}>
          ← Back to order
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "1fr 400px", gap: 48, alignItems: "start" }}>

        {/* LEFT: form */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 700, color: "var(--sb-gold)", marginBottom: 14 }}>Checkout</div>
          <h1 style={{ fontFamily: "var(--font-dm-sans)", fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 12, color: "var(--sb-cream)" }}>
            Where should we <span style={{ color: "var(--sb-red)" }}>send</span> it?
          </h1>
          <p style={{ fontSize: 14, color: "var(--sb-muted)", marginBottom: 32, lineHeight: 1.5 }}>
            Enter your shipping address and payment details. We&apos;ll print within 3 days and deliver across India.
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
              <label style={LABEL_STYLE}>Address line 2 <span style={{ color: "var(--sb-muted-2)", textTransform: "none", letterSpacing: "normal" }}>(optional)</span></label>
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

          {/* 3. Payment */}
          <FormSection num={3} title="Payment">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "var(--sb-bg)", border: "1px solid var(--sb-panel-2)", borderRadius: 12 }}>
              <div style={{ fontSize: 18, lineHeight: 1 }}>🔒</div>
              <div style={{ fontSize: 13, color: "var(--sb-muted)", lineHeight: 1.5 }}>
                You&apos;ll complete payment securely via <strong style={{ color: "var(--sb-cream)" }}>Razorpay</strong> — card, UPI, netbanking, and wallets — after you press <strong style={{ color: "var(--sb-cream)" }}>Pay</strong>. Your card details never touch our servers.
              </div>
            </div>
          </FormSection>
        </div>

        {/* RIGHT: summary */}
        <div style={{ position: "sticky", top: 20, background: "var(--sb-panel)", borderRadius: 18, padding: 24 }}>
          <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, marginBottom: 16, paddingBottom: 14, borderBottom: DASH, color: "var(--sb-cream)" }}>
            Order summary
          </div>

          <div style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: DASH }}>
            <div style={{ flexShrink: 0 }}>
              <CountryCover country={book?.coverCountry} title={book?.title ?? "Your Trip"} description={book?.subtitle ?? ""} style={{ width: 58 }} />
            </div>
            <div style={{ flex: 1, fontSize: 13 }}>
              <div style={{ fontFamily: "var(--font-bricolage)", fontWeight: 800, fontSize: 16, marginBottom: 4, color: "var(--sb-cream)" }}>{book?.title ?? "Your Trip"}</div>
              <div style={{ color: "var(--sb-muted)", fontSize: 12, lineHeight: 1.5 }}>
                {book?.subtitle && <>{book.subtitle}<br /></>}
                Hardbound photobook<br />
                {pageCount} pages · Qty: {qty}
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-bricolage)", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", color: "var(--sb-cream)" }}>
              ₹{BOOK_PRICE.toLocaleString("en-IN")}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {[
              ...(qty > 1 ? [{ label: `₹${BOOK_PRICE.toLocaleString("en-IN")} × ${qty}`, value: `₹${total.toLocaleString("en-IN")}` }] : []),
              { label: "Shipping & taxes", value: "Included" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                <div style={{ color: "var(--sb-muted)" }}>{row.label}</div>
                <div style={{ fontWeight: 700, color: "var(--sb-cream)" }}>{row.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, paddingTop: 16, borderTop: DASH }}>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 15, fontWeight: 800, color: "var(--sb-cream)" }}>Total</div>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--sb-cream)" }}>₹{total.toLocaleString("en-IN")}</div>
          </div>

          {payError && (
            <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(201,53,44,0.12)", border: "1px solid rgba(201,53,44,0.4)", borderRadius: 10, fontSize: 13, color: "#f0a39d", lineHeight: 1.4 }}>
              {payError}
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={paying}
            style={{
              display: "flex", width: "100%", marginTop: 20,
              padding: 16, background: paying ? "var(--sb-panel-2)" : "var(--sb-red)", color: paying ? "#8a7f6f" : "var(--sb-cream)",
              border: "none", borderRadius: 999, fontSize: 15, fontWeight: 800,
              cursor: paying ? "default" : "pointer", fontFamily: "var(--font-bricolage)", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            {paying ? "Processing…" : `🔒 Pay ₹${total.toLocaleString("en-IN")} securely`}
          </button>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "256-bit encrypted checkout powered by Razorpay",
              "Free reprint if your book arrives damaged",
              "30-day satisfaction guarantee",
            ].map((text) => (
              <div key={text} style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--sb-muted)", lineHeight: 1.45 }}>
                <div style={{ width: 16, height: 16, background: "rgba(30,138,95,0.18)", color: "var(--sb-green)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0 }}>✓</div>
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
    <div style={{ background: "var(--sb-panel)", borderRadius: 18, padding: 24, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: "var(--sb-cream)" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--sb-red)", color: "var(--sb-cream)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, marginRight: 8 }}>{num}</span>
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}
