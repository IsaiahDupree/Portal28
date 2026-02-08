import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const approveSchema = z.object({
  payout_request_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
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

    // Check admin role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || !userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Parse and validate request
    const body = await request.json();
    const validated = approveSchema.parse(body);

    // Call the approve function
    const { data, error } = await supabase.rpc("approve_payout_request", {
      p_payout_request_id: validated.payout_request_id,
      p_admin_user_id: user.id,
    });

    if (error) {
      console.error("Error approving payout:", error);
      return NextResponse.json(
        { error: error.message || "Failed to approve payout" },
        { status: 400 }
      );
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      action: "affiliate_payout_approved",
      resource_type: "affiliate_payout_request",
      resource_id: validated.payout_request_id,
    });

    return NextResponse.json({
      success: true,
      message: "Payout request approved",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Error approving payout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
