"use client";

import { useEffect, useState } from "react";
import { useAutosaveLesson } from "@/components/studio/useAutosaveLesson";
import { useLessonMediaRealtime } from "@/components/studio/useLessonMediaRealtime";
import VideoLessonEditor from "@/components/studio/editors/VideoLessonEditor";
import PdfLessonEditor from "@/components/studio/editors/PdfLessonEditor";
import QuizLessonEditor from "@/components/studio/editors/QuizLessonEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Loader2 } from "lucide-react";

interface LessonEditorProps {
  lesson: {
    id: string;
    title: string;
    lesson_type: string;
    content_doc?: any;
    content_html?: string;
    video_url?: string;
    drip_type?: string;
    drip_value?: any;
  };
  chapterTitle?: string;
}

export default function LessonEditor({ lesson, chapterTitle }: LessonEditorProps) {
  const { save, saving, savedAt, error } = useAutosaveLesson(lesson.id);
  const { media, loading: mediaLoading } = useLessonMediaRealtime(lesson.id);

  const [doc, setDoc] = useState<any>(lesson.content_doc ?? {});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDoc(lesson.content_doc ?? {});
  }, [lesson.id, lesson.content_doc]);

  function onDocChange(next: any) {
    setDoc(next);
    save(next);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          {chapterTitle && (
            <div className="text-sm text-muted-foreground mb-1">{chapterTitle}</div>
          )}
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Save status pill */}
          <Badge variant="outline" className="gap-1.5">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : savedAt ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                Saved
              </>
            ) : (
              "Saved"
            )}
          </Badge>

          {/* Copy link button */}
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Type-specific editor */}
      {lesson.lesson_type === "multimedia" && (
        <VideoLessonEditor
          lessonId={lesson.id}
          media={media}
          doc={doc}
          onDocChange={onDocChange}
          videoUrl={lesson.video_url}
        />
      )}

      {lesson.lesson_type === "pdf" && (
        <PdfLessonEditor
          lessonId={lesson.id}
          doc={doc}
          onDocChange={onDocChange}
        />
      )}

      {lesson.lesson_type === "quiz" && (
        <QuizLessonEditor
          lessonId={lesson.id}
          doc={doc}
          onDocChange={onDocChange}
        />
      )}

      {lesson.lesson_type === "text" && (
        <div className="border rounded-lg p-6">
          <div className="text-sm text-muted-foreground mb-2">Content</div>
          <textarea
            className="w-full min-h-[300px] border rounded-lg p-4 resize-y"
            placeholder="Add your lesson content here..."
            value={doc?.text ?? lesson.content_html ?? ""}
            onChange={(e) => onDocChange({ ...doc, text: e.target.value })}
          />
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          Failed to save: {error}
        </div>
      )}
    </div>
  );
}
