import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const archiveSchema = z.object({
  isArchived: z.boolean(),
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
    const { id: threadId } = params;
    const json = await req.json();
    const parsed = archiveSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { isArchived } = parsed.data;

    // Verify user is part of this thread
    const { data: thread } = await supabase
      .from("dm_threads")
      .select("user1_id, user2_id")
      .eq("id", threadId)
      .single();

    if (!thread || (thread.user1_id !== auth.user.id && thread.user2_id !== auth.user.id)) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Update participant record
    const { error } = await supabase
      .from("dm_thread_participants")
      .update({
        is_archived: isArchived,
        archived_at: isArchived ? new Date().toISOString() : null,
      })
      .eq("thread_id", threadId)
      .eq("user_id", auth.user.id);

    if (error) {
      console.error("Error archiving thread:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, isArchived });
  } catch (err) {
    console.error("Error in archive thread API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
