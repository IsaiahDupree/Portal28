import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for review update
const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  review_text: z.string().optional(),
});

// Schema for moderation
const moderationSchema = z.object({
  is_published: z.boolean(),
  moderation_status: z.enum(["pending", "approved", "rejected"]),
  moderation_notes: z.string().optional(),
});

/**
 * PATCH /api/reviews/[id]
 * Update a review (by owner or admin for moderation)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseServer();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = params.id;
    const body = await request.json();

    // Get the review
    const { data: review, error: fetchError } = await supabase
      .from("course_reviews")
      .select("*, user_id")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if user is admin
    const { data: metadata } = await supabase
      .from("user_metadata")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = metadata?.role === "admin";
    const isOwner = review.user_id === user.id;

    // Determine if this is a moderation action
    const isModerationAction =
      "is_published" in body || "moderation_status" in body;

    if (isModerationAction && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can moderate reviews" },
        { status: 403 }
      );
    }

    if (!isModerationAction && !isOwner) {
      return NextResponse.json(
        { error: "You can only edit your own reviews" },
        { status: 403 }
      );
    }

    // Validate input based on action type
    let updateData: any;
    if (isModerationAction) {
      const validationResult = moderationSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.issues },
          { status: 400 }
        );
      }
      updateData = {
        ...validationResult.data,
        moderator_id: user.id,
      };
    } else {
      const validationResult = updateReviewSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.issues },
          { status: 400 }
        );
      }

      // Only allow updating if review is still pending
      if (review.moderation_status !== "pending") {
        return NextResponse.json(
          { error: "You can only edit pending reviews" },
          { status: 403 }
        );
      }

      updateData = validationResult.data;
    }

    // Update the review
    const { data: updatedReview, error: updateError } = await supabase
      .from("course_reviews")
      .update(updateData)
      .eq("id", reviewId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating review:", updateError);
      return NextResponse.json(
        { error: "Failed to update review" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error in PATCH /api/reviews/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]
 * Delete a review (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseServer();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = params.id;

    // Delete the review (RLS will ensure user can only delete their own)
    const { error: deleteError } = await supabase
      .from("course_reviews")
      .delete()
      .eq("id", reviewId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting review:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete review" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/reviews/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
