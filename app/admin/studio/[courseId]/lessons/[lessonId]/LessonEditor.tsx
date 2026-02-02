"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Check, Video, FileText, Plus, Trash2, Eye, Lock } from "lucide-react";
import { MuxVideoUpload } from "@/components/admin/MuxVideoUpload";

interface Lesson {
  id: string;
  title: string;
  lesson_type: string;
  video_url?: string;
  content_html?: string;
  downloads?: any[];
  drip_type: string;
  drip_value?: string;
  is_published: boolean;
  is_preview: boolean;
  duration_minutes?: number;
}

interface Course { id: string; title: string; slug: string; }

export function LessonEditor({ lesson: initialLesson, course }: { lesson: Lesson; course: Course }) {
  const [lesson, setLesson] = useState(initialLesson);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!hasChanges) return;
    const timeout = setTimeout(() => saveLesson(), 1500);
    return () => clearTimeout(timeout);
  }, [lesson, hasChanges]);

  const updateLesson = useCallback((updates: Partial<Lesson>) => {
    setLesson((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  async function saveLesson() {
    setSaving(true);
    try {
      const res = await fetch(`/api/studio/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lesson),
      });
      if (res.ok) { setSaved(true); setHasChanges(false); setTimeout(() => setSaved(false), 2000); }
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/studio/${course.id}`}><ArrowLeft className="mr-2 h-4 w-4" />{course.title}</Link>
          </Button>
          <div className="flex items-center gap-3">
            {saving && <span className="text-sm text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving...</span>}
            {saved && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-3 w-3" />Saved</span>}
            <Button size="sm" onClick={saveLesson} disabled={saving || !hasChanges}><Save className="mr-2 h-4 w-4" />Save</Button>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
        <Input value={lesson.title} onChange={(e) => updateLesson({ title: e.target.value })} placeholder="Lesson title" className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0" />

        {lesson.lesson_type === "multimedia" && (
          <>
            <MuxVideoUpload
              lessonId={lesson.id}
              currentVideoUrl={lesson.video_url}
              onUploadComplete={(assetId, playbackId) => {
                updateLesson({ video_url: `https://stream.mux.com/${playbackId}` });
              }}
            />
            <Card>
              <CardHeader>
                <CardTitle>Or Use External Video URL</CardTitle>
                <CardDescription>Enter a URL for YouTube, Vimeo, or other video platforms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={lesson.video_url || ""}
                  onChange={(e) => updateLesson({ video_url: e.target.value })}
                  placeholder="Video URL (YouTube, Vimeo, etc.)"
                />
                <div className="flex items-center gap-2">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    className="w-20"
                    value={lesson.duration_minutes || ""}
                    onChange={(e) => updateLesson({ duration_minutes: parseInt(e.target.value) || undefined })}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Content</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={lesson.content_html || ""} onChange={(e) => updateLesson({ content_html: e.target.value })} placeholder="Lesson content (supports HTML)" className="min-h-[200px]" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={lesson.is_published} onCheckedChange={(c: boolean) => updateLesson({ is_published: c })} /></div>
            <div className="flex items-center justify-between"><Label>Free Preview</Label><Switch checked={lesson.is_preview} onCheckedChange={(c: boolean) => updateLesson({ is_preview: c })} /></div>
            <div className="space-y-2">
              <Label>Drip Schedule</Label>
              <Select value={lesson.drip_type} onValueChange={(v) => updateLesson({ drip_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Unlocks immediately</SelectItem>
                  <SelectItem value="days_after_enroll">Days after enrollment</SelectItem>
                  <SelectItem value="date">Specific date</SelectItem>
                </SelectContent>
              </Select>
              {lesson.drip_type === "days_after_enroll" && <Input type="number" placeholder="Days" value={lesson.drip_value || ""} onChange={(e) => updateLesson({ drip_value: e.target.value })} />}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
