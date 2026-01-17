import { supabaseServer } from "@/lib/supabase/server";
import { computeUnlockedAt, formatTimeUntilUnlock } from "@/lib/drip";
import { sanitizeHtml } from "@/lib/security/sanitize";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";

export default async function LessonLearnPage({
  params,
}: {
  params: { slug: string; lessonId: string };
}) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();

  if (!auth?.user) {
    redirect(`/login?next=/courses/${params.slug}/lessons/${params.lessonId}`);
  }

  // Get course
  const { data: course } = await sb
    .from("courses")
    .select("id, title, status, visibility")
    .eq("slug", params.slug)
    .single();

  if (!course) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <Button asChild>
          <Link href="/app/courses">Browse Courses</Link>
        </Button>
      </div>
    );
  }

  // Check enrollment
  const { data: enrollment } = await sb
    .from("enrollments")
    .select("purchased_at, expires_at, status")
    .eq("course_id", course.id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  // Also check entitlements for backward compat
  const { data: entitlement } = await sb
    .from("entitlements")
    .select("created_at")
    .eq("course_id", course.id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const hasAccess = enrollment?.status === "active" || entitlement;
  const enrolledAt = enrollment?.purchased_at || entitlement?.created_at;

  if (!hasAccess) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4 text-center">
        <Card>
          <CardContent className="py-12">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Access Required</h1>
            <p className="text-muted-foreground mb-6">
              You don't have access to this course yet.
            </p>
            <Button asChild>
              <Link href={`/courses/${params.slug}`}>View Course</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get lesson
  const { data: lesson } = await sb
    .from("lessons")
    .select("id, title, drip_type, drip_value, content_doc, content_html, video_url, lesson_type")
    .eq("id", params.lessonId)
    .single();

  if (!lesson) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Lesson not found</h1>
        <Button asChild>
          <Link href={`/app/courses/${course.id}`}>Back to Course</Link>
        </Button>
      </div>
    );
  }

  // Check drip rules
  const unlockedAt = computeUnlockedAt(
    new Date(enrolledAt),
    lesson.drip_type || "immediate",
    lesson.drip_value
  );

  if (Date.now() < unlockedAt.getTime()) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4 text-center">
        <Card>
          <CardContent className="py-12">
            <Lock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h1 className="text-2xl font-bold mb-2">Lesson Locked</h1>
            <p className="text-muted-foreground mb-2">
              {formatTimeUntilUnlock(unlockedAt)}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Available on {unlockedAt.toLocaleDateString()} at {unlockedAt.toLocaleTimeString()}
            </p>
            <Button variant="outline" asChild>
              <Link href={`/app/courses/${course.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Course
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render lesson content
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href={`/app/courses/${course.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {course.title}
        </Link>
      </Button>

      {/* Lesson title */}
      <h1 className="text-3xl font-bold mb-6">{lesson.title}</h1>

      {/* Video */}
      {lesson.video_url && (
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
          <iframe
            src={lesson.video_url}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Content */}
      {lesson.content_html && (
        <div
          className="prose prose-lg max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content_html) }}
        />
      )}

      {lesson.content_doc?.content && (
        <div className="prose prose-lg max-w-none mb-8">
          {lesson.content_doc.content}
        </div>
      )}

      {/* Mark complete button */}
      <div className="flex justify-end pt-6 border-t">
        <Button>
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark as Complete
        </Button>
      </div>
    </div>
  );
}
