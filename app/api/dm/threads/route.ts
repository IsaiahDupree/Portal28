import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const createThreadSchema = z.object({
  recipientId: z.string().uuid(),
  initialMessage: z.string().min(1).max(5000).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all threads for this user
    const { data: threads, error } = await supabase
      .from("dm_threads")
      .select(`
        *,
        participant1:user1_id(id, email, full_name),
        participant2:user2_id(id, email, full_name),
        latest_message:dm_messages(content, created_at, sender_id),
        unread_count:dm_messages(count)
      `)
      .or(`user1_id.eq.${auth.user.id},user2_id.eq.${auth.user.id}`)
      .order("updated_at", { ascending: false })
      .limit(1, { foreignTable: "latest_message" });

    if (error) {
      console.error("Error fetching DM threads:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Calculate unread counts for each thread
    const threadsWithUnread = await Promise.all(
      (threads || []).map(async (thread) => {
        const { count } = await supabase
          .from("dm_messages")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", thread.id)
          .eq("is_read", false)
          .neq("sender_id", auth.user.id);

        return {
          ...thread,
          unread_count: count || 0,
          other_user:
            thread.user1_id === auth.user.id
              ? thread.participant2
              : thread.participant1,
        };
      })
    );

    return NextResponse.json({ threads: threadsWithUnread });
  } catch (err) {
    console.error("Error in DM threads API:", err);
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
    const parsed = createThreadSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { recipientId, initialMessage } = parsed.data;

    // Verify recipient exists
    const { data: recipient } = await supabase
      .from("users")
      .select("id")
      .eq("id", recipientId)
      .single();

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Get or create thread using RPC
    const { data: threadId, error: rpcError } = await supabase.rpc(
      "get_or_create_dm_thread",
      {
        p_user1_id: auth.user.id,
        p_user2_id: recipientId,
      }
    );

    if (rpcError) {
      console.error("Error creating thread:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    let message = null;

    // Send initial message if provided
    if (initialMessage) {
      const { data: msg, error: msgError } = await supabase
        .from("dm_messages")
        .insert({
          thread_id: threadId,
          sender_id: auth.user.id,
          content: initialMessage,
        })
        .select()
        .single();

      if (msgError) {
        console.error("Error sending initial message:", msgError);
      } else {
        message = msg;
      }
    }

    // Get full thread details
    const { data: thread } = await supabase
      .from("dm_threads")
      .select(`
        *,
        participant1:user1_id(id, email, full_name),
        participant2:user2_id(id, email, full_name)
      `)
      .eq("id", threadId)
      .single();

    return NextResponse.json({ thread, message }, { status: 201 });
  } catch (err) {
    console.error("Error in create DM thread API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
