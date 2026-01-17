import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Portal28 Academy",
  description: "Privacy Policy for Portal28 Academy. Learn how we collect, use, and protect your personal information.",
  openGraph: {
    title: "Privacy Policy | Portal28 Academy",
    description: "Privacy Policy for Portal28 Academy.",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-4 px-4">
          <p className="text-sm uppercase tracking-widest text-primary font-medium">
            Legal
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last updated: January 13, 2026
          </p>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-8 px-4">
        <div className="mx-auto max-w-3xl prose prose-slate dark:prose-invert">
          <h2>1. Introduction</h2>
          <p>
            Portal Copy Co. ("we," "us," or "our") operates Portal28 Academy. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information
            when you use our Service.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>Personal Information</h3>
          <p>
            When you create an account or make a purchase, we may collect:
          </p>
          <ul>
            <li>Email address</li>
            <li>Name</li>
            <li>Billing information (processed securely through Stripe)</li>
            <li>Profile information (avatar, bio, display name)</li>
          </ul>

          <h3>Usage Information</h3>
          <p>
            We automatically collect certain information when you use our Service:
          </p>
          <ul>
            <li>Device information (browser type, operating system)</li>
            <li>IP address and approximate location</li>
            <li>Pages visited and time spent on pages</li>
            <li>Course progress and completion data</li>
            <li>Community interactions (posts, comments, messages)</li>
          </ul>

          <h3>Cookies and Tracking Technologies</h3>
          <p>
            We use cookies and similar technologies to:
          </p>
          <ul>
            <li>Maintain your session and keep you logged in</li>
            <li>Remember your preferences</li>
            <li>Analyze usage patterns and improve our Service</li>
            <li>Track marketing attribution (UTM parameters, Facebook Click ID)</li>
            <li>Deliver targeted advertising through Meta Pixel and other platforms</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve our Service</li>
            <li>Process transactions and send purchase confirmations</li>
            <li>Send course updates, announcements, and educational content</li>
            <li>Respond to your comments, questions, and support requests</li>
            <li>Analyze usage patterns and optimize the user experience</li>
            <li>Send marketing communications (you may opt out at any time)</li>
            <li>Prevent fraud and ensure security</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>4. How We Share Your Information</h2>
          <p>
            We may share your information with:
          </p>
          <ul>
            <li>
              <strong>Service Providers:</strong> We use third-party services including
              Stripe (payments), Supabase (database and authentication), Resend (email),
              Mux (video hosting), Cloudflare R2 (file storage), and Meta (advertising).
            </li>
            <li>
              <strong>Marketing Platforms:</strong> We share hashed email addresses and
              event data with Meta Conversions API for advertising attribution and
              optimization.
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may disclose your information if
              required by law or in response to valid legal requests.
            </li>
          </ul>
          <p>
            We do not sell your personal information to third parties.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your
            information, including:
          </p>
          <ul>
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Secure authentication (magic links, password hashing)</li>
            <li>Row-level security policies on our database</li>
            <li>Regular security audits and updates</li>
          </ul>
          <p>
            However, no method of transmission over the internet is 100% secure. While we
            strive to protect your information, we cannot guarantee absolute security.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as
            needed to provide you services. If you request account deletion, we will delete
            or anonymize your personal information, except where we are required to retain
            it for legal compliance.
          </p>

          <h2>7. Your Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal
            information:
          </p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal information</li>
            <li><strong>Correction:</strong> Update or correct your information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails</li>
            <li><strong>Data Portability:</strong> Request your data in a portable format</li>
          </ul>
          <p>
            To exercise these rights, contact us at privacy@portal28.academy.
          </p>

          <h2>8. Third-Party Links</h2>
          <p>
            Our Service may contain links to third-party websites. We are not responsible
            for the privacy practices of these external sites. We encourage you to read
            their privacy policies.
          </p>

          <h2>9. Children's Privacy</h2>
          <p>
            Our Service is not intended for users under the age of 18. We do not knowingly
            collect personal information from children. If you believe we have collected
            information from a child, please contact us immediately.
          </p>

          <h2>10. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than
            your own. By using our Service, you consent to the transfer of your information
            to the United States and other countries where our service providers operate.
          </p>

          <h2>11. Marketing and Advertising</h2>
          <h3>Email Marketing</h3>
          <p>
            We use Resend to send transactional and marketing emails. You may opt out of
            marketing emails by clicking the "Unsubscribe" link in any email or by updating
            your preferences in your account settings.
          </p>

          <h3>Meta Pixel and Conversions API</h3>
          <p>
            We use Meta Pixel and Conversions API to track user behavior and optimize our
            advertising campaigns on Facebook and Instagram. This includes tracking page
            views, course views, and purchases. Email addresses are hashed before being
            sent to Meta. You can opt out of targeted advertising through your Facebook
            ad preferences.
          </p>

          <h2>12. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any
            material changes by posting the new Privacy Policy on this page and updating
            the "Last Updated" date. Your continued use of the Service after such changes
            constitutes acceptance of the updated Privacy Policy.
          </p>

          <h2>13. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices,
            please contact us at:
          </p>
          <p>
            Email: <a href="mailto:privacy@portal28.academy">privacy@portal28.academy</a>
          </p>
        </div>
      </section>
    </div>
  );
}
