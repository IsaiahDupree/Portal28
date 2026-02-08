/**
 * Unread Messages Count API Route
 * Feature: feat-222 (Instructor Messaging)
 *
 * Endpoints:
 * - GET /api/messages/unread-count - Get unread message count for current user
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get unread count using database function
    const { data: count, error } = await supabase.rpc(
      "get_unread_message_count",
      {
        user_uuid: user.id,
      }
    );

    if (error) {
      console.error("Error fetching unread count:", error);
      return NextResponse.json(
        { error: "Failed to fetch unread count" },
        { status: 500 }
      );
    }

    return NextResponse.json({ unread_count: count || 0 });
  } catch (error) {
    console.error("Error in GET /api/messages/unread-count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
