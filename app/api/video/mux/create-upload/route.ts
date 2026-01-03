import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  lessonId: z.string().uuid(),
});

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: auth, error: authErr } = await sb.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Ensure lesson exists & user has access
  const { data: lesson, error: lessonErr } = await sb
    .from("lessons")
    .select("id")
    .eq("id", parsed.data.lessonId)
    .single();

  if (lessonErr || !lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Check if Mux is configured
  const muxTokenId = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!muxTokenId || !muxTokenSecret) {
    // Fallback: return a mock upload URL for development
    const mockUploadId = `mock-${Date.now()}`;
    
    await sb.from("lesson_media").upsert({
      lesson_id: parsed.data.lessonId,
      provider: "mock",
      source: "upload",
      upload_id: mockUploadId,
      status: "uploading",
    }, { onConflict: "lesson_id" });

    return NextResponse.json({
      uploadId: mockUploadId,
      uploadUrl: `/api/uploads/direct?lessonId=${parsed.data.lessonId}`,
      provider: "mock",
      message: "Mux not configured - using mock upload",
    });
  }

  // For now, Mux integration requires installing @mux/mux-node
  // Return instructions to set it up
  return NextResponse.json({
    error: "Mux not fully configured. Install @mux/mux-node to enable video uploads.",
    instructions: "npm install @mux/mux-node --legacy-peer-deps",
    provider: "mux",
  }, { status: 501 });
}
