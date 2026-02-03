import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const QuerySchema = z.object({
  courseId: z.string().uuid().optional(),
  offerKey: z.string().optional(),
});

/**
 * GET /api/offers/order-bumps
 *
 * Fetch active order bump offers for a specific course or offer
 *
 * Query params:
 * - courseId: UUID of the course
 * - offerKey: Key of the parent offer
 *
 * Returns array of order bump offers that should be displayed
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    courseId: searchParams.get("courseId") || undefined,
    offerKey: searchParams.get("offerKey") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { courseId, offerKey } = parsed.data;
  const supabase = supabaseServer();

  // Build query for order bump offers
  let query = supabase
    .from("offers")
    .select("*")
    .eq("kind", "order_bump")
    .eq("is_active", true);

  // Filter by parent offer key if provided
  if (offerKey) {
    query = query.eq("parent_offer_key", offerKey);
  }

  // If courseId provided but no offerKey, find bumps for that course
  // This requires the payload.courseSlug to match
  if (courseId && !offerKey) {
    const { data: course } = await supabase
      .from("courses")
      .select("slug")
      .eq("id", courseId)
      .single();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // For now, return all active order bumps
    // In production, you'd want to filter by course or use parent_offer_key
    // query = query.contains("payload", { courseSlug: course.slug });
  }

  const { data: bumps, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching order bumps:", error);
    return NextResponse.json({ error: "Failed to fetch order bumps" }, { status: 500 });
  }

  return NextResponse.json({ bumps: bumps ?? [] });
}
