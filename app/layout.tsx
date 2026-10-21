import "./globals.css";
import { MetaPixel } from "@/lib/meta/MetaPixel";
import { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  title: {
    default: "Portal28 Academy | Where Power Gets Built",
    template: "%s | Portal28 Academy",
  },
  description:
    "Portal 28 is a private clubhouse for founders, creators, and CEOs. Master brand strategy, storytelling, and AI-powered content creation.",
  keywords: [
    "brand strategy",
    "storytelling",
    "content creation",
    "AI",
    "founders",
    "CEOs",
    "creators",
    "business strategy",
    "marketing",
  ],
  authors: [{ name: "Sarah Ashley", url: `${SITE_URL}/about` }],
  creator: "Portal Copy Co.",
  publisher: "Portal28 Academy",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: "Portal28 Academy | Where Power Gets Built",
    description:
      "Portal 28 is a private clubhouse for founders, creators, and CEOs. Master brand strategy, storytelling, and AI-powered content creation.",
    siteName: "Portal28 Academy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal28 Academy | Where Power Gets Built",
    description:
      "Portal 28 is a private clubhouse for founders, creators, and CEOs.",
    creator: "@portal28academy",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: "google-site-verification-code",
    // yandex: "yandex-verification-code",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
