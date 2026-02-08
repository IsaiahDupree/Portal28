import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
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
    const { id: threadId } = params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before"); // For pagination

    // Verify user is part of this thread
    const { data: thread } = await supabase
      .from("dm_threads")
      .select("user1_id, user2_id")
      .eq("id", threadId)
      .single();

    if (!thread || (thread.user1_id !== auth.user.id && thread.user2_id !== auth.user.id)) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    let query = supabase
      .from("dm_messages")
      .select(`
        *,
        sender:sender_id(id, email, full_name)
      `)
      .eq("thread_id", threadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Mark messages as read
    await supabase.rpc("mark_dm_messages_read", {
      p_thread_id: threadId,
      p_user_id: auth.user.id,
    });

    return NextResponse.json({ messages: messages?.reverse() || [] });
  } catch (err) {
    console.error("Error in get messages API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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
    const parsed = sendMessageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { content } = parsed.data;

    // Verify user is part of this thread
    const { data: thread } = await supabase
      .from("dm_threads")
      .select("user1_id, user2_id")
      .eq("id", threadId)
      .single();

    if (!thread || (thread.user1_id !== auth.user.id && thread.user2_id !== auth.user.id)) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { data: message, error } = await supabase
      .from("dm_messages")
      .insert({
        thread_id: threadId,
        sender_id: auth.user.id,
        content,
      })
      .select(`
        *,
        sender:sender_id(id, email, full_name)
      `)
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error("Error in send message API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
