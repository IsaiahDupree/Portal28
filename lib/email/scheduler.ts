import { supabaseAdmin } from "@/lib/supabase/admin";
import { resend } from "./resend";
import { parseScheduleText, getNextRunTime } from "./schedule-parser";

interface EmailProgram {
  id: string;
  name: string;
  type: "broadcast" | "transactional";
  status: string;
  schedule_text: string | null;
  schedule_cron: string | null;
  timezone: string;
  audience_type: string;
  audience_filter_json: Record<string, unknown>;
  current_version_id: string | null;
  next_run_at: string | null;
}

interface EmailVersion {
  id: string;
  subject: string;
  preview_text: string | null;
  html_content: string;
  plain_text: string | null;
  status: string;
}

export async function runScheduler(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let processed = 0;
  let sent = 0;
  let failed = 0;

  // Find all active programs with next_run_at <= now
  const { data: duePrograms, error: fetchError } = await supabaseAdmin
    .from("email_programs")
    .select("*")
    .eq("status", "active")
    .lte("next_run_at", now.toISOString())
    .order("next_run_at", { ascending: true });

  if (fetchError) {
    errors.push(`Failed to fetch due programs: ${fetchError.message}`);
    return { processed, sent, failed, errors };
  }

  if (!duePrograms || duePrograms.length === 0) {
    return { processed, sent, failed, errors };
  }

  for (const program of duePrograms as EmailProgram[]) {
    processed++;

    try {
      // Get the current approved version
      if (!program.current_version_id) {
        errors.push(`Program ${program.id} has no current version`);
        failed++;
        continue;
      }

      const { data: version, error: versionError } = await supabaseAdmin
        .from("email_versions")
        .select("*")
        .eq("id", program.current_version_id)
        .eq("status", "approved")
        .single();

      if (versionError || !version) {
        errors.push(`Program ${program.id}: No approved version found`);
        failed++;
        continue;
      }

      // Get audience
      const recipients = await getAudienceEmails(program);
      
      if (recipients.length === 0) {
        errors.push(`Program ${program.id}: No recipients found`);
        // Still update next_run_at
        await updateNextRunAt(program);
        continue;
      }

      // Create a run record
      const { data: run, error: runError } = await supabaseAdmin
        .from("email_runs")
        .insert({
          program_id: program.id,
          version_id: version.id,
          status: "sending",
          scheduled_for: program.next_run_at,
          started_at: now.toISOString(),
          recipient_count: recipients.length,
          audience_snapshot: { emails: recipients.slice(0, 10), total: recipients.length }
        })
        .select()
        .single();

      if (runError) {
        errors.push(`Program ${program.id}: Failed to create run record`);
        failed++;
        continue;
      }

      // Send via Resend
      const sendResult = await sendProgramEmail(program, version as EmailVersion, recipients);

      if (sendResult.success) {
        // Update run as sent
        await supabaseAdmin
          .from("email_runs")
          .update({
            status: "sent",
            completed_at: new Date().toISOString(),
            resend_id: sendResult.resendId
          })
          .eq("id", run.id);

        sent++;
      } else {
        // Update run as failed
        await supabaseAdmin
          .from("email_runs")
          .update({
            status: "failed",
            error_message: sendResult.error,
            completed_at: new Date().toISOString()
          })
          .eq("id", run.id);

        errors.push(`Program ${program.id}: ${sendResult.error}`);
        failed++;
      }

      // Update next_run_at for the program
      await updateNextRunAt(program);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Program ${program.id}: ${message}`);
      failed++;
    }
  }

  return { processed, sent, failed, errors };
}

async function getAudienceEmails(program: EmailProgram): Promise<string[]> {
  let query = supabaseAdmin
    .from("email_contacts")
    .select("email")
    .eq("unsubscribed", false)
    .eq("suppressed", false);

  switch (program.audience_type) {
    case "leads":
      query = query.eq("is_customer", false);
      break;
    case "customers":
      query = query.eq("is_customer", true);
      break;
    case "segment":
      // Apply custom filters from audience_filter_json
      const filters = program.audience_filter_json;
      if (filters.utm_campaign) {
        query = query.eq("utm_campaign", filters.utm_campaign);
      }
      if (filters.source) {
        query = query.eq("source", filters.source);
      }
      break;
    // 'all' - no additional filters
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((r) => r.email);
}

async function sendProgramEmail(
  program: EmailProgram,
  version: EmailVersion,
  recipients: string[]
): Promise<{ success: boolean; resendId?: string; error?: string }> {
  try {
    if (program.type === "broadcast") {
      // Use Resend Broadcast API for marketing emails
      // Note: Resend Broadcast requires an audience ID
      // For MVP, we'll send as batch transactional with proper headers
      const { data, error } = await resend.batch.send(
        recipients.slice(0, 100).map((email) => ({
          from: process.env.RESEND_FROM!,
          to: email,
          subject: version.subject,
          html: version.html_content.replace(
            "{{{RESEND_UNSUBSCRIBE_URL}}}",
            `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe?email=${encodeURIComponent(email)}`
          )
        }))
      );

      if (error) {
        return { success: false, error: JSON.stringify(error) };
      }

      return { success: true, resendId: data?.data?.[0]?.id };
    } else {
      // Transactional - send individually or batch
      const { data, error } = await resend.batch.send(
        recipients.slice(0, 100).map((email) => ({
          from: process.env.RESEND_FROM!,
          to: email,
          subject: version.subject,
          html: version.html_content
        }))
      );

      if (error) {
        return { success: false, error: JSON.stringify(error) };
      }

      return { success: true, resendId: data?.data?.[0]?.id };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Send failed"
    };
  }
}

async function updateNextRunAt(program: EmailProgram): Promise<void> {
  if (!program.schedule_text && !program.schedule_cron) {
    // One-time send, mark as paused
    await supabaseAdmin
      .from("email_programs")
      .update({ status: "paused", last_run_at: new Date().toISOString() })
      .eq("id", program.id);
    return;
  }

  const nextRun = getNextRunTime(
    program.schedule_text || program.schedule_cron || "",
    program.timezone
  );

  await supabaseAdmin
    .from("email_programs")
    .update({
      next_run_at: nextRun.toISOString(),
      last_run_at: new Date().toISOString()
    })
    .eq("id", program.id);
}
