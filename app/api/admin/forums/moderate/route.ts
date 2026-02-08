/**
 * Forum Moderation API Route
 * Feature: feat-220 (Discussion Forums)
 *
 * Endpoints:
 * - POST /api/admin/forums/moderate - Perform moderation actions
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ModerationActionSchema = z.object({
  target_type: z.enum(["thread", "reply"]),
  target_id: z.string().uuid(),
  action_type: z.enum([
    "pin",
    "unpin",
    "lock",
    "unlock",
    "delete",
    "undelete",
    "mark_solution",
    "unmark_solution",
  ]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = ModerationActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { target_type, target_id, action_type, reason } = validation.data;

    // Perform action based on target type
    if (target_type === "thread") {
      const updates: Record<string, boolean> = {};

      switch (action_type) {
        case "pin":
          updates.is_pinned = true;
          break;
        case "unpin":
          updates.is_pinned = false;
          break;
        case "lock":
          updates.is_locked = true;
          break;
        case "unlock":
          updates.is_locked = false;
          break;
        case "delete":
          updates.is_deleted = true;
          break;
        case "undelete":
          updates.is_deleted = false;
          break;
        case "mark_solution":
          updates.is_solved = true;
          break;
        case "unmark_solution":
          updates.is_solved = false;
          break;
      }

      const { error } = await supabase
        .from("forum_threads")
        .update(updates)
        .eq("id", target_id);

      if (error) {
        console.error("Error moderating thread:", error);
        return NextResponse.json(
          { error: "Failed to moderate thread" },
          { status: 500 }
        );
      }
    } else if (target_type === "reply") {
      const updates: Record<string, boolean> = {};

      switch (action_type) {
        case "delete":
          updates.is_deleted = true;
          break;
        case "undelete":
          updates.is_deleted = false;
          break;
        case "mark_solution":
          updates.is_solution = true;
          break;
        case "unmark_solution":
          updates.is_solution = false;
          break;
        default:
          return NextResponse.json(
            { error: "Invalid action for reply" },
            { status: 400 }
          );
      }

      const { error } = await supabase
        .from("forum_replies")
        .update(updates)
        .eq("id", target_id);

      if (error) {
        console.error("Error moderating reply:", error);
        return NextResponse.json(
          { error: "Failed to moderate reply" },
          { status: 500 }
        );
      }
    }

    // Log moderation action
    await supabase.from("forum_moderation_actions").insert({
      moderator_id: user.id,
      target_type,
      target_id,
      action_type,
      reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/admin/forums/moderate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
