import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Contact Us — Atlaso",
  description: "Get in touch with the Atlaso team.",
};

export default function ContactPage() {
  return (
    <PolicyPage title="Contact Us" updated="12 September 2026">
      <p>
        We&rsquo;d love to help. For any questions about your book, an order, a delivery, or a refund, reach
        out and we&rsquo;ll get back to you as soon as we can.
      </p>

      <h2>Email</h2>
      <p>
        <a href="mailto:support@myatlaso.com">support@myatlaso.com</a>
        <br />
        We typically respond within 1–2 business days.
      </p>

      <h2>Order support</h2>
      <p>
        When contacting us about an existing order, please include your <strong>order number</strong> and, for
        any damage or print issue, clear photos showing the problem. See our
        {" "}<a href="/refund">Refund &amp; Cancellation Policy</a> for details.
      </p>

      <h2>Business details</h2>
      <p>
        Atlaso
        <br />
        [Registered business name and address]
      </p>
    </PolicyPage>
  );
}
