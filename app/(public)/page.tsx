import { Metadata } from "next";
import { AttributionCapture } from "../attrib-capture";
import { HomePageClient } from "./HomePageClient";

// Enable static generation with ISR
export const revalidate = 3600; // Revalidate every hour

export const metadata: Metadata = {
  title: "Portal28 Academy | Where Power Gets Built",
  description: "Portal 28 is a private clubhouse for founders, creators, and CEOs who know they're meant to operate at a higher level. Master brand strategy, storytelling, and AI-powered content creation.",
  openGraph: {
    title: "Portal28 Academy | Where Power Gets Built",
    description: "Portal 28 is a private clubhouse for founders, creators, and CEOs who know they're meant to operate at a higher level.",
    type: "website",
  },
  keywords: ["brand strategy", "storytelling", "content creation", "AI", "founders", "CEOs", "creators"],
};

export default function HomePage() {
  return (
    <div className="space-y-12">
      <AttributionCapture />
      <HomePageClient />
    </div>
  );
}
