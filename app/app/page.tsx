import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { linkEntitlementsToUser } from "@/lib/entitlements/linkEntitlements";
import { getAllCourseProgress, getCourseProgress } from "@/lib/progress/lessonProgress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, Users, MessageSquare, Trophy, ArrowRight } from "lucide-react";

export default async function AppHome() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();

  const user = data.user!;
  const email = user.email ?? "";

  await supabase.from("users").upsert({ id: user.id, email }, { onConflict: "email" });

  if (email) await linkEntitlementsToUser(email, user.id);

  const { data: ents } = await supabase
    .from("entitlements")
    .select("course_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  const courseIds = (ents ?? []).map((e) => e.course_id);

  const { data: courses } = await supabase
    .from("courses")
    .select("id,title,slug,description")
    .in("id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]);

  // Get progress for all courses
  const allProgress = await getAllCourseProgress(user.id);

  // Calculate overall progress
  let totalLessons = 0;
  let totalCompleted = 0;
  allProgress.forEach(p => {
    totalLessons += p.total_lessons;
    totalCompleted += p.lessons_completed;
  });
  const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  // Create progress map for courses
  const progressMap = new Map(allProgress.map(p => [p.course_id, p.completion_percent]));

  return (
    <div className="space-y-6">
      {/* Welcome Header - Using reusable component */}
      <PageHeader
        title="Welcome back!"
        description="Continue your learning journey with Portal28."
      />

      {/* Quick Stats - Using reusable StatCard components */}
      <StatCardGrid columns={4}>
        <StatCard
          title="My Courses"
          value={courses?.length || 0}
          description="Enrolled courses"
          icon={BookOpen}
        />
        <StatCard
          title="Community"
          value="Active"
          description="Member status"
          icon={Users}
        />
        <StatCard
          title="Forums"
          value={0}
          description="New discussions"
          icon={MessageSquare}
        />
        <StatCard
          title="Progress"
          value={`${overallProgress}%`}
          description="Overall completion"
          icon={Trophy}
        />
      </StatCardGrid>

      {/* My Courses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Courses</CardTitle>
            <CardDescription>Continue where you left off</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/courses">Browse More</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!courses || courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses yet"
              description="Start your learning journey by enrolling in a course."
              action={
                <Button asChild>
                  <Link href="/courses">Browse Courses</Link>
                </Button>
              }
              className="min-h-[200px] border-0"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => {
                const courseProgress = progressMap.get(c.id) || 0;
                return (
                  <Link key={c.id} href={`/app/courses/${c.slug}`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{c.title}</CardTitle>
                          <Badge variant="success">Enrolled</Badge>
                        </div>
                        {c.description && (
                          <CardDescription className="line-clamp-2">
                            {c.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{courseProgress}% complete</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Progress value={courseProgress} className="h-2" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary transition-colors">
          <Link href="/app/community">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Community
              </CardTitle>
              <CardDescription>Connect with other members</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary transition-colors">
          <Link href="/app/community/forums">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Forums
              </CardTitle>
              <CardDescription>Join discussions and get help</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary transition-colors">
          <Link href="/app/community/resources">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Resources
              </CardTitle>
              <CardDescription>Templates, guides, and more</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}
