import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const updateCommentSchema = z.object({
  content: z.string().min(1).optional(),
  resolved: z.boolean().optional(),
});

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
    const parsed = updateCommentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updates: any = { ...parsed.data };

    if (parsed.data.resolved !== undefined) {
      updates.resolved_by = parsed.data.resolved ? auth.user.id : null;
      updates.resolved_at = parsed.data.resolved ? new Date().toISOString() : null;
    }

    const { data: comment, error } = await supabase
      .from("video_collaboration_comments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating comment:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ comment });
  } catch (err) {
    console.error("Error in update comment API:", err);
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
      .from("video_collaboration_comments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting comment:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in delete comment API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
