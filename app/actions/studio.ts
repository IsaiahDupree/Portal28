"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

async function uniqueCourseSlug(sb: ReturnType<typeof supabaseServer>, title: string) {
  const base = slugify(title) || "course";
  let slug = base;

  for (let i = 0; i < 8; i++) {
    const { data } = await sb
      .from("courses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;
    slug = `${base}-${Math.floor(Math.random() * 9999)}`;
  }
  return `${base}-${Date.now()}`;
}

// Fractional ordering helper
export function between(a: number, b: number) {
  return (a + b) / 2;
}

// ============= COURSES =============

export async function createCourse(input: { title: string; workspaceId?: string }) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  const schema = z.object({
    title: z.string().min(2).max(120),
    workspaceId: z.string().uuid().optional(),
  });
  const parsed = schema.parse(input);

  const slug = await uniqueCourseSlug(sb, parsed.title);

  const { data: course, error } = await sb
    .from("courses")
    .insert({
      workspace_id: parsed.workspaceId || null,
      title: parsed.title,
      slug,
      created_by: auth.user.id,
      status: "draft",
      visibility: "private",
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(error.message);

  // Auto-create Chapter 1 + Lesson 1
  const { data: chapter, error: chErr } = await sb
    .from("chapters")
    .insert({ course_id: course.id, title: "Chapter 1", position: 1000 })
    .select("id")
    .single();

  if (chErr) throw new Error(chErr.message);

  await sb.from("lessons").insert({
    chapter_id: chapter.id,
    module_id: course.id, // backward compat
    title: "Lesson 1",
    lesson_type: "multimedia",
    position: 1000,
    drip_type: "immediate",
    content_doc: {},
  });

  revalidatePath("/admin/studio");
  return course;
}

export async function updateCourse(courseId: string, patch: Partial<{
  title: string;
  description: string;
  hero_image_url: string;
  visibility: string;
  status: string;
}>) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  const { error } = await sb.from("courses").update(patch).eq("id", courseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/studio/${courseId}`);
  return { ok: true };
}

export async function deleteCourse(courseId: string) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  const { error } = await sb.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/studio");
  return { ok: true };
}

// ============= CHAPTERS =============

export async function createChapter(input: { courseId: string; title?: string }) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  // Get last position
  const { data: last } = await sb
    .from("chapters")
    .select("position")
    .eq("course_id", input.courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = (last?.position ?? 0) + 1000;

  const { data: chapter, error } = await sb
    .from("chapters")
    .insert({
      course_id: input.courseId,
      title: input.title ?? "New Chapter",
      position: nextPos,
    })
    .select("id, title, position")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/studio/${input.courseId}`);
  return chapter;
}

export async function updateChapter(chapterId: string, patch: Partial<{
  title: string;
  description: string;
  position: number;
  is_published: boolean;
}>) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  const { data, error } = await sb
    .from("chapters")
    .update(patch)
    .eq("id", chapterId)
    .select("course_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/studio/${data.course_id}`);
  return { ok: true };
}

export async function deleteChapter(chapterId: string) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  const { data } = await sb.from("chapters").select("course_id").eq("id", chapterId).single();
  const { error } = await sb.from("chapters").delete().eq("id", chapterId);
  if (error) throw new Error(error.message);

  if (data) revalidatePath(`/admin/studio/${data.course_id}`);
  return { ok: true };
}

// ============= LESSONS =============

export async function createLesson(input: {
  chapterId: string;
  lessonType?: string;
  title?: string;
}) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  // Get chapter to find course_id
  const { data: chapter } = await sb
    .from("chapters")
    .select("course_id")
    .eq("id", input.chapterId)
    .single();

  if (!chapter) throw new Error("Chapter not found");

  // Get last position
  const { data: last } = await sb
    .from("lessons")
    .select("position")
    .eq("chapter_id", input.chapterId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = (last?.position ?? 0) + 1000;

  const { data: lesson, error } = await sb
    .from("lessons")
    .insert({
      chapter_id: input.chapterId,
      module_id: chapter.course_id, // backward compat
      lesson_type: input.lessonType ?? "multimedia",
      title: input.title ?? "New Lesson",
      position: nextPos,
      drip_type: "immediate",
      content_doc: {},
    })
    .select("id, title")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/studio/${chapter.course_id}`);
  return lesson;
}

export async function updateLesson(lessonId: string, patch: Partial<{
  title: string;
  lesson_type: string;
  video_url: string;
  content_html: string;
  content_doc: any;
  downloads: any[];
  drip_type: string;
  drip_value: any;
  is_published: boolean;
  is_preview: boolean;
  duration_minutes: number;
  position: number;
}>) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  const { data, error } = await sb
    .from("lessons")
    .update(patch)
    .eq("id", lessonId)
    .select("updated_at, chapter_id")
    .single();

  if (error) throw new Error(error.message);

  return { updatedAt: data.updated_at };
}

export async function updateLessonContent(lessonId: string, contentDoc: any) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  const { data, error } = await sb
    .from("lessons")
    .update({ content_doc: contentDoc })
    .eq("id", lessonId)
    .select("updated_at")
    .single();

  if (error) throw new Error(error.message);
  return { updatedAt: data.updated_at };
}

export async function deleteLesson(lessonId: string) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  const { error } = await sb.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(error.message);

  return { ok: true };
}

// Reorder: set lesson position between neighbors (fractional)
export async function moveLesson(lessonId: string, newChapterId: string | null, prevPos: number | null, nextPos: number | null) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  let newPos = 1000;
  if (prevPos === null && nextPos !== null) newPos = nextPos / 2;
  else if (prevPos !== null && nextPos === null) newPos = prevPos + 1000;
  else if (prevPos !== null && nextPos !== null) newPos = between(prevPos, nextPos);

  const updates: any = { position: newPos };
  if (newChapterId) updates.chapter_id = newChapterId;

  const { error } = await sb.from("lessons").update(updates).eq("id", lessonId);
  if (error) throw new Error(error.message);

  return { ok: true, position: newPos };
}

export async function moveChapter(chapterId: string, prevPos: number | null, nextPos: number | null) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Unauthorized");

  let newPos = 1000;
  if (prevPos === null && nextPos !== null) newPos = nextPos / 2;
  else if (prevPos !== null && nextPos === null) newPos = prevPos + 1000;
  else if (prevPos !== null && nextPos !== null) newPos = between(prevPos, nextPos);

  const { error } = await sb.from("chapters").update({ position: newPos }).eq("id", chapterId);
  if (error) throw new Error(error.message);

  return { ok: true, position: newPos };
}
