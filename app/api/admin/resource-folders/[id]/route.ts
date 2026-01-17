import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const updateFolderSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  icon: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  parent_id: z.string().uuid().optional().nullable(),
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
    const validationResult = updateFolderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Update the folder
    const { data: folder, error: updateError } = await supabase
      .from("resource_folders")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating resource folder:", updateError);
      return NextResponse.json(
        { error: "Failed to update folder" },
        { status: 500 }
      );
    }

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(folder, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/admin/resource-folders/[id]:", error);
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
    const { data: folder, error: deleteError } = await supabase
      .from("resource_folders")
      .update({ is_active: false })
      .eq("id", params.id)
      .select()
      .single();

    if (deleteError) {
      console.error("Error deleting resource folder:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete folder" },
        { status: 500 }
      );
    }

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/admin/resource-folders/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
