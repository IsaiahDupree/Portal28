import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Portal28 Academy",
  description: "Terms of Service for Portal28 Academy. Read our terms and conditions for using the platform.",
  openGraph: {
    title: "Terms of Service | Portal28 Academy",
    description: "Terms of Service for Portal28 Academy.",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-4 px-4">
          <p className="text-sm uppercase tracking-widest text-primary font-medium">
            Legal
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last updated: January 13, 2026
          </p>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-8 px-4">
        <div className="mx-auto max-w-3xl prose prose-slate dark:prose-invert">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Portal28 Academy ("the Service"), you accept and agree
            to be bound by the terms and provision of this agreement. If you do not agree
            to these Terms of Service, you should not use this Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Portal28 Academy provides online educational courses, memberships, and community
            access focused on brand strategy, storytelling, and content creation. The Service
            is accessible via web browser at portal28.academy.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            To access certain features of the Service, you must create an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and update your information to keep it accurate and current</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>

          <h2>4. Payment and Billing</h2>
          <p>
            <strong>Course Purchases:</strong> One-time course purchases grant you lifetime
            access to the course materials, including any future updates.
          </p>
          <p>
            <strong>Memberships:</strong> Membership subscriptions are billed on a recurring
            basis (monthly or annually) until canceled. You may cancel at any time, and you
            will retain access until the end of your current billing period.
          </p>
          <p>
            <strong>Refunds:</strong> We offer a 14-day money-back guarantee on all course
            purchases. Membership subscriptions are non-refundable, but you may cancel at
            any time to prevent future charges.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            All course content, including but not limited to videos, text, graphics, images,
            frameworks, templates, and software, is owned by Portal Copy Co. or its licensors
            and is protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p>
            You are granted a limited, non-exclusive, non-transferable license to access and
            use the course materials for your personal, non-commercial use only. You may not:
          </p>
          <ul>
            <li>Reproduce, distribute, or share course materials with others</li>
            <li>Modify, adapt, or create derivative works from our content</li>
            <li>Use our content for commercial purposes without written permission</li>
            <li>Remove copyright or proprietary notices from any materials</li>
          </ul>

          <h2>6. User Conduct</h2>
          <p>
            You agree not to use the Service to:
          </p>
          <ul>
            <li>Violate any local, state, national, or international law</li>
            <li>Infringe on the intellectual property rights of others</li>
            <li>Harass, abuse, threaten, or intimidate other users</li>
            <li>Post or transmit spam, advertising, or promotional materials</li>
            <li>Upload viruses or malicious code</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Impersonate any person or entity</li>
          </ul>

          <h2>7. Community Guidelines</h2>
          <p>
            Our community spaces (forums, chat, etc.) are for constructive discussion and
            mutual support. We reserve the right to remove content or ban users who violate
            our community standards, including posting offensive, abusive, or inappropriate
            content.
          </p>

          <h2>8. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the Service at our
            sole discretion, without notice, for conduct that we believe violates these Terms
            of Service or is harmful to other users, us, or third parties, or for any other
            reason.
          </p>

          <h2>9. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
            SECURE, OR ERROR-FREE.
          </p>
          <p>
            The information and courses provided are for educational purposes only and do not
            constitute professional advice. Your use of the information is at your own risk.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, PORTAL COPY CO. SHALL NOT BE LIABLE FOR
            ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS
            OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF
            DATA, USE, OR OTHER INTANGIBLE LOSSES.
          </p>

          <h2>11. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Portal Copy Co., its officers,
            directors, employees, and agents from any claims, liabilities, damages, losses,
            and expenses arising out of your use of the Service or violation of these Terms.
          </p>

          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms of Service at any time. We will notify
            users of any material changes by posting the new Terms on this page and updating
            the "Last Updated" date. Your continued use of the Service after such changes
            constitutes acceptance of the new Terms.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            United States, without regard to its conflict of law provisions.
          </p>

          <h2>14. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p>
            Email: <a href="mailto:legal@portal28.academy">legal@portal28.academy</a>
          </p>
        </div>
      </section>
    </div>
  );
}
