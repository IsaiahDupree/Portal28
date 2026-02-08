import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const trackEventSchema = z.object({
  test_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  event_type: z.string().min(1), // 'view', 'click', 'add_to_cart', 'purchase', etc.
  event_value: z.number().optional(), // For revenue tracking
  metadata: z.record(z.any()).optional(),
  anon_id: z.string().optional()
});

/**
 * POST /api/ab-tests/track
 * Tracks an event/conversion for an A/B test variant
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = trackEventSchema.parse(body);

    // Get current user (may be null for anonymous users)
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    // Find the assignment for this user/test
    let assignmentQuery = supabaseAdmin
      .from("ab_test_assignments")
      .select("id")
      .eq("test_id", validatedData.test_id)
      .eq("variant_id", validatedData.variant_id);

    if (user) {
      assignmentQuery = assignmentQuery.eq("user_id", user.id);
    } else if (validatedData.anon_id) {
      assignmentQuery = assignmentQuery.eq("anon_id", validatedData.anon_id);
    } else {
      return NextResponse.json(
        { error: "Either authenticated user or anon_id required" },
        { status: 400 }
      );
    }

    const { data: assignment, error: assignmentError } = await assignmentQuery.maybeSingle();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "No assignment found for this user and test" },
        { status: 404 }
      );
    }

    // Create the event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("ab_test_events")
      .insert({
        test_id: validatedData.test_id,
        variant_id: validatedData.variant_id,
        assignment_id: assignment.id,
        event_type: validatedData.event_type,
        event_value: validatedData.event_value || null,
        metadata: validatedData.metadata || null
      })
      .select()
      .single();

    if (eventError) {
      return NextResponse.json(
        { error: eventError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ event }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error tracking event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
