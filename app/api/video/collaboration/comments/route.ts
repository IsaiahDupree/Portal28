import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const createCommentSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1),
  parentId: z.string().uuid().optional(),
  targetPath: z.string().optional(),
  targetTimestamp: z.number().optional(),
});

const resolveCommentSchema = z.object({
  resolved: z.boolean(),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = createCommentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sessionId, content, parentId, targetPath, targetTimestamp } = parsed.data;

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

    const { data: comment, error } = await supabase
      .from("video_collaboration_comments")
      .insert({
        session_id: sessionId,
        user_id: auth.user.id,
        content,
        parent_id: parentId,
        target_path: targetPath,
        target_timestamp: targetTimestamp,
      })
      .select(`
        *,
        user:users(id, email, full_name)
      `)
      .single();

    if (error) {
      console.error("Error creating comment:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("Error in create comment API:", err);
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
    const targetPath = searchParams.get("targetPath");
    const resolved = searchParams.get("resolved");

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

    let query = supabase
      .from("video_collaboration_comments")
      .select(`
        *,
        user:users(id, email, full_name),
        replies:video_collaboration_comments!parent_id(
          *,
          user:users(id, email, full_name)
        )
      `)
      .eq("session_id", sessionId)
      .is("parent_id", null);

    if (targetPath) {
      query = query.eq("target_path", targetPath);
    }

    if (resolved !== null) {
      query = query.eq("resolved", resolved === "true");
    }

    const { data: comments, error } = await query.order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ comments });
  } catch (err) {
    console.error("Error in get comments API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
