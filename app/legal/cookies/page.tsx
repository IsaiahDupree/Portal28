import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Cookie Policy",
  description:
    "Learn about how Portal28 Academy uses cookies and how you can manage your preferences.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-lg text-muted-foreground">
              Last updated: February 7, 2026
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>What Are Cookies?</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                Cookies are small text files that are placed on your computer or
                mobile device when you visit a website. They are widely used to
                make websites work more efficiently and provide information to the
                owners of the site.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Cookies</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                Portal28 Academy uses cookies to improve your experience on our
                website. We use different types of cookies for different purposes:
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Necessary Cookies</CardTitle>
              <CardDescription>Always Active</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                These cookies are essential for the website to function properly.
                They enable core functionality such as security, network management,
                and accessibility. You cannot opt out of these cookies.
              </p>
              <p className="font-medium mt-4">Examples:</p>
              <ul>
                <li>Authentication cookies (remembering you're logged in)</li>
                <li>Security cookies (preventing fraud)</li>
                <li>Load balancing cookies (distributing traffic)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analytics Cookies</CardTitle>
              <CardDescription>Optional</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                These cookies help us understand how visitors interact with our
                website by collecting and reporting information anonymously. This
                helps us improve our website and services.
              </p>
              <p className="font-medium mt-4">Examples:</p>
              <ul>
                <li>Page visit tracking</li>
                <li>Time spent on pages</li>
                <li>Navigation paths</li>
                <li>Error tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketing Cookies</CardTitle>
              <CardDescription>Optional</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                These cookies are used to track visitors across websites. The
                intention is to display ads that are relevant and engaging for the
                individual user.
              </p>
              <p className="font-medium mt-4">Examples:</p>
              <ul>
                <li>Facebook Pixel (Meta advertising)</li>
                <li>Conversion tracking</li>
                <li>Retargeting campaigns</li>
                <li>Attribution data</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Managing Your Cookie Preferences</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                You can change your cookie preferences at any time by clicking the
                "Manage Cookie Preferences" button below. You can also set your
                browser to refuse all or some browser cookies, or to alert you when
                websites set or access cookies.
              </p>
              <p className="mt-4">
                Please note that if you disable cookies, some parts of our website
                may not function properly.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      // Reset consent to show banner again
                      document.cookie =
                        "portal28_cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                      window.location.reload();
                    }
                  }}
                >
                  Manage Cookie Preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Third-Party Cookies</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                In addition to our own cookies, we may also use various
                third-party cookies to report usage statistics of the website
                and deliver advertisements.
              </p>
              <p className="font-medium mt-4">Third parties we work with:</p>
              <ul>
                <li>
                  <strong>Meta/Facebook:</strong> Conversion tracking and
                  advertising
                </li>
                <li>
                  <strong>Stripe:</strong> Payment processing (necessary cookies
                  only)
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cookie Retention</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                Your cookie consent preferences are stored for 12 months. After
                this period, you will be asked to confirm your preferences again.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                If you have any questions about our use of cookies, please contact
                us at:
              </p>
              <ul>
                <li>
                  Email:{" "}
                  <a href="mailto:privacy@portal28.academy">
                    privacy@portal28.academy
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex gap-4 pt-6">
            <Button asChild variant="outline">
              <Link href="/legal/privacy">Privacy Policy</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/legal/terms">Terms of Service</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
