import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const updateABTestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  traffic_allocation: z.number().min(0).max(100).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  winner_variant_id: z.string().uuid().optional()
});

// GET /api/admin/ab-tests/[id] - Get single test with metrics
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: test, error } = await supabaseAdmin
    .from("ab_tests")
    .select(`
      *,
      variants:ab_test_variants(*),
      metrics:ab_test_metrics(*)
    `)
    .eq("id", params.id)
    .single();

  if (error || !test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  return NextResponse.json({ test });
}

// PATCH /api/admin/ab-tests/[id] - Update test
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = updateABTestSchema.parse(body);

    // If changing to active status, validate start_date
    if (validatedData.status === 'active' && !validatedData.start_date) {
      validatedData.start_date = new Date().toISOString();
    }

    const { data: test, error } = await supabaseAdmin
      .from("ab_tests")
      .update(validatedData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: user.id,
      action: "updated_ab_test",
      target_type: "ab_test",
      target_id: test.id,
      metadata: { changes: validatedData }
    });

    return NextResponse.json({ test });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ab-tests/[id] - Delete test
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Don't allow deletion of active tests
  const { data: test } = await supabaseAdmin
    .from("ab_tests")
    .select("status")
    .eq("id", params.id)
    .single();

  if (test?.status === 'active') {
    return NextResponse.json(
      { error: "Cannot delete active test. Pause it first." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("ab_tests")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin action
  await supabaseAdmin.from("admin_actions").insert({
    admin_id: user.id,
    action: "deleted_ab_test",
    target_type: "ab_test",
    target_id: params.id,
    metadata: {}
  });

  return NextResponse.json({ success: true });
}
