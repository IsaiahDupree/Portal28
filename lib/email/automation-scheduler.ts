import { supabaseAdmin } from "@/lib/supabase/admin";
import { getResend } from "./resend";

interface AutomationEnrollment {
  id: string;
  automation_id: string;
  email: string;
  user_id: string | null;
  current_step: number;
  status: string;
  next_step_at: string | null;
  enrolled_at: string;
}

interface AutomationStep {
  id: string;
  automation_id: string;
  step_order: number;
  delay_value: number;
  delay_unit: string;
  subject: string;
  preview_text: string | null;
  html_content: string;
  plain_text: string | null;
  status: string;
}

/**
 * Run automation scheduler - sends due emails from drip sequences
 * Should be called via cron job
 */
export async function runAutomationScheduler(): Promise<{
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

  // Find all active enrollments with next_step_at <= now
  const { data: dueEnrollments, error: fetchError } = await supabaseAdmin
    .from("automation_enrollments")
    .select("*")
    .eq("status", "active")
    .lte("next_step_at", now.toISOString())
    .order("next_step_at", { ascending: true });

  if (fetchError) {
    errors.push(`Failed to fetch due enrollments: ${fetchError.message}`);
    return { processed, sent, failed, errors };
  }

  if (!dueEnrollments || dueEnrollments.length === 0) {
    return { processed, sent, failed, errors };
  }

  for (const enrollment of dueEnrollments as AutomationEnrollment[]) {
    processed++;

    try {
      // Get the automation steps
      const { data: steps, error: stepsError } = await supabaseAdmin
        .from("automation_steps")
        .select("*")
        .eq("automation_id", enrollment.automation_id)
        .eq("status", "active")
        .order("step_order", { ascending: true });

      if (stepsError || !steps || steps.length === 0) {
        errors.push(`Enrollment ${enrollment.id}: No active steps found`);
        // Mark as completed if no more steps
        await supabaseAdmin
          .from("automation_enrollments")
          .update({
            status: "completed",
            completed_at: now.toISOString()
          })
          .eq("id", enrollment.id);
        continue;
      }

      // Find the next step to send
      const nextStep = (steps as AutomationStep[]).find(
        (s) => s.step_order === enrollment.current_step
      );

      if (!nextStep) {
        // No more steps, mark as completed
        await supabaseAdmin
          .from("automation_enrollments")
          .update({
            status: "completed",
            completed_at: now.toISOString()
          })
          .eq("id", enrollment.id);
        continue;
      }

      // Check if this email was already sent (idempotency check)
      const { data: existingSend } = await supabaseAdmin
        .from("email_sends")
        .select("id")
        .eq("email", enrollment.email)
        .eq("template", `automation_${enrollment.automation_id}_step_${nextStep.id}`)
        .eq("status", "sent")
        .single();

      if (existingSend) {
        // Already sent, move to next step
        await advanceEnrollment(enrollment, steps as AutomationStep[]);
        continue;
      }

      // Send the email
      const sendResult = await sendAutomationEmail(enrollment, nextStep);

      if (sendResult.success) {
        // Log email send
        await supabaseAdmin.from("email_sends").insert({
          email: enrollment.email,
          user_id: enrollment.user_id,
          template: `automation_${enrollment.automation_id}_step_${nextStep.id}`,
          resend_id: sendResult.resendId,
          status: "sent",
          metadata: {
            automation_id: enrollment.automation_id,
            step_id: nextStep.id,
            step_order: nextStep.step_order,
            subject: nextStep.subject
          }
        });

        // Advance to next step
        await advanceEnrollment(enrollment, steps as AutomationStep[]);
        sent++;
      } else {
        errors.push(`Enrollment ${enrollment.id}: ${sendResult.error}`);
        failed++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Enrollment ${enrollment.id}: ${message}`);
      failed++;
    }
  }

  return { processed, sent, failed, errors };
}

/**
 * Calculate the next step time based on delay
 */
function calculateNextStepAt(
  baseTime: Date,
  delayValue: number,
  delayUnit: string
): Date {
  const nextTime = new Date(baseTime);

  switch (delayUnit) {
    case "minutes":
      nextTime.setMinutes(nextTime.getMinutes() + delayValue);
      break;
    case "hours":
      nextTime.setHours(nextTime.getHours() + delayValue);
      break;
    case "days":
      nextTime.setDate(nextTime.getDate() + delayValue);
      break;
    case "weeks":
      nextTime.setDate(nextTime.getDate() + delayValue * 7);
      break;
    default:
      // Default to days
      nextTime.setDate(nextTime.getDate() + delayValue);
  }

  return nextTime;
}

/**
 * Advance enrollment to next step
 */
async function advanceEnrollment(
  enrollment: AutomationEnrollment,
  steps: AutomationStep[]
): Promise<void> {
  const currentStepIndex = steps.findIndex((s) => s.step_order === enrollment.current_step);
  const nextStepIndex = currentStepIndex + 1;

  if (nextStepIndex >= steps.length) {
    // No more steps, mark as completed
    await supabaseAdmin
      .from("automation_enrollments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        next_step_at: null
      })
      .eq("id", enrollment.id);
    return;
  }

  const nextStep = steps[nextStepIndex];
  const nextStepAt = calculateNextStepAt(
    new Date(),
    nextStep.delay_value,
    nextStep.delay_unit
  );

  await supabaseAdmin
    .from("automation_enrollments")
    .update({
      current_step: nextStep.step_order,
      next_step_at: nextStepAt.toISOString()
    })
    .eq("id", enrollment.id);
}

/**
 * Send automation email via Resend
 */
async function sendAutomationEmail(
  enrollment: AutomationEnrollment,
  step: AutomationStep
): Promise<{ success: boolean; resendId?: string; error?: string }> {
  try {
    const resend = getResend();
    const fromEmail = process.env.RESEND_FROM || "noreply@portal28.com";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: enrollment.email,
      subject: step.subject,
      html: step.html_content,
      ...(step.plain_text && { text: step.plain_text }),
      ...(step.preview_text && { headers: { "X-Preview-Text": step.preview_text } })
    });

    if (error) {
      return { success: false, error: JSON.stringify(error) };
    }

    return { success: true, resendId: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Send failed"
    };
  }
}

/**
 * Enroll a user in an automation
 */
export async function enrollInAutomation(
  automationId: string,
  email: string,
  userId?: string | null,
  triggerData?: Record<string, unknown>
): Promise<{ success: boolean; enrollmentId?: string; error?: string }> {
  try {
    // Check if already enrolled
    const { data: existing } = await supabaseAdmin
      .from("automation_enrollments")
      .select("id, status")
      .eq("automation_id", automationId)
      .eq("email", email)
      .single();

    if (existing) {
      // If completed, re-enroll; if active, skip
      if (existing.status === "active") {
        return { success: true, enrollmentId: existing.id };
      }
    }

    // Get the first step
    const { data: steps } = await supabaseAdmin
      .from("automation_steps")
      .select("*")
      .eq("automation_id", automationId)
      .eq("status", "active")
      .order("step_order", { ascending: true })
      .limit(1);

    if (!steps || steps.length === 0) {
      return { success: false, error: "No active steps in automation" };
    }

    const firstStep = steps[0] as AutomationStep;

    // Calculate when to send first email
    const nextStepAt = calculateNextStepAt(
      new Date(),
      firstStep.delay_value,
      firstStep.delay_unit
    );

    // Create or update enrollment
    const { data: enrollment, error } = await supabaseAdmin
      .from("automation_enrollments")
      .upsert(
        {
          automation_id: automationId,
          email,
          user_id: userId || null,
          current_step: firstStep.step_order,
          status: "active",
          next_step_at: nextStepAt.toISOString(),
          trigger_data: triggerData || {},
          enrolled_at: new Date().toISOString()
        },
        { onConflict: "automation_id,email" }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, enrollmentId: enrollment.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Enrollment failed"
    };
  }
}
