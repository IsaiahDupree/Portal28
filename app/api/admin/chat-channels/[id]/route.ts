import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const updateChannelSchema = z.object({
  slug: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseServer();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateChannelSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Update the channel
    const { data: channel, error: updateError } = await supabase
      .from("chat_channels")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating chat channel:", updateError);

      // Check for unique constraint violation
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "A channel with this slug already exists in this space" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update channel" },
        { status: 500 }
      );
    }

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(channel, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/admin/chat-channels/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseServer();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by setting is_active to false
    const { data: channel, error: deleteError } = await supabase
      .from("chat_channels")
      .update({ is_active: false })
      .eq("id", params.id)
      .select()
      .single();

    if (deleteError) {
      console.error("Error deleting chat channel:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete channel" },
        { status: 500 }
      );
    }

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/admin/chat-channels/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
