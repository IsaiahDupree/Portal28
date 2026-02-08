import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getLessonProgress } from "@/lib/progress/lessonProgress";
import { getAdjacentLessons } from "@/lib/db/queries";
import { sanitizeHtml } from "@/lib/security/sanitize";
import LessonCompleteButton from "@/components/progress/LessonCompleteButton";
import { LessonVideoPlayer } from "@/components/courses/LessonVideoPlayer";
import { LessonNotes } from "@/components/courses/LessonNotes";
import { LessonComments } from "@/components/courses/LessonComments";
import { LessonChapters } from "@/components/courses/LessonChapters";
import { LessonQuiz } from "@/components/courses/LessonQuiz";
import { LessonBookmarkButton } from "@/components/courses/LessonBookmarkButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  File,
  CheckCircle,
  Clock
} from "lucide-react";

interface DownloadItem {
  url: string;
  label?: string;
  type?: "pdf" | "image" | "file";
}

export default async function LessonPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id,title,video_url,mux_playback_id,content_html,downloads,module_id,duration_minutes")
    .eq("id", params.id)
    .single();

  if (!lesson) {
    return (
      <main className="container max-w-5xl mx-auto py-8 px-4">
        <Card className="text-center py-12">
          <CardContent>
            <h1 className="text-2xl font-bold mb-2">Lesson not found</h1>
            <p className="text-muted-foreground mb-4">This lesson doesn&apos;t exist or you don&apos;t have access.</p>
            <Button asChild>
              <Link href="/app">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { data: mod } = await supabase
    .from("modules")
    .select("id,course_id,title")
    .eq("id", lesson.module_id)
    .single();

  const { data: course } = await supabase
    .from("courses")
    .select("id,slug,title")
    .eq("id", mod!.course_id)
    .single();

  const downloads = (lesson.downloads ?? []) as DownloadItem[];

  // Get adjacent lessons for next/prev navigation
  const adjacentLessons = await getAdjacentLessons(course!.id, lesson.id);

  // Get lesson progress if user is logged in
  const progress = auth.user
    ? await getLessonProgress(auth.user.id, lesson.id)
    : null;

  const isCompleted = progress?.status === "completed";

  // Get user's notes
  let userNotes = "";
  if (auth.user) {
    const { data: noteData } = await supabase
      .from("lesson_notes")
      .select("content")
      .eq("user_id", auth.user.id)
      .eq("lesson_id", lesson.id)
      .single();
    userNotes = noteData?.content || "";
  }

  // Get user info for comments
  let userData = null;
  if (auth.user) {
    const { data } = await supabase
      .from("users")
      .select("email, full_name, avatar_url")
      .eq("id", auth.user.id)
      .single();
    userData = data;
  }

  // Get lesson chapters
  const { data: chapters } = await supabase
    .from("lesson_chapters")
    .select("id, timestamp_seconds, title, summary")
    .eq("lesson_id", lesson.id)
    .order("sort_order", { ascending: true });

  // Get quiz for this lesson
  const { data: quizData } = await supabase
    .from("quizzes")
    .select("id, title, description, passing_score")
    .eq("lesson_id", lesson.id)
    .single();

  let quiz = null;
  if (quizData) {
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("id, question, options, correct_index, explanation")
      .eq("quiz_id", quizData.id)
      .order("sort_order", { ascending: true });
    
    quiz = {
      ...quizData,
      questions: questions || []
    };
  }

  function getDownloadIcon(type?: string) {
    switch (type) {
      case "pdf":
        return FileText;
      case "image":
        return ImageIcon;
      default:
        return File;
    }
  }

  return (
    <main className="container max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/app/courses/${course!.slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Course
            </Link>
          </Button>
          {isCompleted && (
            <Badge className="bg-brand-green text-white">
              <CheckCircle className="mr-1 h-3 w-3" />
              Completed
            </Badge>
          )}
        </div>
        {auth.user && (
          <div className="flex items-center gap-2">
            <LessonBookmarkButton lessonId={lesson.id} />
            <LessonCompleteButton
              lessonId={lesson.id}
              courseId={course!.id}
              isCompleted={isCompleted}
            />
          </div>
        )}
      </div>

      {/* Lesson Title */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">{mod!.title}</p>
        <h1 className="text-2xl sm:text-3xl font-bold">{lesson.title}</h1>
        {(lesson as any).duration_minutes && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
            <Clock className="h-4 w-4" />
            <span>{(lesson as any).duration_minutes} min</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          {(lesson.video_url || (lesson as any).mux_playback_id) && (
            <LessonVideoPlayer
              lessonId={lesson.id}
              videoUrl={lesson.video_url || undefined}
              muxPlaybackId={(lesson as any).mux_playback_id || undefined}
              title={lesson.title}
              onComplete={() => {
                // Could auto-mark as complete
              }}
            />
          )}

          {/* Lesson Content */}
          {lesson.content_html && (
            <Card>
              <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content_html) }} />
              </CardContent>
            </Card>
          )}

          {/* Downloads/Resources */}
          {downloads.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-5 w-5" />
                  Resources & Downloads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {downloads.map((d, i) => {
                    const Icon = getDownloadIcon(d.type);
                    return (
                      <a
                        key={i}
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{d.label || "Download"}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.url}</p>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <LessonComments
            lessonId={lesson.id}
            userId={auth.user?.id}
            userName={userData?.full_name || userData?.email?.split("@")[0]}
            userAvatar={userData?.avatar_url}
          />

          {/* Next/Previous Navigation */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                {adjacentLessons.prev ? (
                  <Button variant="outline" asChild className="flex-1">
                    <Link href={`/app/lesson/${adjacentLessons.prev.id}`}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      <div className="flex flex-col items-start text-left min-w-0">
                        <span className="text-xs text-muted-foreground">Previous</span>
                        <span className="font-medium truncate w-full">
                          {adjacentLessons.prev.title}
                        </span>
                      </div>
                    </Link>
                  </Button>
                ) : (
                  <div className="flex-1" />
                )}

                {adjacentLessons.next ? (
                  <Button variant="outline" asChild className="flex-1">
                    <Link href={`/app/lesson/${adjacentLessons.next.id}`}>
                      <div className="flex flex-col items-end text-right min-w-0">
                        <span className="text-xs text-muted-foreground">Next</span>
                        <span className="font-medium truncate w-full">
                          {adjacentLessons.next.title}
                        </span>
                      </div>
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Chapters */}
          {chapters && chapters.length > 0 && (
            <LessonChapters chapters={chapters} />
          )}

          {/* Notes */}
          <LessonNotes
            lessonId={lesson.id}
            userId={auth.user?.id}
            initialNotes={userNotes}
          />

          {/* Quiz */}
          {quiz && quiz.questions.length > 0 && (
            <LessonQuiz
              quiz={quiz}
              userId={auth.user?.id}
            />
          )}
        </div>
      </div>
    </main>
  );
}
