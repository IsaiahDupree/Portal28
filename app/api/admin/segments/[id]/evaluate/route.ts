/**
 * Segment Evaluation API
 * GDP-012: Evaluate segment membership for all persons
 *
 * POST - Evaluate segment and update memberships
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { evaluateAllSegmentsForPerson, getSegmentMembers } from "@/lib/segments/segmentEngine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const segmentId = params.id;

  try {
    // Get segment
    const { data: segment, error: segmentError } = await supabase
      .from("segment")
      .select("*")
      .eq("id", segmentId)
      .single();

    if (segmentError || !segment) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    // Get all persons
    const { data: persons, error: personsError } = await supabase
      .from("person")
      .select("id");

    if (personsError) {
      return NextResponse.json(
        { error: "Failed to fetch persons" },
        { status: 500 }
      );
    }

    // Evaluate segment for each person
    let totalEvaluated = 0;
    let totalEntered = 0;
    let totalExited = 0;

    for (const person of persons || []) {
      const result = await evaluateAllSegmentsForPerson(person.id);
      totalEvaluated += result.evaluated;
      totalEntered += result.entered;
      totalExited += result.exited;
    }

    // Get updated member list
    const members = await getSegmentMembers(segmentId);

    return NextResponse.json({
      message: "Segment evaluation completed",
      segment: {
        id: segment.id,
        name: segment.name,
      },
      stats: {
        evaluated: totalEvaluated,
        entered: totalEntered,
        exited: totalExited,
        current_members: members.length,
      },
    });
  } catch (error: any) {
    console.error("Segment evaluation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
