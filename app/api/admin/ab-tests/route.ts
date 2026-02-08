import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

// Schema for creating an A/B test
const createABTestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  test_type: z.enum(['pricing', 'landing_page', 'checkout', 'offer', 'email']),
  target_entity_type: z.string().optional(),
  target_entity_id: z.string().uuid().optional(),
  traffic_allocation: z.number().min(0).max(100).default(100),
  variants: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    is_control: z.boolean().default(false),
    traffic_weight: z.number().min(0).max(100),
    config: z.record(z.any()).default({})
  })).min(2) // At least 2 variants required
});

// GET /api/admin/ab-tests - List all A/B tests
export async function GET(req: NextRequest) {
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

  // Get query params for filtering
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const testType = searchParams.get('test_type');

  let query = supabaseAdmin
    .from("ab_tests")
    .select(`
      *,
      variants:ab_test_variants(*)
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (testType) {
    query = query.eq('test_type', testType);
  }

  const { data: tests, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tests });
}

// POST /api/admin/ab-tests - Create new A/B test
export async function POST(req: NextRequest) {
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
    const validatedData = createABTestSchema.parse(body);

    // Validate that traffic weights sum to 100
    const totalWeight = validatedData.variants.reduce((sum, v) => sum + v.traffic_weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: "Variant traffic weights must sum to 100" },
        { status: 400 }
      );
    }

    // Validate that exactly one variant is control
    const controlCount = validatedData.variants.filter(v => v.is_control).length;
    if (controlCount !== 1) {
      return NextResponse.json(
        { error: "Exactly one variant must be marked as control" },
        { status: 400 }
      );
    }

    // Create the test
    const { data: test, error: testError } = await supabaseAdmin
      .from("ab_tests")
      .insert({
        name: validatedData.name,
        description: validatedData.description,
        hypothesis: validatedData.hypothesis,
        test_type: validatedData.test_type,
        target_entity_type: validatedData.target_entity_type,
        target_entity_id: validatedData.target_entity_id,
        traffic_allocation: validatedData.traffic_allocation,
        status: 'draft',
        created_by: user.id
      })
      .select()
      .single();

    if (testError) {
      return NextResponse.json({ error: testError.message }, { status: 500 });
    }

    // Create variants
    const variantsToInsert = validatedData.variants.map(v => ({
      test_id: test.id,
      name: v.name,
      description: v.description,
      is_control: v.is_control,
      traffic_weight: v.traffic_weight,
      config: v.config
    }));

    const { data: variants, error: variantsError } = await supabaseAdmin
      .from("ab_test_variants")
      .insert(variantsToInsert)
      .select();

    if (variantsError) {
      // Rollback test creation
      await supabaseAdmin.from("ab_tests").delete().eq("id", test.id);
      return NextResponse.json({ error: variantsError.message }, { status: 500 });
    }

    // Log admin action
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: user.id,
      action: "created_ab_test",
      target_type: "ab_test",
      target_id: test.id,
      metadata: { name: test.name, test_type: test.test_type }
    });

    return NextResponse.json({ test: { ...test, variants } }, { status: 201 });
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
