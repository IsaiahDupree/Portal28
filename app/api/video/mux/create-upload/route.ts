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

  // Use Mux SDK for video uploads
  try {
    const Mux = (await import("@mux/mux-node")).default;
    
    const mux = new Mux({
      tokenId: muxTokenId,
      tokenSecret: muxTokenSecret,
    });

    // Create direct upload
    const upload = await mux.video.uploads.create({
      cors_origin: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2828",
      new_asset_settings: {
        playback_policy: ["public"],
        encoding_tier: "baseline",
      },
    });

    // Upsert media row (status uploading)
    await sb.from("lesson_media").upsert({
      lesson_id: parsed.data.lessonId,
      provider: "mux",
      source: "upload",
      upload_id: upload.id,
      status: "uploading",
    }, { onConflict: "lesson_id" });

    return NextResponse.json({
      uploadId: upload.id,
      uploadUrl: upload.url,
      provider: "mux",
    });
  } catch (error) {
    console.error("Mux upload error:", error);
    return NextResponse.json(
      { error: "Failed to create video upload" },
      { status: 500 }
    );
  }
}
