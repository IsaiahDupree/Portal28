import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const clickSchema = z.object({
  searchQueryId: z.string().uuid().optional(),
  resultId: z.string(),
  resultType: z.enum(["course", "lesson", "resource", "article"]),
  resultRank: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await req.json();

    const validation = clickSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { searchQueryId, resultId, resultType, resultRank } = validation.data;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Insert click tracking
    const { error } = await supabase.from("search_result_clicks").insert({
      search_query_id: searchQueryId || null,
      result_id: resultId,
      result_type: resultType,
      result_rank: resultRank,
      user_id: user?.id || null,
    });

    if (error) {
      console.error("Failed to track search click:", error);
      return NextResponse.json(
        { error: "Failed to track click" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Search click tracking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
