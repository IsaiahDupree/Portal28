import Link from "next/link";
import { Metadata } from "next";
import { getCourseBySlug, getCourseOutline } from "@/lib/db/queries";
import { BuyButton } from "./BuyButton";
import { ViewContentTracker } from "./ViewContentTracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, PlayCircle, Download, Clock } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const course = await getCourseBySlug(params.slug);

  if (!course || course.status !== "published") {
    return {
      title: "Course Not Found | Portal28 Academy",
    };
  }

  return {
    title: `${course.title} | Portal28 Academy`,
    description: course.description || `Learn ${course.title} with Portal28 Academy`,
    openGraph: {
      title: `${course.title} | Portal28 Academy`,
      description: course.description || `Learn ${course.title} with Portal28 Academy`,
      type: "website",
      images: course.hero_image ? [course.hero_image] : [],
    },
  };
}

export default async function CourseSalesPage({ params }: { params: { slug: string } }) {
  const course = await getCourseBySlug(params.slug);

  if (!course || course.status !== "published") {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Course not found</h1>
        <p className="text-muted-foreground mb-6">
          The course you're looking for doesn't exist or is no longer available.
        </p>
        <Button asChild>
          <Link href="/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Link>
        </Button>
      </div>
    );
  }

  const outline = await getCourseOutline(course.id);
  const totalLessons = outline.reduce((sum, module) => sum + module.lessons.length, 0);

  return (
    <div className="space-y-12">
      <ViewContentTracker courseId={course.id} price={course.price_cents} />
      {/* Breadcrumb */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Courses
          </Link>
        </Button>
      </div>

      {/* Hero Section */}
      <section className="space-y-6">
        <div>
          <Badge variant="outline" className="mb-4">Course</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-xl text-muted-foreground max-w-3xl">
              {course.description}
            </p>
          )}
        </div>

        {/* Course Stats */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            <span>{totalLessons} lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Self-paced</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Lifetime access</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <BuyButton courseId={course.id} />
          <Button variant="outline" asChild>
            <Link href="/login">Already purchased? Sign In</Link>
          </Button>
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="rounded-2xl bg-muted/50 p-8 sm:p-10">
        <h2 className="text-2xl font-bold mb-6">What You'll Learn</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <span>Build a brand narrative that actually sounds like you</span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <span>Turn content into a narrative people follow</span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <span>Master storytelling that survives algorithm changes</span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <span>Create cohesion instead of content chaos</span>
          </div>
        </div>
      </section>

      {/* Course Curriculum */}
      {outline.length > 0 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Course Curriculum</h2>
            <p className="text-muted-foreground">
              {outline.length} modules • {totalLessons} lessons
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {outline.map((module, idx) => (
              <AccordionItem
                key={module.id}
                value={module.id}
                className="border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <div className="flex items-start gap-4 pr-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{module.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {module.lessons.length} lesson{module.lessons.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 pt-4 pl-12">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id} className="flex items-center gap-3 text-muted-foreground">
                        <PlayCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{lesson.title}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* Features */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Lifetime Access</CardTitle>
            <CardDescription>
              Learn at your own pace with unlimited access to all course materials
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <PlayCircle className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Video Lessons</CardTitle>
            <CardDescription>
              High-quality video content designed for practical application
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Download className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Downloadable Resources</CardTitle>
            <CardDescription>
              Templates, frameworks, and worksheets to implement what you learn
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* Final CTA */}
      <section>
        <Card className="bg-brand-purple-dark text-white border-0">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to step inside?
            </h2>
            <p className="text-white/80 mb-8 max-w-xl text-lg">
              Get instant access to {totalLessons} lessons and start building your brand story today.
            </p>
            <BuyButton courseId={course.id} variant="secondary" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
