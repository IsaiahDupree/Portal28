import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const reactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = reactionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { messageId, emoji } = parsed.data;

    // Verify message exists and user has access
    const { data: message, error: messageError } = await supabase
      .from("chat_messages")
      .select(`
        id,
        channel_id,
        chat_channels!inner(space_id)
      `)
      .eq("id", messageId)
      .eq("is_deleted", false)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const spaceId = (message as any).chat_channels.space_id;

    // Verify user is a member of the space
    const { data: member } = await supabase
      .from("community_members")
      .select("is_banned")
      .eq("space_id", spaceId)
      .eq("user_id", auth.user.id)
      .single();

    if (!member || member.is_banned) {
      return NextResponse.json({ error: "Not a member of this community" }, { status: 403 });
    }

    // Insert reaction (or do nothing if already exists)
    const { error } = await supabase
      .from("chat_reactions")
      .insert({
        message_id: messageId,
        user_id: auth.user.id,
        emoji: emoji.trim(),
      });

    if (error) {
      // Ignore duplicate key errors
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, message: "Reaction already exists" });
      }
      console.error("Error adding chat reaction:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Error in chat reaction API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = reactionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { messageId, emoji } = parsed.data;

    // Delete reaction
    const { error } = await supabase
      .from("chat_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", auth.user.id)
      .eq("emoji", emoji.trim());

    if (error) {
      console.error("Error removing chat reaction:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in chat reaction API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
