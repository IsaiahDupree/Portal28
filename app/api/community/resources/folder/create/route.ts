import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const createFolderSchema = z.object({
  spaceId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(10).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validation = createFolderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { spaceId, parentId, name, description, icon, sortOrder } = validation.data;

    // Create the folder
    const { data: folder, error } = await supabase
      .from("resource_folders")
      .insert({
        space_id: spaceId,
        parent_id: parentId ?? null,
        name: name.trim(),
        description: description ?? null,
        icon: icon ?? null,
        sort_order: sortOrder ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Folder creation error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
