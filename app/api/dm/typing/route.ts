import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const typingSchema = z.object({
  threadId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = typingSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { threadId } = parsed.data;

    // Verify user is part of this thread
    const { data: thread } = await supabase
      .from("dm_threads")
      .select("user1_id, user2_id")
      .eq("id", threadId)
      .single();

    if (!thread || (thread.user1_id !== auth.user.id && thread.user2_id !== auth.user.id)) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Upsert typing indicator
    const { error } = await supabase
      .from("dm_typing")
      .upsert({
        thread_id: threadId,
        user_id: auth.user.id,
        started_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Error updating typing indicator:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in typing indicator API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
