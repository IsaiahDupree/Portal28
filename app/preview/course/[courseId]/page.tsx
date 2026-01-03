import { redirect, notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Lock, FileText, Clock, Eye } from "lucide-react";

// Use service role to bypass RLS for preview
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface Props {
  params: { courseId: string };
  searchParams: { token?: string };
}

export default async function CoursePreviewPage({ params, searchParams }: Props) {
  const { courseId } = params;
  const { token } = searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Preview Link Required
            </CardTitle>
            <CardDescription>
              This preview requires a valid token. Please use the link provided by the course creator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validate preview token
  let previewToken = null;
  try {
    const { data, error } = await supabaseAdmin
      .from("course_preview_tokens")
      .select("*")
      .eq("course_id", courseId)
      .eq("token", token)
      .single();
    
    if (!error) {
      previewToken = data;
    }
  } catch (e) {
    // Table might not exist or other DB error - treat as invalid token
  }

  if (!previewToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Preview Link</CardTitle>
            <CardDescription>
              This preview link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if token is expired
  if (previewToken.expires_at && new Date(previewToken.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Preview Link Expired</CardTitle>
            <CardDescription>
              This preview link has expired. Please request a new one from the course creator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch course with chapters and lessons (including unpublished)
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select(`
      *,
      chapters(
        *,
        lessons(*)
      )
    `)
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    notFound();
  }

  // Sort chapters and lessons
  const sortedChapters = (course.chapters || [])
    .sort((a: any, b: any) => a.position - b.position)
    .map((chapter: any) => ({
      ...chapter,
      lessons: (chapter.lessons || []).sort((a: any, b: any) => a.position - b.position),
    }));

  const totalLessons = sortedChapters.reduce(
    (acc: number, ch: any) => acc + (ch.lessons?.length || 0),
    0
  );

  const totalDuration = sortedChapters.reduce(
    (acc: number, ch: any) =>
      acc + ch.lessons?.reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0),
    0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Banner */}
      <div className="bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-medium">
        <Eye className="inline h-4 w-4 mr-2" />
        You are viewing a preview of this course. Some features may be limited.
      </div>

      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Course Header */}
        <div className="mb-8">
          <Badge variant="outline" className="mb-4">
            {course.status === "published" ? "Published" : "Draft"}
          </Badge>
          <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
          {course.description && (
            <p className="text-muted-foreground text-lg">{course.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {totalLessons} lessons
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {totalDuration} min
              </span>
            )}
          </div>
        </div>

        {/* Course Curriculum */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Course Curriculum</h2>
          
          {sortedChapters.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No chapters have been added to this course yet.
              </CardContent>
            </Card>
          ) : (
            sortedChapters.map((chapter: any, chapterIndex: number) => (
              <Card key={chapter.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    Chapter {chapterIndex + 1}: {chapter.title}
                  </CardTitle>
                  {chapter.description && (
                    <CardDescription>{chapter.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {chapter.lessons?.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No lessons in this chapter yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {chapter.lessons?.map((lesson: any, lessonIndex: number) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                              {lessonIndex + 1}
                            </div>
                            <div>
                              <p className="font-medium">{lesson.title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  {lesson.lesson_type || "multimedia"}
                                </Badge>
                                {lesson.duration_minutes && (
                                  <span>{lesson.duration_minutes} min</span>
                                )}
                                {!lesson.is_published && (
                                  <Badge variant="outline" className="text-xs">
                                    Draft
                                  </Badge>
                                )}
                                {lesson.is_preview && (
                                  <Badge variant="default" className="text-xs">
                                    Free Preview
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Link
                            href={`/preview/lesson/${lesson.id}?token=${token}`}
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            <Play className="h-3 w-3" />
                            Preview
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
