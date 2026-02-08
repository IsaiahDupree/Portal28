/**
 * User API: App Marketplace - Ratings & Reviews
 * Handles app ratings and reviews
 * Test ID: EXP-MKT-001
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const RatingSchema = z.object({
  widget_key: z.string(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().max(1000).optional(),
});

/**
 * POST /api/marketplace/ratings
 * Creates or updates a rating for an app
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  // Check authentication
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = RatingSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { widget_key, rating, review_text } = validation.data;

  // Check if app exists
  const { data: app } = await supabase
    .from("widgets")
    .select("key")
    .eq("key", widget_key)
    .single();

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Check if user has installed this app (optional requirement)
  const { data: installation } = await supabase
    .from("app_installations")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("widget_key", widget_key)
    .eq("status", "active")
    .single();

  if (!installation) {
    return NextResponse.json(
      { error: "You must install the app before rating it" },
      { status: 400 }
    );
  }

  // Upsert rating (insert or update)
  const { data: ratingData, error: ratingError } = await supabase
    .from("app_ratings")
    .upsert(
      {
        user_id: auth.user.id,
        widget_key,
        rating,
        review_text: review_text || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,widget_key",
      }
    )
    .select()
    .single();

  if (ratingError) {
    return NextResponse.json({ error: ratingError.message }, { status: 500 });
  }

  return NextResponse.json({ rating: ratingData, ok: true });
}

/**
 * DELETE /api/marketplace/ratings
 * Deletes a rating for an app
 */
export async function DELETE(req: NextRequest) {
  const supabase = supabaseServer();

  // Check authentication
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const widget_key = searchParams.get("widget_key");

  if (!widget_key) {
    return NextResponse.json(
      { error: "Missing widget_key parameter" },
      { status: 400 }
    );
  }

  // Delete rating
  const { error } = await supabase
    .from("app_ratings")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("widget_key", widget_key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/marketplace/ratings?widget_key=XXX
 * Gets all ratings for an app
 */
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();

  const { searchParams } = new URL(req.url);
  const widget_key = searchParams.get("widget_key");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!widget_key) {
    return NextResponse.json(
      { error: "Missing widget_key parameter" },
      { status: 400 }
    );
  }

  // Fetch ratings with user info
  const { data: ratings, error } = await supabase
    .from("app_ratings")
    .select(
      `
      id,
      rating,
      review_text,
      helpful_count,
      created_at,
      updated_at,
      users:user_id (
        id,
        email,
        full_name
      )
    `
    )
    .eq("widget_key", widget_key)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ratings });
}
