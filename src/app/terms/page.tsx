import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms & Conditions — Atlaso",
  description: "The terms that govern your use of Atlaso.",
};

export default function TermsPage() {
  return (
    <PolicyPage title="Terms & Conditions" updated="12 September 2026">
      <p>
        These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of Atlaso
        (&ldquo;Atlaso&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), including creating and ordering printed
        photobooks. By using the service, you agree to these Terms.
      </p>

      <h2>1. Eligibility</h2>
      <p>You must be at least 18 years old and able to enter into a binding contract to use Atlaso.</p>

      <h2>2. Your account</h2>
      <p>
        You sign in using Google. You are responsible for activity under your account and for keeping your
        sign-in secure.
      </p>

      <h2>3. The service</h2>
      <p>
        Atlaso lets you upload photos, which are curated and arranged (with the help of AI) into a photobook
        that you can review and edit before ordering a printed copy delivered to you.
      </p>

      <h2>4. Your content and licence</h2>
      <p>
        You retain ownership of the photos and content you upload. You grant Atlaso a limited, non-exclusive
        licence to store, process (including automated analysis by AI), reproduce, print, and deliver your
        content solely to provide the service and fulfil your order.
      </p>
      <p>
        You confirm that you own or have the rights to the photos you upload, and that they do not infringe
        anyone&rsquo;s rights or contain unlawful, offensive, or infringing material. You are solely
        responsible for the content of your book.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to misuse the service, upload unlawful content, or attempt to disrupt or reverse-engineer the platform.</p>

      <h2>6. Orders and pricing</h2>
      <p>
        Each photobook is priced at <strong>₹1,999 per copy</strong>, inclusive of shipping and applicable
        taxes. Prices may change, but the price shown at checkout applies to your order. Payments are
        processed securely through Razorpay. Your order is confirmed once payment is successfully verified.
        We may refuse or cancel an order in cases of suspected fraud, errors, or content that violates these
        Terms.
      </p>

      <h2>7. Made-to-order product</h2>
      <p>
        Each photobook is personalised and produced specifically for you. Please review your book carefully
        before placing your order.
      </p>

      <h2>8. Cancellations and refunds</h2>
      <p>
        Cancellations and refunds are governed by our <Link href="/refund">Refund &amp; Cancellation Policy</Link>,
        and delivery by our <Link href="/shipping">Shipping &amp; Delivery Policy</Link>.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        The Atlaso platform, design, and software are owned by us and protected by applicable laws. These
        Terms do not grant you any rights to our brand or technology.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        The service is provided on an &ldquo;as is&rdquo; basis. AI-assisted curation may not always match your
        expectations, and slight variations in colour and finish are inherent to printing. Please use the
        preview and editing tools to confirm your book before ordering.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Atlaso&rsquo;s total liability for any claim relating to an
        order is limited to the amount you paid for that order. We are not liable for indirect or
        consequential losses.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of India, and any disputes are subject to the exclusive
        jurisdiction of the competent courts in India.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>We may update these Terms from time to time. Continued use of Atlaso after changes constitutes acceptance of the updated Terms.</p>

      <h2>14. Contact</h2>
      <p>Questions? Email <a href="mailto:support@myatlaso.com">support@myatlaso.com</a>.</p>
    </PolicyPage>
  );
}
