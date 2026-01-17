/**
 * R2 Download URL Generation
 *
 * Generates presigned download URLs for files stored in Cloudflare R2/S3
 *
 * GET /api/r2/download-url?key=<file-key>&expiresIn=<seconds>
 * Returns: { downloadUrl: string, expiresIn: number }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { storage } from "@/lib/storage/s3";

const querySchema = z.object({
  key: z.string().min(1),
  expiresIn: z.string().optional(),
});

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    key: url.searchParams.get("key"),
    expiresIn: url.searchParams.get("expiresIn"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { key, expiresIn: expiresInStr } = parsed.data;
  const expiresIn = expiresInStr ? parseInt(expiresInStr, 10) : 3600;

  // Validate expiry time (1 minute to 7 days)
  if (expiresIn < 60 || expiresIn > 604800) {
    return NextResponse.json(
      { error: "expiresIn must be between 60 and 604800 seconds" },
      { status: 400 }
    );
  }

  try {
    // Extract lesson ID from key (format: lessons/<lessonId>/...)
    const lessonIdMatch = key.match(/^lessons\/([a-f0-9-]+)\//);

    if (lessonIdMatch) {
      const lessonId = lessonIdMatch[1];

      // Verify user has access to this lesson
      const { data: lesson } = await sb
        .from("lessons")
        .select("id")
        .eq("id", lessonId)
        .single();

      if (!lesson) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Generate presigned download URL
    const downloadUrl = storage.getDownloadUrl(key, expiresIn);

    return NextResponse.json({
      downloadUrl,
      key,
      expiresIn,
    });
  } catch (error) {
    console.error("R2 download URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
