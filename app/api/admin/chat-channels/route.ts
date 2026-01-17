import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const createChannelSchema = z.object({
  space_id: z.string().uuid(),
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
});

export async function POST(request: NextRequest) {
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
    const validationResult = createChannelSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { space_id, slug, name, description, sort_order } = validationResult.data;

    // Create the channel
    const { data: channel, error: createError } = await supabase
      .from("chat_channels")
      .insert({
        space_id,
        slug,
        name,
        description: description ?? null,
        sort_order,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating chat channel:", createError);

      // Check for unique constraint violation
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "A channel with this slug already exists in this space" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create channel" },
        { status: 500 }
      );
    }

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/admin/chat-channels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();

    // Get space_id from query params
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get("space_id");

    if (!spaceId) {
      return NextResponse.json(
        { error: "space_id query parameter is required" },
        { status: 400 }
      );
    }

    // Fetch channels
    const { data: channels, error } = await supabase
      .from("chat_channels")
      .select("*")
      .eq("space_id", spaceId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching chat channels:", error);
      return NextResponse.json(
        { error: "Failed to fetch channels" },
        { status: 500 }
      );
    }

    return NextResponse.json(channels ?? [], { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/admin/chat-channels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
