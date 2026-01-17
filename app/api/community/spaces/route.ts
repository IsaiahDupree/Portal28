import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserAccessibleSpaces } from "@/lib/community/queries";

/**
 * GET /api/community/spaces
 * Returns list of spaces accessible to the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const spaces = await getUserAccessibleSpaces(user.id);

    return NextResponse.json({ spaces }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/community/spaces:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
