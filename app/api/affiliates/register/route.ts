import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  payout_email: z.string().email().optional(),
  payout_method: z.enum(["stripe", "paypal", "bank"]).optional(),
});

/**
 * POST /api/affiliates/register
 * Register current user as an affiliate
 */
export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = RegisterSchema.parse(body);

    // Check if user is already an affiliate
    const { data: existing } = await supabase
      .from("affiliates")
      .select("id, status, affiliate_code")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: "Already registered",
          affiliate: existing,
        },
        { status: 400 }
      );
    }

    // Generate unique affiliate code
    const { data: codeData, error: codeError } = await supabase.rpc(
      "generate_affiliate_code",
      { user_email: user.email }
    );

    if (codeError || !codeData) {
      console.error("Error generating affiliate code:", codeError);
      return NextResponse.json(
        { error: "Failed to generate affiliate code" },
        { status: 500 }
      );
    }

    // Create affiliate record
    const { data: affiliate, error: insertError } = await supabase
      .from("affiliates")
      .insert({
        user_id: user.id,
        affiliate_code: codeData,
        status: "pending", // Requires approval
        payout_email: validatedData.payout_email || user.email,
        payout_method: validatedData.payout_method || "stripe",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating affiliate:", insertError);
      return NextResponse.json(
        { error: "Failed to create affiliate account" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      affiliate,
    });
  } catch (error) {
    console.error("Affiliate registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
