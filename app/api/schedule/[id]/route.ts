import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  scheduledFor: z.string().datetime().optional(),
  timezone: z.string().optional(),
  autoPublish: z.boolean().optional(),
  publishAction: z.record(z.any()).optional(),
  status: z.enum(["pending", "cancelled"]).optional(),
});

/**
 * GET /api/schedule/[id]
 * Get specific scheduled content
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("scheduled_content")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/schedule/[id]
 * Update scheduled content (reschedule or cancel)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  const body = await request.json();
  const validation = updateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.issues },
      { status: 400 }
    );
  }

  // Check existing schedule
  const { data: existing } = await supabase
    .from("scheduled_content")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  // Only pending schedules can be updated
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Can only update pending schedules" },
      { status: 400 }
    );
  }

  // Update schedule
  const updates: any = {};

  if (validation.data.scheduledFor) {
    updates.scheduled_for = validation.data.scheduledFor;
  }

  if (validation.data.timezone) {
    updates.timezone = validation.data.timezone;
  }

  if (validation.data.autoPublish !== undefined) {
    updates.auto_publish = validation.data.autoPublish;
  }

  if (validation.data.publishAction) {
    updates.publish_action = validation.data.publishAction;
  }

  if (validation.data.status) {
    updates.status = validation.data.status;
  }

  const { data, error } = await supabase
    .from("scheduled_content")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/schedule/[id]
 * Cancel/delete scheduled content
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check existing schedule
  const { data: existing } = await supabase
    .from("scheduled_content")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  // Only pending schedules can be deleted
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Can only delete pending schedules" },
      { status: 400 }
    );
  }

  // Mark as cancelled instead of deleting
  const { error } = await supabase
    .from("scheduled_content")
    .update({ status: "cancelled" })
    .eq("id", params.id);

  if (error) {
    console.error("Error cancelling schedule:", error);
    return NextResponse.json({ error: "Failed to cancel schedule" }, { status: 500 });
  }

  return NextResponse.json({ message: "Schedule cancelled successfully" });
}
