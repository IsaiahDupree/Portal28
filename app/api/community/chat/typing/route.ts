import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const typingSchema = z.object({
  channelId: z.string().uuid(),
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

    const { channelId } = parsed.data;

    // Verify channel exists and user has access
    const { data: channel, error: channelError } = await supabase
      .from("chat_channels")
      .select("id, space_id, is_active")
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Verify user is a member
    const { data: member } = await supabase
      .from("community_members")
      .select("is_banned")
      .eq("space_id", channel.space_id)
      .eq("user_id", auth.user.id)
      .single();

    if (!member || member.is_banned) {
      return NextResponse.json({ error: "Not a member of this community" }, { status: 403 });
    }

    // Upsert typing indicator
    const { error } = await supabase
      .from("chat_typing")
      .upsert({
        channel_id: channelId,
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
