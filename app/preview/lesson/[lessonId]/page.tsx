import { redirect, notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Play, FileText, Download } from "lucide-react";

// Use service role to bypass RLS for preview
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface Props {
  params: { lessonId: string };
  searchParams: { token?: string };
}

export default async function LessonPreviewPage({ params, searchParams }: Props) {
  const { lessonId } = params;
  const { token } = searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Preview Link Required</CardTitle>
            <CardDescription>
              This preview requires a valid token.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Fetch lesson with media
  const { data: lesson, error: lessonError } = await supabaseAdmin
    .from("lessons")
    .select(`
      *,
      chapter:chapters(
        id,
        title,
        course_id,
        course:courses(id, title, slug)
      ),
      media:lesson_media(*),
      files:lesson_files(*)
    `)
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) {
    notFound();
  }

  const course = (lesson.chapter as any)?.course;
  const courseId = course?.id;

  // Validate preview token against the course
  const { data: previewToken, error: tokenError } = await supabaseAdmin
    .from("course_preview_tokens")
    .select("*")
    .eq("course_id", courseId)
    .eq("token", token)
    .single();

  if (tokenError || !previewToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Preview Link</CardTitle>
            <CardDescription>
              This preview link is invalid or doesn't match this lesson's course.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check expiration
  if (previewToken.expires_at && new Date(previewToken.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Preview Link Expired</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const media = lesson.media?.[0];
  const files = lesson.files || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Banner */}
      <div className="bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-medium">
        <Eye className="inline h-4 w-4 mr-2" />
        Preview Mode - Some features are limited
      </div>

      <div className="container max-w-4xl mx-auto py-6 px-4">
        {/* Back to course */}
        <Link
          href={`/preview/course/${courseId}?token=${token}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {course?.title || "Course"}
        </Link>

        {/* Lesson Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{lesson.lesson_type || "multimedia"}</Badge>
            {!lesson.is_published && <Badge variant="outline">Draft</Badge>}
            {lesson.is_preview && <Badge>Free Preview</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <p className="text-muted-foreground">
            {(lesson.chapter as any)?.title}
          </p>
        </div>

        {/* Video Player */}
        {media?.playback_id && (
          <Card className="mb-6 overflow-hidden">
            <div className="aspect-video bg-black">
              <iframe
                src={`https://stream.mux.com/${media.playback_id}`}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </Card>
        )}

        {/* External Video URL */}
        {!media?.playback_id && lesson.video_url && (
          <Card className="mb-6 overflow-hidden">
            <div className="aspect-video">
              <iframe
                src={lesson.video_url}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </Card>
        )}

        {/* No Video */}
        {!media?.playback_id && !lesson.video_url && lesson.lesson_type === "multimedia" && (
          <Card className="mb-6">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Play className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No video has been added to this lesson yet.</p>
            </CardContent>
          </Card>
        )}

        {/* Lesson Content */}
        {lesson.content_html && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lesson Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: lesson.content_html }}
              />
            </CardContent>
          </Card>
        )}

        {/* Downloads */}
        {files.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {files.map((file: any) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                  >
                    <span className="text-sm">{file.filename}</span>
                    <Badge variant="outline">{file.file_kind}</Badge>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4">
                Downloads are disabled in preview mode.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quiz Preview */}
        {lesson.lesson_type === "quiz" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quiz</CardTitle>
              <CardDescription>
                Quiz functionality is disabled in preview mode.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
