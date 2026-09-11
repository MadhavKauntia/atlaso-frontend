import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy — Atlaso",
  description: "How and when Atlaso photobooks are printed and delivered.",
};

export default function ShippingPolicyPage() {
  return (
    <PolicyPage title="Shipping & Delivery Policy" updated="12 September 2026">
      <p>
        This policy explains how your Atlaso photobook is produced and delivered once your order is confirmed.
      </p>

      <h2>Where we ship</h2>
      <p>We currently print and deliver across India.</p>

      <h2>Production time</h2>
      <p>
        Each photobook is custom-printed for you. Orders typically enter production immediately after payment
        and are printed within about <strong>3 business days</strong>.
      </p>

      <h2>Delivery time</h2>
      <p>
        After printing, your order is dispatched with our courier partners and usually arrives within
        <strong> 7–10 days of your order</strong>, depending on your location. These are estimates and not
        guaranteed delivery dates.
      </p>

      <h2>Shipping charges</h2>
      <p>
        Shipping is <strong>free</strong> — it is already included in the ₹1,999 all-inclusive price of your
        photobook.
      </p>

      <h2>Tracking</h2>
      <p>We&rsquo;ll keep you updated on your order by email. Where available, tracking details are shared once your order ships.</p>

      <h2>Delivery address</h2>
      <p>
        Please ensure your shipping address and contact details are accurate at checkout. We are not
        responsible for delays or failed deliveries caused by an incorrect or incomplete address.
      </p>

      <h2>Delays</h2>
      <p>
        Delivery timelines may occasionally be affected by courier delays, weather, or other factors outside
        our control. We&rsquo;ll do our best to keep you informed.
      </p>

      <h2>Damaged in transit</h2>
      <p>
        If your photobook arrives damaged, please see our <Link href="/refund">Refund &amp; Cancellation Policy</Link> for
        how to request a free replacement.
      </p>

      <h2>Contact</h2>
      <p>Questions about your delivery? Email <a href="mailto:support@myatlaso.com">support@myatlaso.com</a>.</p>
    </PolicyPage>
  );
}
