/**
 * Individual Reply API Route
 * Feature: feat-220 (Discussion Forums)
 *
 * Endpoints:
 * - PATCH /api/forum-replies/[id] - Update reply
 * - DELETE /api/forum-replies/[id] - Delete reply (soft delete)
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateReplySchema = z.object({
  content: z.string().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: reply } = await supabase
      .from("forum_replies")
      .select("user_id")
      .eq("id", params.id)
      .single();

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (reply.user_id !== user.id) {
      // Check if admin
      const { data: userData } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!userData?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const validation = UpdateReplySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: updatedReply, error } = await supabase
      .from("forum_replies")
      .update(validation.data)
      .eq("id", params.id)
      .select(
        `
        *,
        author:users!forum_replies_user_id_fkey(id, email, full_name)
      `
      )
      .single();

    if (error) {
      console.error("Error updating reply:", error);
      return NextResponse.json(
        { error: "Failed to update reply" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedReply);
  } catch (error) {
    console.error("Error in PATCH /api/forum-replies/[id]:", error);
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
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: reply } = await supabase
      .from("forum_replies")
      .select("user_id")
      .eq("id", params.id)
      .single();

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (reply.user_id !== user.id) {
      // Check if admin
      const { data: userData } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!userData?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Soft delete
    const { error } = await supabase
      .from("forum_replies")
      .update({ is_deleted: true })
      .eq("id", params.id);

    if (error) {
      console.error("Error deleting reply:", error);
      return NextResponse.json(
        { error: "Failed to delete reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/forum-replies/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
