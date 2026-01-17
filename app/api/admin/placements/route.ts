import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const AddPlacementSchema = z.object({
  placement_key: z.string().min(1),
  offer_key: z.string().min(1),
  sort_order: z.number().int().min(0).optional(),
});

const UpdatePlacementSchema = z.object({
  placement_key: z.string().min(1),
  offer_key: z.string().min(1),
  sort_order: z.number().int().min(0),
});

// GET /api/admin/placements?placement_key=widget:templates
// Returns all placements for a given placement_key
export async function GET(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const placement_key = searchParams.get("placement_key");

  if (!placement_key) {
    return NextResponse.json({ error: "placement_key required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("offer_placements")
    .select(`
      placement_key,
      offer_key,
      sort_order,
      is_active,
      created_at,
      offers (
        key,
        kind,
        title,
        subtitle,
        badge,
        price_label,
        is_active
      )
    `)
    .eq("placement_key", placement_key)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching placements:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ placements: data ?? [] });
}

// POST /api/admin/placements
// Add an offer to a placement
export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = AddPlacementSchema.parse(body);

    // If sort_order not provided, append to end
    let sort_order = validated.sort_order;
    if (sort_order === undefined) {
      const { data: existing } = await supabase
        .from("offer_placements")
        .select("sort_order")
        .eq("placement_key", validated.placement_key)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      sort_order = existing ? existing.sort_order + 1 : 0;
    }

    const { data, error } = await supabase
      .from("offer_placements")
      .insert({
        placement_key: validated.placement_key,
        offer_key: validated.offer_key,
        sort_order,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating placement:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      user_id: authData.user.id,
      action: "created_placement",
      details: {
        placement_key: validated.placement_key,
        offer_key: validated.offer_key,
      },
    });

    return NextResponse.json({ placement: data }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/placements
// Update sort order for placements
export async function PATCH(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = UpdatePlacementSchema.parse(body);

    const { data, error } = await supabase
      .from("offer_placements")
      .update({ sort_order: validated.sort_order })
      .eq("placement_key", validated.placement_key)
      .eq("offer_key", validated.offer_key)
      .select()
      .single();

    if (error) {
      console.error("Error updating placement:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      user_id: authData.user.id,
      action: "updated_placement",
      details: {
        placement_key: validated.placement_key,
        offer_key: validated.offer_key,
        sort_order: validated.sort_order,
      },
    });

    return NextResponse.json({ placement: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/placements?placement_key=X&offer_key=Y
// Remove an offer from a placement
export async function DELETE(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const placement_key = searchParams.get("placement_key");
  const offer_key = searchParams.get("offer_key");

  if (!placement_key || !offer_key) {
    return NextResponse.json(
      { error: "placement_key and offer_key required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("offer_placements")
    .delete()
    .eq("placement_key", placement_key)
    .eq("offer_key", offer_key);

  if (error) {
    console.error("Error deleting placement:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabase.from("admin_actions").insert({
    user_id: authData.user.id,
    action: "deleted_placement",
    details: {
      placement_key,
      offer_key,
    },
  });

  return NextResponse.json({ success: true });
}
