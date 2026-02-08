import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for review submission
const reviewSchema = z.object({
  course_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().optional(),
});

/**
 * GET /api/reviews
 * Get reviews for a course
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course_id");

    if (!courseId) {
      return NextResponse.json(
        { error: "course_id is required" },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Get published reviews for the course
    const { data: reviews, error } = await supabase
      .from("course_reviews")
      .select(`
        id,
        rating,
        review_text,
        created_at,
        user_id,
        user_metadata!inner(name)
      `)
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    // Get average rating and total count
    const { data: stats, error: statsError } = await supabase.rpc(
      "get_course_average_rating",
      { p_course_id: courseId }
    );

    if (statsError) {
      console.error("Error fetching rating stats:", statsError);
    }

    return NextResponse.json({
      reviews: reviews || [],
      average_rating: stats?.[0]?.average_rating || 0,
      total_reviews: stats?.[0]?.total_reviews || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Submit a new review for a course
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = reviewSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { course_id, rating, review_text } = validationResult.data;

    // Check if user has an active entitlement for this course
    const { data: entitlement, error: entitlementError } = await supabase
      .from("entitlements")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .eq("status", "active")
      .single();

    if (entitlementError || !entitlement) {
      return NextResponse.json(
        { error: "You must have access to this course to review it" },
        { status: 403 }
      );
    }

    // Check if user already reviewed this course
    const { data: existingReview } = await supabase
      .from("course_reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this course" },
        { status: 409 }
      );
    }

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from("course_reviews")
      .insert({
        user_id: user.id,
        course_id,
        rating,
        review_text: review_text || null,
        is_published: false, // Reviews need moderation before being published
        moderation_status: "pending",
      })
      .select()
      .single();

    if (reviewError) {
      console.error("Error creating review:", reviewError);
      return NextResponse.json(
        { error: "Failed to create review" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Review submitted successfully. It will be published after moderation.",
        review,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
