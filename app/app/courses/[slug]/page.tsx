import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getCourseBySlug, getCourseOutline } from "@/lib/db/queries";
import { userHasCourseAccess } from "@/lib/entitlements/hasAccess";
import { getCourseProgress } from "@/lib/progress/lessonProgress";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { computeUnlockedAt, formatTimeUntilUnlock, isLessonUnlocked } from "@/lib/drip";

export default async function CourseOutlinePage({ params }: { params: { slug: string } }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user!;

  const course = await getCourseBySlug(params.slug);
  if (!course) {
    return (
      <main>
        <h1>Not found</h1>
      </main>
    );
  }

  const ok = await userHasCourseAccess(user.id, course.id);
  if (!ok) {
    return (
      <main>
        <h1>Access required</h1>
        <p>You don't have access to this course.</p>
        <Link href={`/courses/${course.slug}`}>Go to sales page →</Link>
      </main>
    );
  }

  const outline = await getCourseOutline(course.id);

  // Get enrollment info (for drip calculations)
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("purchased_at")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .single();

  const enrolledAt = enrollment?.purchased_at ? new Date(enrollment.purchased_at) : null;

  // Get lesson progress for this course
  const { data: lessonProgressData } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status")
    .eq("user_id", user.id)
    .eq("course_id", course.id);

  const completedLessons = new Set(
    lessonProgressData?.filter(p => p.status === "completed").map(p => p.lesson_id) || []
  );

  // Get course progress summary
  const courseProgress = await getCourseProgress(user.id, course.id);
  const progressPercent = courseProgress?.completion_percent || 0;
  const completedCount = courseProgress?.lessons_completed || 0;
  const totalCount = courseProgress?.total_lessons || outline.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <main className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <Link href="/app" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        {course.description && (
          <p className="text-muted-foreground mt-2">{course.description}</p>
        )}
      </div>

      {/* Progress Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Course Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {totalCount} lessons completed
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Course Outline */}
      <div className="space-y-6">
        {outline.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="text-xl">{m.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {m.lessons.map((l) => {
                  const isCompleted = completedLessons.has(l.id);

                  // Check if lesson is locked by drip schedule
                  const isLocked = enrolledAt && l.drip_type && l.drip_type !== "immediate"
                    ? !isLessonUnlocked(enrolledAt, l.drip_type, l.drip_value)
                    : false;

                  const unlockedAt = isLocked && enrolledAt
                    ? computeUnlockedAt(enrolledAt, l.drip_type!, l.drip_value)
                    : null;

                  return (
                    <li key={l.id}>
                      <Link
                        href={`/app/lesson/${l.id}`}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isLocked ? "cursor-not-allowed opacity-60" : "hover:bg-accent"
                        }`}
                        onClick={(e) => {
                          if (isLocked) {
                            e.preventDefault();
                          }
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : isLocked ? (
                          <Lock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className={isCompleted ? "text-muted-foreground" : ""}>
                            {l.title}
                          </span>
                          {isLocked && unlockedAt && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              {formatTimeUntilUnlock(unlockedAt)}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
