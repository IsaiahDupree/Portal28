import Link from "next/link";
import { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { getPublicCourseCatalog } from "@/lib/db/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";

// Force dynamic rendering to avoid build-time fetch issues
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const catalog = await getPublicCourseCatalog();
  const indexCatalog = catalog.available && catalog.courses.length > 0;

  return {
    alternates: { canonical: `${SITE_URL}/courses` },
    title: "Courses | Portal28 Academy",
    description: "Browse our curriculum of brand strategy, storytelling, and content creation courses. These aren't courses—they're leverage points.",
    robots: { index: indexCatalog, follow: true },
    openGraph: {
      title: "Courses | Portal28 Academy",
      description: "Browse our curriculum of brand strategy, storytelling, and content creation courses.",
      type: "website",
    },
  };
}

export default async function CoursesPage() {
  const catalog = await getPublicCourseCatalog();
  const { courses } = catalog;
  const catalogUnavailable = !catalog.available;

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <p className="text-sm uppercase tracking-widest text-primary font-medium mb-2">
          The Curriculum
        </p>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Command your narrative.
        </h1>
        <p className="text-lg text-muted-foreground">
          These aren't courses. They're leverage points. Each one gives you 
          a specific tool to own your story, your content, and your brand.
        </p>
      </div>

      {catalogUnavailable ? (
        <Card className="text-center py-16 border-dashed">
          <CardContent>
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-semibold text-xl mb-2">Course listings are temporarily unavailable.</h2>
            <p className="text-muted-foreground">
              Please visit the <Link className="underline" href="/about">about page</Link> for more information.
            </p>
          </CardContent>
        </Card>
      ) : courses.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <CardContent>
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-xl mb-2">New rooms opening soon.</h3>
            <p className="text-muted-foreground">
              The curriculum is being built. Check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.slug}`}>
              <Card className="h-full hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Course
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl group-hover:text-primary transition-colors">
                    {c.title}
                  </CardTitle>
                  {c.description && (
                    <CardDescription className="line-clamp-3 text-base">
                      {c.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-primary group-hover:underline">
                      Step inside
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center pt-8">
        <p className="text-muted-foreground">
          You don't leave with ideas. You leave with a usable, scalable brand story.
        </p>
      </div>
    </div>
  );
}
