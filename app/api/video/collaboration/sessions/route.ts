import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const createSessionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  videoBatchId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all sessions where user is a participant or creator
    const { data: sessions, error } = await supabase
      .from("video_collaboration_sessions")
      .select(`
        *,
        participants:video_collaboration_participants(
          id,
          user_id,
          role,
          joined_at
        ),
        video_batch:video_batch_jobs(id, name, status)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching collaboration sessions:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("Error in collaboration sessions API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = createSessionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, description, videoBatchId } = parsed.data;

    // Create collaboration session
    const { data: session, error: sessionError } = await supabase
      .from("video_collaboration_sessions")
      .insert({
        name,
        description,
        video_batch_id: videoBatchId,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating collaboration session:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 400 });
    }

    // Add creator as owner participant
    const { error: participantError } = await supabase
      .from("video_collaboration_participants")
      .insert({
        session_id: session.id,
        user_id: auth.user.id,
        role: "owner",
      });

    if (participantError) {
      console.error("Error adding session owner:", participantError);
      // Clean up session if participant insert fails
      await supabase
        .from("video_collaboration_sessions")
        .delete()
        .eq("id", session.id);
      return NextResponse.json({ error: participantError.message }, { status: 400 });
    }

    // Initialize first version snapshot
    const { error: versionError } = await supabase
      .from("video_collaboration_versions")
      .insert({
        session_id: session.id,
        version_number: 1,
        snapshot: { initialized: true, timestamp: new Date().toISOString() },
        description: "Initial version",
        created_by: auth.user.id,
      });

    if (versionError) {
      console.error("Error creating initial version:", versionError);
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error("Error in create collaboration session API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
