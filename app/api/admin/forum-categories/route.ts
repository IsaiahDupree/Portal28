import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const createCategorySchema = z.object({
  space_id: z.string().uuid(),
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  icon: z.string().optional(),
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createCategorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { space_id, slug, name, description, icon, sort_order } = validationResult.data;

    // TODO: Add admin role check when admin system is implemented
    // For now, any authenticated user can create categories

    // Create the category
    const { data: category, error: createError } = await supabase
      .from("forum_categories")
      .insert({
        space_id,
        slug,
        name,
        description: description ?? null,
        icon: icon ?? null,
        sort_order,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating forum category:", createError);

      // Check for unique constraint violation
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "A category with this slug already exists in this space" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      );
    }

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/admin/forum-categories:", error);
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

    // Fetch categories with thread counts
    const { data: categories, error } = await supabase
      .from("forum_categories")
      .select(`
        *,
        thread_count:forum_threads(count)
      `)
      .eq("space_id", spaceId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching forum categories:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    // Transform the thread_count from array format to number
    const transformedCategories = (categories ?? []).map((cat: any) => ({
      ...cat,
      thread_count: cat.thread_count?.[0]?.count ?? 0
    }));

    return NextResponse.json(transformedCategories, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/admin/forum-categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
