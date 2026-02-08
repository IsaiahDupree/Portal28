/**
 * Public API: App Marketplace - Browse Apps
 * Returns available apps from the marketplace
 * Test ID: EXP-MKT-001
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/marketplace/apps
 * Returns all active and coming_soon apps from the marketplace
 * Query params:
 *   - category: filter by category (learn, community, tools)
 *   - search: search by name or description
 *   - sort: rating|installs|name (default: rating)
 */
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "rating";

  // Build query
  let query = supabase
    .from("widgets")
    .select(
      `
      id,
      key,
      name,
      description,
      icon,
      category,
      status,
      author,
      version,
      install_count,
      rating_avg,
      rating_count,
      dependencies,
      screenshots,
      changelog,
      metadata,
      access_policy,
      saleswall_type,
      saleswall_config,
      created_at,
      updated_at
    `
    )
    .in("status", ["active", "coming_soon"]);

  // Filter by category
  if (category) {
    query = query.eq("category", category);
  }

  // Search by name or description
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Sort
  switch (sort) {
    case "installs":
      query = query.order("install_count", { ascending: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "rating":
    default:
      query = query
        .order("rating_avg", { ascending: false })
        .order("rating_count", { ascending: false });
      break;
  }

  const { data: apps, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ apps });
}
