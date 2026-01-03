"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft,
  Plus,
  MoreHorizontal,
  GripVertical,
  Play,
  FileText,
  HelpCircle,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Save,
  Loader2,
  Check,
  Video,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  createChapter, 
  createLesson, 
  updateCourse, 
  updateChapter, 
  deleteChapter, 
  deleteLesson 
} from "@/app/actions/studio";

interface Lesson {
  id: string;
  title: string;
  lesson_type: string;
  position: number;
  is_published: boolean;
  is_preview: boolean;
  drip_type: string;
  drip_value?: string;
  duration_minutes?: number;
  video_url?: string;
}

interface Chapter {
  id: string;
  title: string;
  description?: string;
  position: number;
  is_published: boolean;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  hero_image_url?: string;
  status: string;
  visibility: string;
  chapters: Chapter[];
}

export function CourseBuilder({ initialCourse }: { initialCourse: Course }) {
  const router = useRouter();
  const [course, setCourse] = useState(initialCourse);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  async function saveCourse(updates: Partial<Course>) {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/studio/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const { course: updated } = await res.json();
        setCourse({ ...course, ...updated });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  }

  async function addChapter() {
    try {
      const res = await fetch(`/api/studio/courses/${course.id}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Chapter ${(course.chapters?.length || 0) + 1}` }),
      });

      if (res.ok) {
        const { chapter } = await res.json();
        setCourse({
          ...course,
          chapters: [...(course.chapters || []), { ...chapter, lessons: [] }],
        });
      }
    } catch (error) {
      console.error("Failed to add chapter:", error);
    }
  }

  async function addLesson(chapterId: string, type: string = "multimedia") {
    try {
      const res = await fetch(`/api/studio/chapters/${chapterId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_type: type }),
      });

      if (res.ok) {
        const { lesson } = await res.json();
        setCourse({
          ...course,
          chapters: course.chapters.map((ch) =>
            ch.id === chapterId
              ? { ...ch, lessons: [...(ch.lessons || []), lesson] }
              : ch
          ),
        });
      }
    } catch (error) {
      console.error("Failed to add lesson:", error);
    }
  }

  async function deleteChapter(chapterId: string) {
    if (!confirm("Delete this chapter and all its lessons?")) return;

    try {
      await fetch(`/api/studio/chapters/${chapterId}`, { method: "DELETE" });
      setCourse({
        ...course,
        chapters: course.chapters.filter((ch) => ch.id !== chapterId),
      });
    } catch (error) {
      console.error("Failed to delete chapter:", error);
    }
  }

  async function deleteLesson(chapterId: string, lessonId: string) {
    if (!confirm("Delete this lesson?")) return;

    try {
      await fetch(`/api/studio/lessons/${lessonId}`, { method: "DELETE" });
      setCourse({
        ...course,
        chapters: course.chapters.map((ch) =>
          ch.id === chapterId
            ? { ...ch, lessons: ch.lessons.filter((l) => l.id !== lessonId) }
            : ch
        ),
      });
    } catch (error) {
      console.error("Failed to delete lesson:", error);
    }
  }

  async function updateChapter(chapterId: string, updates: Partial<Chapter>) {
    try {
      await fetch(`/api/studio/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      setCourse({
        ...course,
        chapters: course.chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, ...updates } : ch
        ),
      });
    } catch (error) {
      console.error("Failed to update chapter:", error);
    }
  }

  function getLessonIcon(type: string) {
    switch (type) {
      case "multimedia":
        return Video;
      case "pdf":
        return FileText;
      case "quiz":
        return HelpCircle;
      default:
        return Play;
    }
  }

  const totalLessons = course.chapters?.reduce(
    (acc, ch) => acc + (ch.lessons?.length || 0),
    0
  ) || 0;

  return (
    <main className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/studio">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Studio
              </Link>
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="font-medium truncate max-w-[200px]">{course.title}</span>
            <Badge variant={course.status === "published" ? "default" : "secondary"}>
              {course.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/courses/${course.slug}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={() => saveCourse({ status: course.status === "draft" ? "published" : "draft" })}
            >
              {course.status === "draft" ? "Publish" : "Unpublish"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto py-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            {/* Course Overview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Course Content</CardTitle>
                    <CardDescription>
                      {course.chapters?.length || 0} chapters • {totalLessons} lessons
                    </CardDescription>
                  </div>
                  <Button onClick={addChapter}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Chapter
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Chapters */}
            <div className="space-y-4">
              {course.chapters?.map((chapter, chapterIndex) => (
                <Card key={chapter.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <div className="flex-1">
                        <Input
                          value={chapter.title}
                          onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                          className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                        />
                      </div>
                      <Badge variant="outline">
                        {chapter.lessons?.length || 0} lessons
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => updateChapter(chapter.id, { is_published: !chapter.is_published })}>
                            {chapter.is_published ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteChapter(chapter.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Chapter
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Lessons */}
                    <div className="space-y-2 mb-4">
                      {chapter.lessons?.map((lesson, lessonIndex) => {
                        const LessonIcon = getLessonIcon(lesson.lesson_type);
                        return (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100" />
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                              <LessonIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/admin/studio/${course.id}/lessons/${lesson.id}`}
                                className="font-medium hover:underline truncate block"
                              >
                                {lesson.title}
                              </Link>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="capitalize">{lesson.lesson_type}</span>
                                {lesson.duration_minutes && (
                                  <>
                                    <span>•</span>
                                    <span>{lesson.duration_minutes} min</span>
                                  </>
                                )}
                                {lesson.drip_type !== "immediate" && (
                                  <>
                                    <span>•</span>
                                    <Lock className="h-3 w-3" />
                                    <span>Drip</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {lesson.is_preview && (
                                <Badge variant="outline" className="text-xs">Preview</Badge>
                              )}
                              {!lesson.is_published && (
                                <Badge variant="secondary" className="text-xs">Draft</Badge>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/studio/${course.id}/lessons/${lesson.id}`}>
                                      Edit Lesson
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => deleteLesson(chapter.id, lesson.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Lesson */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Lesson
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => addLesson(chapter.id, "multimedia")}>
                          <Video className="mr-2 h-4 w-4" />
                          Video Lesson
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addLesson(chapter.id, "pdf")}>
                          <FileText className="mr-2 h-4 w-4" />
                          PDF Lesson
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addLesson(chapter.id, "quiz")}>
                          <HelpCircle className="mr-2 h-4 w-4" />
                          Quiz
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addLesson(chapter.id, "text")}>
                          <FileText className="mr-2 h-4 w-4" />
                          Text Lesson
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}

              {(!course.chapters || course.chapters.length === 0) && (
                <Card className="text-center py-12">
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      No chapters yet. Add your first chapter to get started.
                    </p>
                    <Button onClick={addChapter}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Chapter
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={course.title}
                    onChange={(e) => setCourse({ ...course, title: e.target.value })}
                    onBlur={() => saveCourse({ title: course.title })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={course.description || ""}
                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                    onBlur={() => saveCourse({ description: course.description })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select
                    value={course.visibility}
                    onValueChange={(value) => {
                      setCourse({ ...course, visibility: value });
                      saveCourse({ visibility: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private - Only enrolled users</SelectItem>
                      <SelectItem value="unlisted">Unlisted - Anyone with link</SelectItem>
                      <SelectItem value="public">Public - Listed everywhere</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/courses/${course.slug}`}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/courses/${course.slug}`);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>
                  Configure pricing for your course
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Pricing configuration coming soon. For now, manage pricing through Stripe.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
