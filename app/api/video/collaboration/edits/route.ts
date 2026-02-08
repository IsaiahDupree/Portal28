import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const createEditSchema = z.object({
  sessionId: z.string().uuid(),
  operationType: z.enum(["insert", "delete", "update", "replace"]),
  path: z.string(),
  oldValue: z.any().optional(),
  newValue: z.any(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = createEditSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sessionId, operationType, path, oldValue, newValue, metadata } = parsed.data;

    // Verify user is an editor in this session
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

    // Detect potential conflicts
    const { data: recentEdits } = await supabase
      .from("video_collaboration_edits")
      .select("id, path, new_value, user_id")
      .eq("session_id", sessionId)
      .eq("path", path)
      .gte("created_at", new Date(Date.now() - 60000).toISOString()) // Last 1 minute
      .neq("user_id", auth.user.id);

    let conflictDetected = false;
    if (recentEdits && recentEdits.length > 0) {
      // Simple conflict detection: same path edited by different user recently
      conflictDetected = true;
      console.warn("Potential edit conflict detected:", {
        sessionId,
        path,
        currentUser: auth.user.id,
        conflictingEdits: recentEdits,
      });
    }

    // Create edit record
    const { data: edit, error: editError } = await supabase
      .from("video_collaboration_edits")
      .insert({
        session_id: sessionId,
        user_id: auth.user.id,
        operation_type: operationType,
        path,
        old_value: oldValue,
        new_value: newValue,
        metadata: {
          ...metadata,
          conflict_detected: conflictDetected,
        },
      })
      .select()
      .single();

    if (editError) {
      console.error("Error creating edit:", editError);
      return NextResponse.json({ error: editError.message }, { status: 400 });
    }

    // If conflict detected, log it
    if (conflictDetected && recentEdits && recentEdits.length > 0) {
      await supabase
        .from("video_collaboration_conflicts")
        .insert({
          session_id: sessionId,
          edit1_id: recentEdits[0].id,
          edit2_id: edit.id,
          resolution_strategy: "last_write_wins",
        });
    }

    return NextResponse.json({ edit, conflictDetected }, { status: 201 });
  } catch (err) {
    console.error("Error in create edit API:", err);
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Verify user has access to this session
    const { data: participant } = await supabase
      .from("video_collaboration_participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", auth.user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: edits, error } = await supabase
      .from("video_collaboration_edits")
      .select(`
        *,
        user:users(id, email, full_name)
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching edits:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ edits });
  } catch (err) {
    console.error("Error in get edits API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
