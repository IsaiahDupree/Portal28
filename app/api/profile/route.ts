import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for profile updates
const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional().nullable(),
});

// GET /api/profile - Get current user's profile
// GET /api/profile?userId=xxx - Get another user's profile
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const userId = req.nextUrl.searchParams.get("userId");
  const targetUserId = userId || user?.id;

  if (!targetUserId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get profile data
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_url, created_at, updated_at")
    .eq("id", targetUserId)
    .single();

  if (error) {
    // If profile doesn't exist, return default data
    if (error.code === "PGRST116") {
      const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
      return NextResponse.json({
        id: targetUserId,
        display_name: authUser?.user?.email?.split("@")[0] || "User",
        bio: null,
        avatar_url: null,
        created_at: null,
        updated_at: null,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(profile);
}

// PUT /api/profile - Update current user's profile
export async function PUT(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = updateProfileSchema.parse(body);

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    let result;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from("profiles")
        .update(validatedData)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new profile
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          ...validatedData,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
