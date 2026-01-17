import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { createCommunitySpace } from "@/lib/community/queries";

const CreateSpaceSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you may want to add admin check here)
    // For now, authenticated users can create spaces
    const body = await req.json();
    const validation = CreateSpaceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { slug, name, description } = validation.data;

    const space = await createCommunitySpace(slug, name, description);

    if (!space) {
      return NextResponse.json(
        { error: "Failed to create space. Slug may already exist." },
        { status: 400 }
      );
    }

    return NextResponse.json({ space }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/community/spaces:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
