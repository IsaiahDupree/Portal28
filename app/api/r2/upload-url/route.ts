/**
 * R2 Upload URL Generation
 *
 * Generates presigned upload URLs for Cloudflare R2/S3 storage
 *
 * POST /api/r2/upload-url
 * Body: { lessonId: string, filename: string, contentType: string, expiresIn?: number }
 * Returns: { uploadUrl: string, key: string, expiresIn: number }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { storage, generateFileKey } from "@/lib/storage/s3";

const bodySchema = z.object({
  lessonId: z.string().uuid(),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  expiresIn: z.number().int().min(60).max(86400).optional(), // 1 min to 24 hours
});

export async function POST(req: Request) {
  // Check if R2 is configured
  if (!storage.isConfigured()) {
    return NextResponse.json(
      { error: "R2 storage not configured" },
      { status: 503 }
    );
  }

  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { lessonId, filename, contentType, expiresIn = 3600 } = parsed.data;

  // Verify user has access to this lesson (RLS check)
  const { data: lesson } = await sb
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .single();

  if (!lesson) {
    return NextResponse.json(
      { error: "Lesson not found or access denied" },
      { status: 404 }
    );
  }

  try {
    // Generate unique file key
    const key = generateFileKey(lessonId, filename, "lessons");

    // Generate presigned upload URL
    const uploadUrl = storage.getUploadUrl(key, contentType, expiresIn);

    return NextResponse.json({
      uploadUrl,
      key,
      expiresIn,
      bucket: process.env.S3_BUCKET_NAME,
    });
  } catch (error) {
    console.error("R2 upload URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
