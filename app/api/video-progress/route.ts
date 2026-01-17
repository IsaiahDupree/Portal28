import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/video-progress
 * Update video playback progress for a user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, playbackId, positionSeconds, durationSeconds } = body;

    if (!lessonId || !playbackId || positionSeconds === undefined || !durationSeconds) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call the database function to update progress
    const { data, error } = await supabase.rpc("update_video_progress", {
      p_user_id: user.id,
      p_lesson_id: lessonId,
      p_playback_id: playbackId,
      p_position_seconds: positionSeconds,
      p_duration_seconds: durationSeconds,
    });

    if (error) {
      console.error("Failed to update video progress:", error);
      return NextResponse.json(
        { error: "Failed to update progress" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error updating video progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video-progress?lessonId=xxx
 * Get video playback progress for a user and lesson
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) {
      return NextResponse.json(
        { error: "Missing lessonId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("video_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found, which is ok
      console.error("Failed to get video progress:", error);
      return NextResponse.json(
        { error: "Failed to get progress" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || null });
  } catch (error) {
    console.error("Error getting video progress:", error);
    return NextResponse.json(
      { error: "Failed to get progress" },
      { status: 500 }
    );
  }
}
