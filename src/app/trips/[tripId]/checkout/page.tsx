"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBook, getBookByTripId, getMe, createRazorpayOrder, verifyRazorpayPayment, validateCoupon, type Book, type User, type CouponPreview } from "@/lib/api";
import { loadRazorpayScript } from "@/lib/razorpay";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import FullPageLoader from "@/components/FullPageLoader";
import CountryCover from "@/components/covers/CountryCover";
import Brand from "@/components/Brand";
import Link from "next/link";

const BOOK_PRICE = 1999; // ₹ per copy, all-inclusive (shipping + taxes included)

const DASH = "1px dashed #46403a";

const LABEL_STYLE: React.CSSProperties = {
  display: "block", fontSize: 11, textTransform: "uppercase",
  letterSpacing: "0.15em", color: "var(--sb-muted)", marginBottom: 6, fontWeight: 700,
};

function fieldStyle(error: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "13px 16px", fontSize: 15,
    border: `1px solid ${error ? "var(--sb-red)" : "var(--sb-panel-2)"}`, borderRadius: 12,
    background: "var(--sb-bg)", fontFamily: "inherit", color: "var(--sb-cream)", outline: "none",
    boxSizing: "border-box",
  };
}

const digits = (s: string) => s.replace(/\D/g, "");

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

/** Formats an amount in paise as rupees, showing decimals only when non-whole (₹999.50, ₹1,999). */
const money = (minor: number) => {
  const rupees = minor / 100;
  return rupees.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

export default function CheckoutPage({ params }: { params: Promise<{ tripId: string }> }) {
  const ready = useRequireAuth();
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";
  const qty = Math.max(1, parseInt(searchParams.get("qty") ?? "1", 10));
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    // Re-entering from the account page carries no ?bookId; fall back to the
    // trip's latest book so the cover renders instead of the empty fallback.
    (bookId ? getBook(bookId) : getBookByTripId(tripId)).then(setBook).catch(() => {});
    getMe().then(setUser).catch(() => {});
  }, [bookId, tripId]);

  if (!ready) return <FullPageLoader />;

  const pageCount = book?.pages?.length ?? 50;
  const listTotal = BOOK_PRICE * qty; // rupees, full amount sent to Razorpay
  const discountMinor = coupon ? coupon.discountMinor : 0; // preview only
  const payableMinor = coupon ? coupon.finalMinor : listTotal * 100;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const preview = await validateCoupon(code, qty);
      if (preview.valid) {
        setCoupon(preview);
      } else {
        setCoupon(null);
        setCouponError(preview.message ?? "Invalid coupon");
      }
    } catch {
      setCouponError("Couldn't check that coupon. Please try again.");
    } finally {
      setCheckingCoupon(false);
    }
  };
  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const errors: Record<string, string | null> = {
    address1: address1.trim() ? null : "Required",
    city: city.trim() ? null : "Required",
    state: state.trim() ? null : "Required",
    pincode: !pincode.trim()
      ? "Required"
      : !/^\d{6}$/.test(pincode.trim())
      ? "Enter a 6-digit pincode"
      : null,
    phone: !phone
      ? "Required"
      : !/^[6-9]\d{9}$/.test(phone)
      ? "Enter a valid 10-digit mobile number"
      : null,
  };
  const isValid = Object.values(errors).every((e) => !e);
  const err = (f: string) => (touched[f] ? errors[f] : null);
  const blur = (f: string) => () => setTouched((t) => ({ ...t, [f]: true }));

  const handlePay = async () => {
    setPayError(null);
    if (!isValid) {
      setTouched({ address1: true, city: true, state: true, pincode: true, phone: true });
      setPayError("Please fill in all required shipping details.");
      return;
    }
    setPaying(true);
    const shippingPayload = {
      addressLine1: address1.trim(),
      addressLine2: address2.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      country,
      phone: `+91${phone}`,
    };
    try {
      // 100%-off coupon: no payment. create-order records the order server-side and returns
      // { free: true }; skip Razorpay entirely and go straight to the confirmation page.
      if (coupon?.free) {
        const freeOrder = await createRazorpayOrder(tripId, qty, coupon.code, shippingPayload);
        if (!freeOrder.free) throw new Error("We couldn't place your free order. Please try again.");
        router.push(`/trips/${tripId}/confirmation?bookId=${book?.id ?? bookId}`);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Couldn't load the payment gateway. Check your connection and try again.");

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId) throw new Error("Payments are not configured. Please contact support.");

      // Price is computed server-side from trip + quantity (+ coupon); Razorpay applies the
      // linked coupon offer's discount at payment time. Shipping is sent now (already validated
      // above) so it's persisted on the checkout — the webhook can then record a shippable order
      // even if this browser never reaches the verify step below.
      const order = await createRazorpayOrder(tripId, qty, coupon?.code, shippingPayload);
      if (!order.orderId) throw new Error("Couldn't start the payment. Please try again.");

      const rzp = new window.Razorpay({
        key: keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Atlaso",
        description: `${book?.title ?? "Photobook"} · ${qty} ${qty > 1 ? "copies" : "copy"}`,
        prefill: {
          name: user?.name ?? "",
          email: user?.email ?? "",
          contact: `+91${phone}`,
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
              couponCode: coupon?.code,
              addressLine1: address1.trim(),
              addressLine2: address2.trim() || undefined,
              city: city.trim(),
              state: state.trim(),
              pincode: pincode.trim(),
              country,
              phone: `+91${phone}`,
            });
            if (!result.verified) throw new Error("We couldn't verify your payment. You have not been charged twice. Please contact support.");
            router.push(`/trips/${tripId}/confirmation?bookId=${book?.id ?? bookId}`);
          } catch (error) {
            setPayError(error instanceof Error ? error.message : "Payment verification failed.");
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
    } catch (error) {
      setPayError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-bg)", color: "var(--sb-cream)", position: "relative" }}>
      {/* Topbar — white atlaso header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 48px", borderBottom: "1px solid rgba(38,34,32,0.08)", background: "#fff" }}>
        <Brand height={26} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b6459" }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(30,138,95,0.14)", color: "var(--sb-green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🔒</span>
          Secure checkout
        </div>
        <Link href={`/trips/${tripId}/order?bookId=${book?.id ?? bookId}`} style={{ fontSize: 13, color: "#6b6459", textDecoration: "none" }}>
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
            Enter your shipping address. We&apos;ll print within 3 days and deliver across India.
          </p>

          {/* 1. Contact (from Google account, read-only) */}
          <FormSection num={1} title="Contact">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL_STYLE}>Name</label>
                <div style={readonlyBox}>{user?.name ?? "…"}</div>
              </div>
              <div>
                <label style={LABEL_STYLE}>Email</label>
                <div style={readonlyBox}>{user?.email ?? "…"}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--sb-muted-2)", marginTop: 10 }}>
              From your Google account. Order updates and your receipt go here.
            </div>
          </FormSection>

          {/* 2. Shipping address */}
          <FormSection num={2} title="Shipping address">
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>Address line 1</label>
              <input value={address1} onChange={(e) => setAddress1(e.target.value)} onBlur={blur("address1")} maxLength={255} style={fieldStyle(!!err("address1"))} />
              {err("address1") && <FieldError>{err("address1")}</FieldError>}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>Address line 2 <span style={{ color: "var(--sb-muted-2)", textTransform: "none", letterSpacing: "normal" }}>(optional)</span></label>
              <input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apartment, suite, etc." maxLength={255} style={fieldStyle(false)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={LABEL_STYLE}>City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} onBlur={blur("city")} maxLength={128} style={fieldStyle(!!err("city"))} />
                {err("city") && <FieldError>{err("city")}</FieldError>}
              </div>
              <div>
                <label style={LABEL_STYLE}>State</label>
                <select value={state} onChange={(e) => setState(e.target.value)} onBlur={blur("state")} style={fieldStyle(!!err("state"))}>
                  <option value="">Select…</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {err("state") && <FieldError>{err("state")}</FieldError>}
              </div>
              <div>
                <label style={LABEL_STYLE}>Pincode</label>
                <input value={pincode} onChange={(e) => setPincode(digits(e.target.value).slice(0, 6))} onBlur={blur("pincode")} inputMode="numeric" placeholder="560001" style={fieldStyle(!!err("pincode"))} />
                {err("pincode") && <FieldError>{err("pincode")}</FieldError>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL_STYLE}>Country</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} style={fieldStyle(false)}>
                  <option>India</option>
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Phone</label>
                <div style={{ display: "flex" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "0 14px",
                    fontSize: 15, color: "var(--sb-cream)", background: "var(--sb-bg)",
                    border: `1px solid ${err("phone") ? "var(--sb-red)" : "var(--sb-panel-2)"}`,
                    borderRight: "none", borderRadius: "12px 0 0 12px", whiteSpace: "nowrap",
                  }}>
                    <span style={{ fontSize: 16 }}>🇮🇳</span> +91
                  </div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(digits(e.target.value).slice(0, 10))}
                    onBlur={blur("phone")}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    maxLength={10}
                    style={{ ...fieldStyle(!!err("phone")), borderRadius: "0 12px 12px 0", borderLeft: "none" }}
                  />
                </div>
                {err("phone") && <FieldError>{err("phone")}</FieldError>}
              </div>
            </div>
          </FormSection>

          {/* 3. Payment */}
          <FormSection num={3} title="Payment">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "var(--sb-bg)", border: "1px solid var(--sb-panel-2)", borderRadius: 12 }}>
              <div style={{ fontSize: 18, lineHeight: 1 }}>🔒</div>
              <div style={{ fontSize: 13, color: "var(--sb-muted)", lineHeight: 1.5 }}>
                You&apos;ll complete payment securely via <strong style={{ color: "var(--sb-cream)" }}>Razorpay</strong> (card, UPI, netbanking, and wallets) after you press <strong style={{ color: "var(--sb-cream)" }}>Pay</strong>. Your card details never touch our servers.
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
              ...(qty > 1 ? [{ label: `₹${BOOK_PRICE.toLocaleString("en-IN")} × ${qty}`, value: `₹${listTotal.toLocaleString("en-IN")}` }] : []),
              { label: "Shipping & taxes", value: "Included" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                <div style={{ color: "var(--sb-muted)" }}>{row.label}</div>
                <div style={{ fontWeight: 700, color: "var(--sb-cream)" }}>{row.value}</div>
              </div>
            ))}
            {coupon && discountMinor > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                <div style={{ color: "var(--sb-green)" }}>Coupon {coupon.code}</div>
                <div style={{ fontWeight: 700, color: "var(--sb-green)" }}>−₹{money(discountMinor)}</div>
              </div>
            )}
          </div>

          {/* Coupon */}
          <div style={{ padding: "14px 0", marginTop: 4, borderTop: DASH }}>
            {coupon ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                <div style={{ color: "var(--sb-green)", fontWeight: 700 }}>✓ {coupon.code} applied</div>
                <button onClick={removeCoupon} style={{ background: "none", border: "none", color: "var(--sb-muted)", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}>
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                  placeholder="Coupon code"
                  style={{ ...fieldStyle(!!couponError), flex: 1 }}
                />
                <button
                  onClick={applyCoupon}
                  disabled={checkingCoupon || !couponInput.trim()}
                  style={{ padding: "0 18px", borderRadius: 12, border: "1px solid var(--sb-panel-2)", background: "var(--sb-bg)", color: "var(--sb-cream)", fontWeight: 700, cursor: checkingCoupon || !couponInput.trim() ? "default" : "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
                >
                  {checkingCoupon ? "…" : "Apply"}
                </button>
              </div>
            )}
            {couponError && <FieldError>{couponError}</FieldError>}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4, paddingTop: 16, borderTop: DASH }}>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 15, fontWeight: 800, color: "var(--sb-cream)" }}>Total</div>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--sb-cream)" }}>₹{money(payableMinor)}</div>
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
            {paying
              ? "Processing…"
              : coupon?.free
                ? "Place order — free"
                : `🔒 Pay ₹${money(payableMinor)} securely`}
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

const readonlyBox: React.CSSProperties = {
  width: "100%", padding: "13px 16px", fontSize: 15,
  border: "1px dashed var(--sb-panel-2)", borderRadius: 12,
  background: "transparent", color: "var(--sb-cream)",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

function FieldError({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#f0a39d", fontSize: 11, marginTop: 5 }}>{children}</div>;
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
