/**
 * Public API: App Marketplace - App Details
 * Returns detailed information about a specific app
 * Test ID: EXP-MKT-001
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/marketplace/apps/[key]
 * Returns detailed information about a specific app including ratings
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const supabase = supabaseServer();
  const { key } = await params;

  // Fetch app details
  const { data: app, error: appError } = await supabase
    .from("widgets")
    .select("*")
    .eq("key", key)
    .in("status", ["active", "coming_soon"])
    .single();

  if (appError || !app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Fetch recent ratings
  const { data: ratings, error: ratingsError } = await supabase
    .from("app_ratings")
    .select(
      `
      id,
      rating,
      review_text,
      helpful_count,
      created_at,
      users:user_id (
        id,
        email,
        full_name
      )
    `
    )
    .eq("widget_key", key)
    .order("created_at", { ascending: false })
    .limit(10);

  if (ratingsError) {
    console.error("Error fetching ratings:", ratingsError);
  }

  // Check if current user has installed this app
  const { data: auth } = await supabase.auth.getUser();
  let isInstalled = false;
  let userRating = null;

  if (auth.user) {
    const { data: installation } = await supabase
      .from("app_installations")
      .select("id, installed_at, version_at_install, last_used_at")
      .eq("user_id", auth.user.id)
      .eq("widget_key", key)
      .eq("status", "active")
      .single();

    isInstalled = !!installation;

    // Get user's rating if exists
    const { data: rating } = await supabase
      .from("app_ratings")
      .select("id, rating, review_text, created_at")
      .eq("user_id", auth.user.id)
      .eq("widget_key", key)
      .single();

    userRating = rating || null;
  }

  return NextResponse.json({
    app,
    ratings: ratings || [],
    isInstalled,
    userRating,
  });
}
