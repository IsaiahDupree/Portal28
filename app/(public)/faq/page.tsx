import { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ | Portal28 Academy",
  description: "Frequently asked questions about Portal 28 Academy, courses, memberships, and access.",
  openGraph: {
    title: "FAQ | Portal28 Academy",
    description: "Frequently asked questions about Portal 28 Academy, courses, memberships, and access.",
    type: "website",
  },
};

export default function FAQPage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-6 px-4">
          <p className="text-sm uppercase tracking-widest text-primary font-medium">
            Frequently Asked Questions
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Everything you need to know about{" "}
            <span className="text-primary">Portal 28.</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Have a question that's not answered here? Reach out to us directly.
          </p>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-12 px-4">
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                What is Portal 28?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Portal 28 is a private learning platform for founders, creators, and
                CEOs who want to master brand strategy, storytelling, and AI-powered
                content creation. It's not just courses—it's a membership community
                for people building long-term power.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                Who is this for?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Portal 28 is designed for founders, creators, and operators who are
                done playing small. If you're building a business, a brand, or a
                movement—and you want your messaging to match your ambition—this is
                for you.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                What's included in a course?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Each course includes video lessons, frameworks, templates, and
                actionable exercises. You get lifetime access to all course materials,
                plus any future updates. Some courses also include community access
                and ongoing support.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                What's the difference between a course and the membership?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Courses are standalone programs focused on specific skills (brand
                story, social storytelling, etc.). The CEO Power Portal membership
                gives you access to all courses, plus ongoing strategy sessions,
                exclusive community access, and monthly live calls.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                How do I access the courses after purchase?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Once you purchase a course, you'll receive instant access. Simply
                log in to your account and navigate to your dashboard. All your
                courses will be available there, ready to start immediately.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                Do you offer refunds?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We offer a 14-day money-back guarantee on all courses. If you're
                not satisfied with your purchase, contact us within 14 days for a
                full refund. Membership subscriptions can be canceled at any time.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                Can I cancel my membership?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes. Your membership is billed monthly or annually (depending on
                your plan), and you can cancel at any time. You'll retain access
                until the end of your current billing period.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                How long do I have access to courses?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                All course purchases include lifetime access. Learn at your own
                pace, revisit lessons anytime, and benefit from future updates at
                no additional cost.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                Is there a community component?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! CEO Power Portal members get access to our private community,
                including forums, live chat, exclusive resources, and monthly group
                strategy calls with Sarah.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-10" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                How is this different from other courses?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Most courses give you templates and tactics. Portal 28 teaches you
                how to think strategically about your brand, your story, and your
                content—so you can make decisions that scale. Plus, you're joining
                a community of high-level operators who are building real businesses.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-11" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                What if I have technical issues?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We're here to help! If you experience any technical issues with
                accessing courses, videos, or downloads, contact our support team
                and we'll get you sorted quickly.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-12" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold">
                Can I purchase courses as a gift?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolutely! Contact us directly and we'll set up a gift purchase
                for you. Perfect for team members, business partners, or fellow
                founders you want to support.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 px-4">
        <div className="mx-auto max-w-2xl text-center rounded-lg border bg-muted/50 p-8">
          <h2 className="text-2xl font-bold mb-4">
            Still have questions?
          </h2>
          <p className="text-muted-foreground mb-6">
            We're here to help. Reach out and we'll get back to you quickly.
          </p>
          <p className="text-sm text-muted-foreground">
            Email us at:{" "}
            <a
              href="mailto:support@portal28.academy"
              className="text-primary hover:underline font-medium"
            >
              support@portal28.academy
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
