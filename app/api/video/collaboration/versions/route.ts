import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const createVersionSchema = z.object({
  sessionId: z.string().uuid(),
  snapshot: z.record(z.any()),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = createVersionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sessionId, snapshot, description } = parsed.data;

    // Verify user is an editor
    const { data: participant } = await supabase
      .from("video_collaboration_participants")
      .select("role")
      .eq("session_id", sessionId)
      .eq("user_id", auth.user.id)
      .single();

    if (!participant || participant.role === "viewer") {
      return NextResponse.json(
        { error: "You don't have edit permissions for this session" },
        { status: 403 }
      );
    }

    // Get next version number
    const { data: latestVersion } = await supabase
      .from("video_collaboration_versions")
      .select("version_number")
      .eq("session_id", sessionId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

    const { data: version, error } = await supabase
      .from("video_collaboration_versions")
      .insert({
        session_id: sessionId,
        version_number: nextVersionNumber,
        snapshot,
        description,
        created_by: auth.user.id,
      })
      .select(`
        *,
        user:users(id, email, full_name)
      `)
      .single();

    if (error) {
      console.error("Error creating version:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ version }, { status: 201 });
  } catch (err) {
    console.error("Error in create version API:", err);
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
    const limit = parseInt(searchParams.get("limit") || "20");

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

    const { data: versions, error } = await supabase
      .from("video_collaboration_versions")
      .select(`
        *,
        user:users(id, email, full_name)
      `)
      .eq("session_id", sessionId)
      .order("version_number", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching versions:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ versions });
  } catch (err) {
    console.error("Error in get versions API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
