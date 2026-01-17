import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const createMessageSchema = z.object({
  channelId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = createMessageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { channelId, body } = parsed.data;

    // Verify channel exists and user has access
    const { data: channel, error: channelError } = await supabase
      .from("chat_channels")
      .select("id, space_id, is_active")
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (!channel.is_active) {
      return NextResponse.json({ error: "Channel is not active" }, { status: 403 });
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

    // Insert message
    const { data: message, error } = await supabase
      .from("chat_messages")
      .insert({
        channel_id: channelId,
        user_id: auth.user.id,
        body: body.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating chat message:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error("Error in chat message API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
