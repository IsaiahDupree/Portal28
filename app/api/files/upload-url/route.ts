import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  lessonId: z.string().uuid(),
  filename: z.string().min(1),
  fileKind: z.enum(["pdf", "attachment"]),
  mime: z.string().optional(),
});

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // RLS check: creator must be able to read this lesson
  const { data: lesson } = await sb
    .from("lessons")
    .select("id")
    .eq("id", parsed.data.lessonId)
    .single();

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Storage path: lesson/<lessonId>/<timestamp>-<filename>
  const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `lesson/${parsed.data.lessonId}/${Date.now()}-${safeName}`;

  // Create signed upload URL
  const { data, error } = await sb.storage
    .from("course-assets")
    .createSignedUploadUrl(path);

  if (error) {
    // Bucket might not exist - return mock for dev
    return NextResponse.json({
      path,
      token: "mock-token",
      signedUrl: `/api/files/mock-upload?path=${encodeURIComponent(path)}`,
      mock: true,
    });
  }

  return NextResponse.json({
    path,
    token: data.token,
    signedUrl: data.signedUrl,
  });
}
