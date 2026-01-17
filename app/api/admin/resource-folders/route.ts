import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const createFolderSchema = z.object({
  space_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  icon: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  parent_id: z.string().uuid().optional().nullable(),
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
    const validationResult = createFolderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { space_id, name, icon, description, sort_order, parent_id } = validationResult.data;

    // Create the folder
    const { data: folder, error: createError } = await supabase
      .from("resource_folders")
      .insert({
        space_id,
        name,
        icon: icon ?? null,
        description: description ?? null,
        sort_order,
        parent_id: parent_id ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating resource folder:", createError);
      return NextResponse.json(
        { error: "Failed to create folder" },
        { status: 500 }
      );
    }

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/admin/resource-folders:", error);
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

    // Fetch folders
    const { data: folders, error } = await supabase
      .from("resource_folders")
      .select("*")
      .eq("space_id", spaceId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching resource folders:", error);
      return NextResponse.json(
        { error: "Failed to fetch folders" },
        { status: 500 }
      );
    }

    return NextResponse.json(folders ?? [], { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/admin/resource-folders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
