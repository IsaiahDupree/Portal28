import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSpaceBySlug, isSpaceMember, userHasSpaceAccess } from "@/lib/community/queries";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

/**
 * GET /api/community/spaces/[slug]/membership
 * Check if the authenticated user has access to or is a member of the space
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

    const hasAccess = await userHasSpaceAccess(user.id, space.id);
    const isMember = await isSpaceMember(user.id, space.id);

    return NextResponse.json(
      {
        hasAccess,
        isMember,
        spaceId: space.id,
        spaceName: space.name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/community/spaces/[slug]/membership:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
