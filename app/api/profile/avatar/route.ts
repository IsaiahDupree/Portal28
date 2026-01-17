import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { storage } from "@/lib/storage/s3";
import { z } from "zod";

// Schema for avatar upload request
const uploadRequestSchema = z.object({
  filename: z.string(),
  contentType: z.string().regex(/^image\/(jpeg|jpg|png|gif|webp)$/),
});

// POST /api/profile/avatar - Get presigned URL for avatar upload
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if S3/R2 is configured
  if (!storage.isConfigured()) {
    return NextResponse.json(
      { error: "File storage not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { filename, contentType } = uploadRequestSchema.parse(body);

    // Generate unique key for avatar
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `avatars/${user.id}/${timestamp}-${sanitizedFilename}`;

    // Get presigned upload URL (15 minute expiry)
    const uploadUrl = storage.getUploadUrl(key, contentType, 900);

    // Get the public URL that will be available after upload
    const publicUrl = storage.getPublicUrl(key);

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: error.errors,
          message: "Only image files (JPEG, PNG, GIF, WebP) are allowed"
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/avatar - Delete current avatar
export async function DELETE(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Simply clear the avatar_url in the profile
    // The actual S3 deletion can be handled by a cleanup cron job
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
