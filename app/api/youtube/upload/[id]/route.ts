import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  updateVideoMetadata,
  setVideoThumbnail,
  getVideoDetails,
  deleteVideo,
  refreshAccessToken,
} from "@/lib/youtube/client";
import { z } from "zod";

const UpdateMetadataSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  privacyStatus: z.enum(["private", "public", "unlisted"]).optional(),
  thumbnailUrl: z.string().url().optional(),
});

// GET /api/youtube/upload/[id]
// Get upload details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadId = params.id;

  // Fetch upload record
  const { data: upload, error: uploadError } = await supabase
    .from("youtube_uploads")
    .select("*")
    .eq("id", uploadId)
    .eq("user_id", authData.user.id)
    .single();

  if (uploadError || !upload) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  // If video is published, fetch latest stats from YouTube
  if (upload.youtube_video_id && upload.status === "published") {
    try {
      const { data: tokenData } = await supabase
        .from("youtube_tokens")
        .select("*")
        .eq("user_id", authData.user.id)
        .single();

      if (tokenData) {
        let accessToken = tokenData.access_token;

        // Check if token needs refresh
        const expiresAt = new Date(tokenData.expires_at);
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiresAt <= fiveMinutesFromNow) {
          const refreshed = await refreshAccessToken(tokenData.refresh_token);
          accessToken = refreshed.access_token;

          await supabase
            .from("youtube_tokens")
            .update({
              access_token: refreshed.access_token,
              expires_at: new Date(refreshed.expiry_date).toISOString(),
            })
            .eq("user_id", authData.user.id);
        }

        // Fetch latest video details
        const details = await getVideoDetails(accessToken, upload.youtube_video_id);

        // Update local record with latest stats
        await supabase
          .from("youtube_uploads")
          .update({
            view_count: details.viewCount,
            like_count: details.likeCount,
            comment_count: details.commentCount,
          })
          .eq("id", uploadId);

        return NextResponse.json({
          upload: {
            ...upload,
            view_count: details.viewCount,
            like_count: details.likeCount,
            comment_count: details.commentCount,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching YouTube details:", error);
      // Continue with local data
    }
  }

  return NextResponse.json({ upload });
}

// PATCH /api/youtube/upload/[id]
// Update video metadata
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadId = params.id;

  try {
    const body = await request.json();
    const validated = UpdateMetadataSchema.parse(body);

    // Fetch upload record
    const { data: upload, error: uploadError } = await supabase
      .from("youtube_uploads")
      .select("*")
      .eq("id", uploadId)
      .eq("user_id", authData.user.id)
      .single();

    if (uploadError || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    if (!upload.youtube_video_id) {
      return NextResponse.json(
        { error: "Video not yet uploaded to YouTube" },
        { status: 400 }
      );
    }

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

    let accessToken = tokenData.access_token;

    // Check if token needs refresh
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      accessToken = refreshed.access_token;

      await supabase
        .from("youtube_tokens")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(refreshed.expiry_date).toISOString(),
        })
        .eq("user_id", authData.user.id);
    }

    // Update metadata on YouTube
    await updateVideoMetadata(accessToken, upload.youtube_video_id, validated);

    // Update local record
    const updateData: any = {};
    if (validated.title) updateData.title = validated.title;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.tags) updateData.tags = validated.tags;
    if (validated.categoryId) updateData.category_id = validated.categoryId;
    if (validated.privacyStatus)
      updateData.privacy_status = validated.privacyStatus;
    if (validated.thumbnailUrl)
      updateData.thumbnail_url = validated.thumbnailUrl;

    const { data: updated, error: updateError } = await supabase
      .from("youtube_uploads")
      .update(updateData)
      .eq("id", uploadId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating upload record:", updateError);
      return NextResponse.json(
        { error: "Failed to update record" },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      user_id: authData.user.id,
      action: "updated_youtube_video",
      details: {
        upload_id: uploadId,
        youtube_video_id: upload.youtube_video_id,
        updates: validated,
      },
    });

    return NextResponse.json({ upload: updated });
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

// DELETE /api/youtube/upload/[id]
// Delete video from YouTube and remove record
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadId = params.id;

  // Fetch upload record
  const { data: upload, error: uploadError } = await supabase
    .from("youtube_uploads")
    .select("*")
    .eq("id", uploadId)
    .eq("user_id", authData.user.id)
    .single();

  if (uploadError || !upload) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  // If video exists on YouTube, delete it
  if (upload.youtube_video_id) {
    try {
      const { data: tokenData } = await supabase
        .from("youtube_tokens")
        .select("*")
        .eq("user_id", authData.user.id)
        .single();

      if (tokenData) {
        let accessToken = tokenData.access_token;

        // Check if token needs refresh
        const expiresAt = new Date(tokenData.expires_at);
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiresAt <= fiveMinutesFromNow) {
          const refreshed = await refreshAccessToken(tokenData.refresh_token);
          accessToken = refreshed.access_token;

          await supabase
            .from("youtube_tokens")
            .update({
              access_token: refreshed.access_token,
              expires_at: new Date(refreshed.expiry_date).toISOString(),
            })
            .eq("user_id", authData.user.id);
        }

        // Delete from YouTube
        await deleteVideo(accessToken, upload.youtube_video_id);
      }
    } catch (error) {
      console.error("Error deleting from YouTube:", error);
      // Continue with local deletion even if YouTube deletion fails
    }
  }

  // Delete local record
  const { error: deleteError } = await supabase
    .from("youtube_uploads")
    .delete()
    .eq("id", uploadId);

  if (deleteError) {
    console.error("Error deleting upload record:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete record" },
      { status: 500 }
    );
  }

  // Log admin action
  await supabase.from("admin_actions").insert({
    user_id: authData.user.id,
    action: "deleted_youtube_video",
    details: {
      upload_id: uploadId,
      youtube_video_id: upload.youtube_video_id,
    },
  });

  return NextResponse.json({ success: true });
}
