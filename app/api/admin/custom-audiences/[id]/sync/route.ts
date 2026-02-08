/**
 * Sync Custom Audience to Meta
 * META-007: Sync audience user data to Meta
 *
 * POST /api/admin/custom-audiences/[id]/sync - Sync audience users to Meta
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { addUsersToAudience } from "@/lib/meta/customAudiences";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const audienceId = params.id;

  try {
    // Get audience from database
    const { data: audience, error: audienceError } = await supabase
      .from("custom_audiences")
      .select("*")
      .eq("id", audienceId)
      .single();

    if (audienceError || !audience) {
      return NextResponse.json(
        { error: "Audience not found" },
        { status: 404 }
      );
    }

    if (!audience.meta_audience_id) {
      return NextResponse.json(
        { error: "Audience not yet created in Meta. Create it first." },
        { status: 400 }
      );
    }

    // Update sync status to 'syncing'
    await supabase
      .from("custom_audiences")
      .update({ sync_status: "syncing" })
      .eq("id", audienceId);

    // Log sync start
    const { data: syncLog } = await supabase
      .from("custom_audience_sync_history")
      .insert({
        audience_id: audienceId,
        status: "started",
      })
      .select()
      .single();

    // Fetch user emails based on audience type using the SQL function
    const { data: userEmails, error: emailError } = await supabase.rpc(
      "get_audience_user_emails",
      {
        audience_uuid: audienceId,
      }
    );

    if (emailError) {
      console.error("Failed to fetch user emails:", emailError);

      // Update status to error
      await supabase
        .from("custom_audiences")
        .update({
          sync_status: "error",
          sync_error: emailError.message,
        })
        .eq("id", audienceId);

      if (syncLog) {
        await supabase
          .from("custom_audience_sync_history")
          .update({
            status: "error",
            error_message: emailError.message,
            sync_completed_at: new Date().toISOString(),
          })
          .eq("id", syncLog.id);
      }

      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    // Extract email strings from result
    const emails = userEmails?.map((row: any) => row.email).filter(Boolean) || [];

    if (emails.length === 0) {
      await supabase
        .from("custom_audiences")
        .update({
          sync_status: "success",
          last_sync_at: new Date().toISOString(),
          user_count: 0,
        })
        .eq("id", audienceId);

      if (syncLog) {
        await supabase
          .from("custom_audience_sync_history")
          .update({
            status: "success",
            users_sent: 0,
            sync_completed_at: new Date().toISOString(),
          })
          .eq("id", syncLog.id);
      }

      return NextResponse.json({
        message: "No users to sync",
        users_sent: 0,
      });
    }

    // Send to Meta
    let usersSent = 0;
    let syncError: string | null = null;

    try {
      usersSent = await addUsersToAudience({
        audienceId: audience.meta_audience_id,
        emails,
      });

      // Update audience status to success
      await supabase
        .from("custom_audiences")
        .update({
          sync_status: "success",
          last_sync_at: new Date().toISOString(),
          user_count: usersSent,
          sync_error: null,
        })
        .eq("id", audienceId);

      // Update sync log
      if (syncLog) {
        await supabase
          .from("custom_audience_sync_history")
          .update({
            status: "success",
            users_sent: usersSent,
            sync_completed_at: new Date().toISOString(),
          })
          .eq("id", syncLog.id);
      }
    } catch (metaError: any) {
      console.error("Failed to sync to Meta:", metaError);
      syncError = metaError.message;

      // Update audience status to error
      await supabase
        .from("custom_audiences")
        .update({
          sync_status: "error",
          sync_error: syncError,
        })
        .eq("id", audienceId);

      // Update sync log
      if (syncLog) {
        await supabase
          .from("custom_audience_sync_history")
          .update({
            status: "error",
            error_message: syncError,
            users_sent: emails.length,
            sync_completed_at: new Date().toISOString(),
          })
          .eq("id", syncLog.id);
      }

      return NextResponse.json({ error: syncError }, { status: 500 });
    }

    return NextResponse.json({
      message: "Sync completed successfully",
      users_sent: usersSent,
      audience: {
        id: audience.id,
        name: audience.name,
        user_count: usersSent,
      },
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
