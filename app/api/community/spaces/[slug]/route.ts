import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSpaceBySlug } from "@/lib/community/queries";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

/**
 * GET /api/community/spaces/[slug]
 * Returns a specific community space by slug
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const space = await getSpaceBySlug(slug);

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    return NextResponse.json({ space }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/community/spaces/[slug]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
