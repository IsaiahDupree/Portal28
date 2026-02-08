import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const updatePresenceSchema = z.object({
  sessionId: z.string().uuid(),
  isActive: z.boolean().default(true),
  cursorPosition: z.record(z.any()).optional(),
  currentSection: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = updatePresenceSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sessionId, isActive, cursorPosition, currentSection } = parsed.data;

    // Verify user is a participant
    const { data: participant } = await supabase
      .from("video_collaboration_participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", auth.user.id)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant in this session" },
        { status: 403 }
      );
    }

    // Update last_seen_at in participants table
    await supabase
      .from("video_collaboration_participants")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("user_id", auth.user.id);

    // Upsert presence
    const { data: presence, error } = await supabase
      .from("video_collaboration_presence")
      .upsert({
        session_id: sessionId,
        user_id: auth.user.id,
        is_active: isActive,
        cursor_position: cursorPosition,
        current_section: currentSection,
        last_activity_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating presence:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ presence });
  } catch (err) {
    console.error("Error in presence API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Verify user has access
    const { data: participant } = await supabase
      .from("video_collaboration_participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", auth.user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: presences, error } = await supabase
      .from("video_collaboration_presence")
      .select(`
        *,
        user:users(id, email, full_name)
      `)
      .eq("session_id", sessionId)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching presence:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ presences });
  } catch (err) {
    console.error("Error in get presence API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
