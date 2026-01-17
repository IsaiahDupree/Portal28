import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createPlaybackToken } from "@/lib/mux";

/**
 * GET /api/lessons/[id]/mux-token
 * Get a signed Mux playback token for a lesson
 * Requires user to have access to the lesson's course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get lesson with mux_playback_id
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, mux_playback_id, module_id")
      .eq("id", params.id)
      .single();

    if (!lesson || !lesson.mux_playback_id) {
      return NextResponse.json(
        { error: "Lesson not found or has no Mux video" },
        { status: 404 }
      );
    }

    // Get course ID from module
    const { data: mod } = await supabase
      .from("modules")
      .select("course_id")
      .eq("id", lesson.module_id)
      .single();

    if (!mod) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Check if user has access to the course
    const { data: entitlement } = await supabase
      .from("entitlements")
      .select("id")
      .eq("course_id", mod.course_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!entitlement) {
      return NextResponse.json(
        { error: "No access to this course" },
        { status: 403 }
      );
    }

    // Generate signed playback token (valid for 1 hour)
    const token = createPlaybackToken(lesson.mux_playback_id, 3600);

    return NextResponse.json({
      playbackId: lesson.mux_playback_id,
      token,
    });
  } catch (error) {
    console.error("Error generating Mux token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
