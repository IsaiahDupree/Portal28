import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const ReorderSchema = z.object({
  placement_key: z.string().min(1),
  offer_keys: z.array(z.string().min(1)),
});

// POST /api/admin/placements/reorder
// Bulk reorder offers in a placement
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
    const { placement_key, offer_keys } = ReorderSchema.parse(body);

    // Update sort_order for each offer based on array position
    const updates = offer_keys.map((offer_key, index) =>
      supabase
        .from("offer_placements")
        .update({ sort_order: index })
        .eq("placement_key", placement_key)
        .eq("offer_key", offer_key)
    );

    const results = await Promise.all(updates);

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("Errors reordering placements:", errors);
      return NextResponse.json(
        { error: "Failed to reorder some placements" },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      user_id: authData.user.id,
      action: "reordered_placements",
      details: {
        placement_key,
        order: offer_keys,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
