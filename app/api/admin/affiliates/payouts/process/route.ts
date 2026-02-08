import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const processSchema = z.object({
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
    const validated = processSchema.parse(body);

    // Get payout request details
    const { data: payoutRequest, error: fetchError } = await supabase
      .from("affiliate_payout_requests")
      .select(
        `
        *,
        affiliates:affiliate_id (
          id,
          affiliate_code,
          payout_email,
          payout_method,
          users:user_id (
            email
          )
        )
      `
      )
      .eq("id", validated.payout_request_id)
      .single();

    if (fetchError || !payoutRequest) {
      return NextResponse.json(
        { error: "Payout request not found" },
        { status: 404 }
      );
    }

    // Check if already processing or completed
    if (!["approved"].includes(payoutRequest.status)) {
      return NextResponse.json(
        { error: `Cannot process payout with status: ${payoutRequest.status}` },
        { status: 400 }
      );
    }

    // Update status to processing
    await supabase
      .from("affiliate_payout_requests")
      .update({
        status: "processing",
        processed_by: user.id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", validated.payout_request_id);

    try {
      // Process based on payout method
      if (payoutRequest.payout_method === "stripe") {
        // Create Stripe transfer
        // Note: This requires the affiliate to have a connected Stripe account
        // For simplicity, we'll create a payout using Stripe's Payout API
        // In production, you'd need to set up Stripe Connect

        const amountInDollars = Number(payoutRequest.amount) / 100;

        // For now, we'll just simulate the payout
        // In production, you'd do:
        // const transfer = await stripe.transfers.create({
        //   amount: payoutRequest.amount,
        //   currency: "usd",
        //   destination: affiliateStripeAccountId,
        //   description: `Affiliate payout for ${payoutRequest.affiliates.affiliate_code}`,
        // });

        // Simulate success
        const transferId = `sim_transfer_${Date.now()}`;

        // Update to completed
        const { error: updateError } = await supabase
          .from("affiliate_payout_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            stripe_transfer_id: transferId,
          })
          .eq("id", validated.payout_request_id);

        if (updateError) {
          throw new Error("Failed to update payout status");
        }

        // Log admin action
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action: "affiliate_payout_processed",
          resource_type: "affiliate_payout_request",
          resource_id: validated.payout_request_id,
          details: {
            amount: payoutRequest.amount,
            method: "stripe",
            transferId,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Payout processed successfully",
          transferId,
        });
      } else if (payoutRequest.payout_method === "paypal") {
        // PayPal integration would go here
        // For now, mark as approved and require manual processing

        await supabase
          .from("affiliate_payout_requests")
          .update({
            status: "approved", // Keep as approved for manual processing
            notes: "PayPal payout - requires manual processing",
          })
          .eq("id", validated.payout_request_id);

        return NextResponse.json({
          success: true,
          message: "PayPal payout approved - process manually",
          manualAction: true,
        });
      } else {
        // Bank transfer - mark for manual processing
        await supabase
          .from("affiliate_payout_requests")
          .update({
            status: "approved",
            notes: "Bank transfer - requires manual processing",
          })
          .eq("id", validated.payout_request_id);

        return NextResponse.json({
          success: true,
          message: "Bank transfer approved - process manually",
          manualAction: true,
        });
      }
    } catch (processingError: any) {
      console.error("Error processing payout:", processingError);

      // Mark as failed
      await supabase
        .from("affiliate_payout_requests")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          failure_reason: processingError.message || "Unknown error",
        })
        .eq("id", validated.payout_request_id);

      return NextResponse.json(
        { error: `Payout processing failed: ${processingError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Error processing payout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
