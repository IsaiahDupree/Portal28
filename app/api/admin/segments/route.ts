/**
 * Segments API
 * GDP-012: Segment Engine management
 *
 * GET - List all segments with member counts
 * POST - Create a new segment
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSegmentMemberCount } from "@/lib/segments/segmentEngine";
import { z } from "zod";

const createSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  segment_type: z.enum(["creator", "student", "engagement", "revenue"]),
  conditions: z.object({
    type: z.enum(["sql", "rules"]),
    sql: z.string().optional(),
    rules: z.array(z.object({
      field: z.string(),
      operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains", "not_contains", "is_null", "is_not_null"]),
      value: z.any().optional(),
    })).optional(),
  }),
  is_active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: segments, error } = await supabase
      .from("segment")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get member counts for each segment
    const segmentsWithCounts = await Promise.all(
      (segments || []).map(async (segment) => {
        const memberCount = await getSegmentMemberCount(segment.id);
        return {
          ...segment,
          member_count: memberCount,
        };
      })
    );

    return NextResponse.json({ segments: segmentsWithCounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const validated = createSegmentSchema.parse(body);

    const { data: segment, error } = await supabase
      .from("segment")
      .insert({
        name: validated.name,
        description: validated.description,
        segment_type: validated.segment_type,
        conditions: validated.conditions,
        is_active: validated.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ segment }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
