import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const before = searchParams.get("before") || undefined;

  try {
    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from("chat_channels")
      .select("id, space_id, is_active")
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Verify user is a member of the space
    const { data: member } = await supabase
      .from("community_members")
      .select("is_banned")
      .eq("space_id", channel.space_id)
      .eq("user_id", auth.user.id)
      .single();

    if (!member || member.is_banned) {
      return NextResponse.json({ error: "Not a member of this community" }, { status: 403 });
    }

    // Load messages
    let query = supabase
      .from("chat_messages")
      .select(`
        id,
        channel_id,
        user_id,
        body,
        is_edited,
        created_at,
        updated_at
      `)
      .eq("channel_id", channelId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error("Error loading chat messages:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return in ascending order (oldest first)
    const orderedMessages = (messages ?? []).reverse();

    return NextResponse.json({ messages: orderedMessages });
  } catch (err) {
    console.error("Error in chat messages API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
