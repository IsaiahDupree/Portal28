import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { uploadVideo, refreshAccessToken } from "@/lib/youtube/client";
import { z } from "zod";

const UploadVideoSchema = z.object({
  videoUrl: z.string().url(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  privacyStatus: z.enum(["private", "public", "unlisted"]).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// POST /api/youtube/upload
// Upload video to YouTube
export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = UploadVideoSchema.parse(body);

    // Get user's YouTube tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from("youtube_tokens")
      .select("*")
      .eq("user_id", authData.user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "YouTube account not connected" },
        { status: 403 }
      );
    }

    // Check if token needs refresh
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    let accessToken = tokenData.access_token;

    if (expiresAt <= fiveMinutesFromNow) {
      // Refresh token
      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      accessToken = refreshed.access_token;

      // Update tokens in database
      await supabase
        .from("youtube_tokens")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(refreshed.expiry_date).toISOString(),
        })
        .eq("user_id", authData.user.id);
    }

    // Create upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from("youtube_uploads")
      .insert({
        user_id: authData.user.id,
        video_url: validated.videoUrl,
        title: validated.title,
        description: validated.description,
        tags: validated.tags || [],
        category_id: validated.categoryId || "22",
        privacy_status: validated.privacyStatus || "private",
        status: "pending",
        scheduled_at: validated.scheduledAt || null,
      })
      .select()
      .single();

    if (uploadError) {
      console.error("Error creating upload record:", uploadError);
      return NextResponse.json(
        { error: "Failed to create upload record" },
        { status: 500 }
      );
    }

    // Note: In production, this would trigger a background job
    // For now, we'll simulate the upload process
    try {
      // Update status to uploading
      await supabase
        .from("youtube_uploads")
        .update({ status: "uploading" })
        .eq("id", uploadRecord.id);

      // Upload video to YouTube
      // Note: This is a simplified version. In production, you'd need to:
      // 1. Download the video from videoUrl
      // 2. Upload to YouTube using resumable upload
      // 3. Track progress and update database
      const result = await uploadVideo(accessToken, {
        title: validated.title,
        description: validated.description,
        tags: validated.tags,
        categoryId: validated.categoryId,
        privacyStatus: validated.privacyStatus,
      });

      // Update upload record with YouTube video ID
      await supabase
        .from("youtube_uploads")
        .update({
          youtube_video_id: result.videoId,
          status: "processing",
          published_at: result.publishedAt,
        })
        .eq("id", uploadRecord.id);

      // Log admin action
      await supabase.from("admin_actions").insert({
        user_id: authData.user.id,
        action: "uploaded_youtube_video",
        details: {
          upload_id: uploadRecord.id,
          youtube_video_id: result.videoId,
          title: validated.title,
        },
      });

      return NextResponse.json({
        upload: {
          id: uploadRecord.id,
          youtube_video_id: result.videoId,
          status: "processing",
        },
      });
    } catch (uploadErr) {
      console.error("Error uploading to YouTube:", uploadErr);

      // Update status to failed
      await supabase
        .from("youtube_uploads")
        .update({
          status: "failed",
          error_message:
            uploadErr instanceof Error ? uploadErr.message : "Upload failed",
        })
        .eq("id", uploadRecord.id);

      return NextResponse.json(
        { error: "Failed to upload video to YouTube" },
        { status: 500 }
      );
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/youtube/upload?status=pending
// List YouTube uploads
export async function GET(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("youtube_uploads")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching uploads:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ uploads: data ?? [] });
}
