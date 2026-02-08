import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const assignVariantSchema = z.object({
  test_id: z.string().uuid(),
  anon_id: z.string().optional()
});

/**
 * POST /api/ab-tests/assign
 * Assigns a user to a variant for a given test
 * Returns the assigned variant configuration
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { test_id, anon_id } = assignVariantSchema.parse(body);

    // Get current user (may be null for anonymous users)
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    // Validate we have either user_id or anon_id
    if (!user && !anon_id) {
      return NextResponse.json(
        { error: "Either authenticated user or anon_id required" },
        { status: 400 }
      );
    }

    // Get the test and verify it's active
    const { data: test, error: testError } = await supabaseAdmin
      .from("ab_tests")
      .select("id, status, traffic_allocation")
      .eq("id", test_id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (test.status !== 'active') {
      return NextResponse.json(
        { error: "Test is not active" },
        { status: 400 }
      );
    }

    // Check if user already has an assignment for this test
    let query = supabaseAdmin
      .from("ab_test_assignments")
      .select(`
        *,
        variant:ab_test_variants(*)
      `)
      .eq("test_id", test_id);

    if (user) {
      query = query.eq("user_id", user.id);
    } else {
      query = query.eq("anon_id", anon_id);
    }

    const { data: existingAssignment } = await query.maybeSingle();

    if (existingAssignment) {
      // Return existing assignment
      return NextResponse.json({
        assignment: existingAssignment,
        variant: existingAssignment.variant
      });
    }

    // Check traffic allocation (randomly exclude some traffic)
    const random = Math.random() * 100;
    if (random > test.traffic_allocation) {
      // User not included in test
      return NextResponse.json({
        included: false,
        message: "User not included in test based on traffic allocation"
      });
    }

    // Get all variants for this test
    const { data: variants, error: variantsError } = await supabaseAdmin
      .from("ab_test_variants")
      .select("*")
      .eq("test_id", test_id)
      .order("created_at");

    if (variantsError || !variants || variants.length === 0) {
      return NextResponse.json(
        { error: "No variants found for test" },
        { status: 500 }
      );
    }

    // Weighted random selection
    const totalWeight = variants.reduce((sum, v) => sum + parseFloat(v.traffic_weight.toString()), 0);
    let randomWeight = Math.random() * totalWeight;
    let selectedVariant = variants[0];

    for (const variant of variants) {
      randomWeight -= parseFloat(variant.traffic_weight.toString());
      if (randomWeight <= 0) {
        selectedVariant = variant;
        break;
      }
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("ab_test_assignments")
      .insert({
        test_id: test_id,
        variant_id: selectedVariant.id,
        user_id: user?.id || null,
        anon_id: anon_id || null
      })
      .select(`
        *,
        variant:ab_test_variants(*)
      `)
      .single();

    if (assignmentError) {
      return NextResponse.json(
        { error: assignmentError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      assignment,
      variant: assignment.variant,
      included: true
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error assigning variant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
