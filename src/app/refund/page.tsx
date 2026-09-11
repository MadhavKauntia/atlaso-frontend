import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Atlaso",
  description: "When Atlaso orders can be cancelled or refunded.",
};

export default function RefundPolicyPage() {
  return (
    <PolicyPage title="Refund & Cancellation Policy" updated="12 September 2026">
      <p>
        Every Atlaso photobook is <strong>personalised and made to order</strong> from your own photos.
        Because each book is custom-printed for you, our refund and cancellation terms are set out below.
        Please review your book carefully in the preview before placing your order.
      </p>

      <h2>Cancellations</h2>
      <p>
        You may request to cancel your order only <strong>before it enters production</strong>. Once printing
        has begun, the order cannot be cancelled, as the book is custom-made and cannot be resold. To request
        a cancellation, email <a href="mailto:support@myatlaso.com">support@myatlaso.com</a> with your order
        number as soon as possible after ordering.
      </p>

      <h2>Refunds and replacements</h2>
      <p>
        As our products are personalised, <strong>we do not offer refunds or exchanges for change of mind</strong>,
        or for ordering the wrong photos, layout, or options.
      </p>
      <p>We will provide a free replacement or a refund only if:</p>
      <ul>
        <li>your photobook arrives <strong>damaged</strong> (for example, damaged in transit); or</li>
        <li>the photobook is <strong>defective</strong> or was <strong>printed incorrectly due to an error on our part</strong> (for example, a printing, binding, or fulfilment mistake).</li>
      </ul>

      <h2>How to make a claim</h2>
      <p>
        If your order is damaged or printed incorrectly, email
        {" "}<a href="mailto:support@myatlaso.com">support@myatlaso.com</a> <strong>within 7 days of delivery</strong>
        with your order number and clear photos showing the issue. We may ask for additional details to verify
        the claim.
      </p>

      <h2>Our resolution</h2>
      <p>
        For a valid claim, we will <strong>reprint and reship your photobook free of charge</strong>. If we are
        unable to produce a satisfactory replacement, we will issue a <strong>full refund</strong> to your
        original payment method via Razorpay, typically within 5–7 business days of approval.
      </p>

      <h2>Not eligible</h2>
      <ul>
        <li>Change of mind or no-longer-wanted orders.</li>
        <li>Errors in the photos, captions, or options you selected and approved before ordering.</li>
        <li>Minor variations in colour, tone, or finish that are inherent to printing.</li>
        <li>Damage caused after delivery.</li>
        <li>Claims raised more than 7 days after delivery.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        For any refund or cancellation request, contact <a href="mailto:support@myatlaso.com">support@myatlaso.com</a>.
      </p>
    </PolicyPage>
  );
}
