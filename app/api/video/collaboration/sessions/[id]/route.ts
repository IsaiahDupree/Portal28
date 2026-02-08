import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const updateSessionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "archived", "locked"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

    const { data: session, error } = await supabase
      .from("video_collaboration_sessions")
      .select(`
        *,
        participants:video_collaboration_participants(
          id,
          user_id,
          role,
          joined_at,
          last_seen_at,
          user:users(id, email, full_name)
        ),
        video_batch:video_batch_jobs(id, name, status),
        latest_edits:video_collaboration_edits(
          id,
          operation_type,
          path,
          created_at,
          user:users(id, email, full_name)
        ),
        comments:video_collaboration_comments(
          id,
          content,
          target_path,
          resolved,
          created_at,
          user:users(id, email, full_name)
        )
      `)
      .eq("id", id)
      .order("created_at", { ascending: false, foreignTable: "latest_edits" })
      .limit(10, { foreignTable: "latest_edits" })
      .order("created_at", { ascending: false, foreignTable: "comments" })
      .single();

    if (error) {
      console.error("Error fetching collaboration session:", error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Error in collaboration session API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const json = await req.json();
    const parsed = updateSessionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updates: any = parsed.data;

    if (parsed.data.status === "archived") {
      updates.archived_at = new Date().toISOString();
    }

    const { data: session, error } = await supabase
      .from("video_collaboration_sessions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating collaboration session:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Error in update collaboration session API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

    const { error } = await supabase
      .from("video_collaboration_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting collaboration session:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in delete collaboration session API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
