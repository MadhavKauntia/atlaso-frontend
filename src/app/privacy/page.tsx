import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Atlaso",
  description: "How Atlaso collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage title="Privacy Policy" updated="12 September 2026">
      <p>
        This Privacy Policy explains how Atlaso (&ldquo;Atlaso&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses,
        and protects your information when you use our website and services to create and order printed
        photobooks. By using Atlaso, you agree to the practices described here.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account information</strong> — when you sign in with Google, we receive your name, email address, and profile picture.</li>
        <li><strong>Photos and content</strong> — the images you upload and any titles, captions, or edits you make to your book.</li>
        <li><strong>Order and delivery details</strong> — recipient name, shipping address, phone number, and email you provide at checkout.</li>
        <li><strong>Payment information</strong> — payments are processed by our payment gateway, Razorpay. We do not collect or store your card, UPI, or bank details.</li>
        <li><strong>Technical data</strong> — basic device, browser, and usage information needed to operate and secure the service.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To create your photobook, including <strong>automated analysis of your uploaded photos by an AI vision model (OpenAI)</strong> to help select, order, and lay out images.</li>
        <li>To process payments through Razorpay and confirm your order.</li>
        <li>To print, fulfil, and deliver your order through our printing and courier partners.</li>
        <li>To communicate with you about your order and provide support.</li>
        <li>To operate, secure, and improve the service, and to meet legal obligations.</li>
      </ul>

      <h2>How your information is shared</h2>
      <p>We do not sell your personal information. We share it only with service providers who help us run Atlaso:</p>
      <ul>
        <li><strong>OpenAI</strong> — to analyse uploaded photos for curation and layout.</li>
        <li><strong>Razorpay</strong> — to process payments securely.</li>
        <li><strong>Amazon Web Services (AWS)</strong> — to store photos and files and host the service.</li>
        <li><strong>Google</strong> — to authenticate your sign-in.</li>
        <li><strong>Printing and courier partners</strong> — to produce and deliver your photobook.</li>
      </ul>
      <p>We may also disclose information where required by law or to protect our rights and users.</p>

      <h2>Data storage and security</h2>
      <p>
        Your photos and files are stored on AWS. We use encryption in transit and access controls to protect
        your data. No method of transmission or storage is completely secure, but we take reasonable measures
        to safeguard your information.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain your account and order information for as long as your account is active or as needed to
        provide the service, fulfil orders, and comply with legal, tax, and accounting requirements. You may
        request deletion of your data as described below.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal data by emailing us at
        {" "}<a href="mailto:support@myatlaso.com">support@myatlaso.com</a>. We will respond within a
        reasonable time.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies and local storage necessary to keep you signed in and to operate the service.
      </p>

      <h2>International processing</h2>
      <p>
        Some of our providers (such as OpenAI and AWS) may process data outside India. By using Atlaso, you
        consent to such processing in accordance with this policy.
      </p>

      <h2>Children</h2>
      <p>Atlaso is not intended for anyone under the age of 18.</p>

      <h2>Changes to this policy</h2>
      <p>We may update this Privacy Policy from time to time. Material changes will be reflected by the &ldquo;Last updated&rdquo; date above.</p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email <a href="mailto:support@myatlaso.com">support@myatlaso.com</a>.
      </p>
    </PolicyPage>
  );
}
