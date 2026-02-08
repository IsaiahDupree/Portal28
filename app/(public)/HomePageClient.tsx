"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Target, Mic2, ArrowRight } from "lucide-react";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { trackCTAClick } from "@/components/tracking/CTATracker";

export function HomePageClient() {
  return (
    <>
      {/* Hero Section */}
      <section className="text-center py-12 sm:py-20">
        <div className="mx-auto max-w-4xl space-y-6 px-4">
          <p className="text-sm uppercase tracking-widest text-primary font-medium">
            Portal 28
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Step inside the room where{" "}
            <span className="text-primary">power gets built.</span>
          </h1>
          <div className="mx-auto max-w-2xl space-y-4 text-lg text-muted-foreground">
            <p>
              Portal 28 isn't a course hub. It's a threshold.
            </p>
            <p>
              A private clubhouse for founders, creators, and CEOs who know they're meant
              to operate at a higher level—and are done playing small with their story,
              their voice, and their brand.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              asChild
              onClick={() => trackCTAClick("hero_enter_the_room", { location: "hero" })}
            >
              <Link href="/courses">
                Enter the Room
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              onClick={() => trackCTAClick("hero_sign_in", { location: "hero" })}
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            You don't stumble into this room. You unlock it.
          </p>
        </div>
      </section>

      {/* What is Portal 28 */}
      <section className="rounded-2xl bg-muted/50 py-12 sm:py-16 px-6 sm:px-8">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            This is where strategy meets intuition.
          </h2>
          <p className="text-lg text-muted-foreground">
            Where storytelling becomes leverage.<br />
            Where the AI age stops being scary—and starts working for you.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          <Card className="border-0 bg-background/60">
            <CardHeader>
              <Sparkles className="h-10 w-10 text-primary mb-3" />
              <CardTitle className="text-xl">Brand Story</CardTitle>
              <CardDescription className="text-base">
                Build a brand narrative that actually sounds like you—and survives the algorithm.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-0 bg-background/60">
            <CardHeader>
              <Mic2 className="h-10 w-10 text-primary mb-3" />
              <CardTitle className="text-xl">Social Storytelling</CardTitle>
              <CardDescription className="text-base">
                Turn content into a narrative people follow. Cohesion instead of chaos.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-0 bg-background/60">
            <CardHeader>
              <Target className="h-10 w-10 text-primary mb-3" />
              <CardTitle className="text-xl">CEO Power Portal</CardTitle>
              <CardDescription className="text-base">
                The inner room. Ongoing strategy for people building long-term power.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* About Sarah */}
      <section className="py-12 sm:py-16 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="text-center space-y-6">
            <p className="text-sm uppercase tracking-widest text-primary font-medium">
              About the Founder
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Hi, I'm Sarah. I build brands that actually mean something.
            </h2>
            <div className="text-lg text-muted-foreground space-y-4 text-left">
              <p>
                I'm the founder of Portal Copy Co., where I help founders, creatives,
                and operators turn messy ideas into clear, powerful messaging—and turn
                that messaging into momentum.
              </p>
              <p>
                I've spent years at the intersection of brand strategy, storytelling,
                content systems, and now, AI-powered creation.
              </p>
              <p className="font-medium text-foreground">
                Portal 28 is the evolution of that work.
              </p>
              <p>
                This platform exists for people who don't just want better copy—they
                want command over their narrative.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-8 sm:py-12">
        <Card>
          <CardContent className="py-12 sm:py-16 px-6">
            <div className="mx-auto max-w-xl text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold">
                Stay in the Loop
              </h2>
              <p className="text-muted-foreground">
                Join our newsletter for insights on brand strategy, AI-powered content creation, and exclusive updates from Portal 28.
              </p>
              <NewsletterSignup
                className="mt-6"
                source="homepage_newsletter"
                placeholder="Enter your email"
                buttonText="Subscribe"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="py-8 sm:py-12">
        <Card className="bg-brand-purple-dark text-white border-0">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Portal 28 is open.
            </h2>
            <p className="text-white/80 mb-8 max-w-xl text-lg">
              If you're here, you already felt the pull.
            </p>
            <Button
              size="lg"
              variant="secondary"
              asChild
              onClick={() => trackCTAClick("footer_step_inside", { location: "footer_cta" })}
            >
              <Link href="/courses">
                Step Inside
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
