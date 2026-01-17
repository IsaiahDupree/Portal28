import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, BookOpen, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "About Portal 28 | Portal28 Academy",
  description: "Learn about Portal 28 Academy, founded by Sarah Ashley. Where strategy meets intuition and storytelling becomes leverage.",
  openGraph: {
    title: "About Portal 28 | Portal28 Academy",
    description: "Learn about Portal 28 Academy, founded by Sarah Ashley. Where strategy meets intuition and storytelling becomes leverage.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-6 px-4">
          <p className="text-sm uppercase tracking-widest text-primary font-medium">
            About Portal 28
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Where{" "}
            <span className="text-primary">strategy meets intuition.</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Portal 28 isn't a course hub. It's a threshold. A private clubhouse
            for founders, creators, and CEOs who know they're meant to operate
            at a higher level.
          </p>
        </div>
      </section>

      {/* About the Founder */}
      <section className="py-12 sm:py-16 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-sm uppercase tracking-widest text-primary font-medium mb-2">
                The Founder
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Hi, I'm Sarah Ashley.
              </h2>
            </div>

            <div className="text-lg text-muted-foreground space-y-4">
              <p>
                I build brands that actually mean something.
              </p>
              <p>
                I'm the founder of Portal Copy Co., where I help founders, creatives,
                and operators turn messy ideas into clear, powerful messaging—and turn
                that messaging into momentum.
              </p>
              <p>
                I've spent years at the intersection of brand strategy, storytelling,
                content systems, and now, AI-powered creation.
              </p>
              <p className="font-medium text-foreground text-xl">
                Portal 28 is the evolution of that work.
              </p>
              <p>
                This platform exists for people who don't just want better copy—they
                want command over their narrative. They want to build brands that
                survive algorithm changes, market shifts, and the noise of the AI age.
              </p>
              <p>
                Inside Portal 28, you'll find courses, frameworks, and an ongoing
                membership designed to help you:
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="rounded-2xl bg-muted/50 py-12 sm:py-16 px-6 sm:px-8">
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          <Card className="border-0 bg-background/60">
            <CardContent className="pt-6">
              <Sparkles className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-bold text-xl mb-3">Build Your Brand Story</h3>
              <p className="text-muted-foreground">
                Develop a brand narrative that actually sounds like you—and
                survives the algorithm. Not templates. Not formulas. Strategy
                that fits your business.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-background/60">
            <CardContent className="pt-6">
              <BookOpen className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-bold text-xl mb-3">Master Social Storytelling</h3>
              <p className="text-muted-foreground">
                Turn content into a narrative people follow. Learn how to create
                cohesion instead of chaos, and build a content system that scales
                with you.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-background/60">
            <CardContent className="pt-6">
              <Target className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-bold text-xl mb-3">Join the CEO Power Portal</h3>
              <p className="text-muted-foreground">
                The inner room. Ongoing strategy, community, and resources for
                people building long-term power—not just short-term wins.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Mission */}
      <section className="py-12 sm:py-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
            Our Mission
          </h2>
          <div className="text-lg text-muted-foreground space-y-4 text-left">
            <p>
              We believe that great brands aren't built on hacks or trends.
              They're built on clarity, strategy, and a deep understanding of
              who you are and what you're building.
            </p>
            <p>
              In the age of AI, anyone can generate content. But not everyone
              can build a brand that means something. That's what we teach here.
            </p>
            <p className="font-medium text-foreground text-xl text-center pt-4">
              Portal 28 is open. You don't stumble into this room. You unlock it.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
