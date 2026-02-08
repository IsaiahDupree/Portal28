/**
 * Tests for Onboarding Email Automation (feat-079)
 * Test IDs: GRO-ONB-001 through GRO-ONB-004
 */

import { enrollInAutomation, runAutomationScheduler } from "@/lib/email/automation-scheduler";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Mock Resend
jest.mock("@/lib/email/resend", () => ({
  getResend: () => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: "test-email-id" }, error: null })
    }
  })
}));

describe("Onboarding Email Automation (feat-079)", () => {
  const testEmail = `test-onboarding-${Date.now()}@example.com`;
  const automationId = "a0000000-0000-0000-0000-000000000001"; // From migration

  beforeAll(async () => {
    // Ensure onboarding automation exists
    const { error } = await supabaseAdmin
      .from("email_automations")
      .upsert({
        id: automationId,
        name: "Customer Onboarding Sequence",
        description: "Automated email sequence for new customers",
        status: "active",
        trigger_event: "purchase_completed",
        trigger_filter_json: {},
        prompt_base: "Keep it warm and friendly"
      }, { onConflict: "id" });

    if (error) {
      console.error("Error creating automation:", error);
    }

    // Ensure at least one step exists
    const { error: stepError } = await supabaseAdmin
      .from("automation_steps")
      .upsert({
        id: "b0000000-0000-0000-0000-000000000001",
        automation_id: automationId,
        step_order: 0,
        delay_value: 0,
        delay_unit: "minutes",
        subject: "Welcome to Portal28 Academy!",
        preview_text: "Your journey starts now",
        html_content: "<h1>Welcome!</h1>",
        plain_text: "Welcome!",
        status: "active"
      }, { onConflict: "id" });

    if (stepError) {
      console.error("Error creating step:", stepError);
    }
  });

  afterEach(async () => {
    // Clean up test enrollments
    await supabaseAdmin
      .from("automation_enrollments")
      .delete()
      .eq("email", testEmail);

    await supabaseAdmin
      .from("email_sends")
      .delete()
      .eq("email", testEmail);
  });

  describe("GRO-ONB-001: Automation triggers on purchase", () => {
    it("should enroll user in onboarding automation after purchase", async () => {
      const result = await enrollInAutomation(
        automationId,
        testEmail,
        null,
        { purchase_date: new Date().toISOString() }
      );

      expect(result.success).toBe(true);
      expect(result.enrollmentId).toBeDefined();

      // Verify enrollment was created
      const { data: enrollment } = await supabaseAdmin
        .from("automation_enrollments")
        .select("*")
        .eq("automation_id", automationId)
        .eq("email", testEmail)
        .single();

      expect(enrollment).toBeDefined();
      expect(enrollment.status).toBe("active");
      expect(enrollment.current_step).toBe(0);
      expect(enrollment.next_step_at).toBeDefined();
    });

    it("should not duplicate enrollment if already enrolled", async () => {
      // Enroll first time
      const result1 = await enrollInAutomation(automationId, testEmail);
      expect(result1.success).toBe(true);

      // Try to enroll again
      const result2 = await enrollInAutomation(automationId, testEmail);
      expect(result2.success).toBe(true);
      expect(result2.enrollmentId).toBe(result1.enrollmentId);

      // Verify only one enrollment exists
      const { data: enrollments } = await supabaseAdmin
        .from("automation_enrollments")
        .select("*")
        .eq("automation_id", automationId)
        .eq("email", testEmail);

      expect(enrollments).toHaveLength(1);
    });
  });

  describe("GRO-ONB-002: Welcome email sent immediately", () => {
    it("should schedule welcome email with 0 minute delay", async () => {
      const result = await enrollInAutomation(automationId, testEmail);
      expect(result.success).toBe(true);

      const { data: enrollment } = await supabaseAdmin
        .from("automation_enrollments")
        .select("next_step_at")
        .eq("email", testEmail)
        .single();

      expect(enrollment).toBeDefined();

      // next_step_at should be approximately now (within 1 minute)
      const nextStepAt = new Date(enrollment.next_step_at);
      const now = new Date();
      const diffMinutes = Math.abs(nextStepAt.getTime() - now.getTime()) / (1000 * 60);

      expect(diffMinutes).toBeLessThan(1);
    });

    it("should send welcome email when scheduler runs", async () => {
      // Enroll with immediate delivery
      await enrollInAutomation(automationId, testEmail);

      // Run scheduler
      const result = await runAutomationScheduler();

      expect(result.processed).toBeGreaterThanOrEqual(1);
      expect(result.sent).toBeGreaterThanOrEqual(1);
      expect(result.failed).toBe(0);

      // Verify email send was logged
      const { data: emailSend } = await supabaseAdmin
        .from("email_sends")
        .select("*")
        .eq("email", testEmail)
        .eq("status", "sent")
        .single();

      expect(emailSend).toBeDefined();
      expect(emailSend.template).toContain("automation");
    });
  });

  describe("GRO-ONB-003: Check-ins sent on schedule", () => {
    it("should calculate correct next_step_at for delayed emails", async () => {
      // Create a step with 3 day delay
      const step2Id = "b0000000-0000-0000-0000-000000000002";
      await supabaseAdmin
        .from("automation_steps")
        .upsert({
          id: step2Id,
          automation_id: automationId,
          step_order: 1,
          delay_value: 3,
          delay_unit: "days",
          subject: "3 Day Check-in",
          html_content: "<p>Check-in</p>",
          status: "active"
        }, { onConflict: "id" });

      // Enroll and send first email
      await enrollInAutomation(automationId, testEmail);
      await runAutomationScheduler();

      // Check enrollment was advanced to next step
      const { data: enrollment } = await supabaseAdmin
        .from("automation_enrollments")
        .select("current_step, next_step_at")
        .eq("email", testEmail)
        .single();

      expect(enrollment.current_step).toBe(1);

      // Verify next_step_at is approximately 3 days from now
      const nextStepAt = new Date(enrollment.next_step_at);
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const diffHours = Math.abs(nextStepAt.getTime() - threeDaysFromNow.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeLessThan(1); // Within 1 hour tolerance
    });

    it("should not send email before scheduled time", async () => {
      // Create a step with future delay
      await supabaseAdmin
        .from("automation_steps")
        .upsert({
          id: "b0000000-0000-0000-0000-000000000099",
          automation_id: automationId,
          step_order: 0,
          delay_value: 7,
          delay_unit: "days",
          subject: "Future Email",
          html_content: "<p>Test</p>",
          status: "active"
        }, { onConflict: "id" });

      await enrollInAutomation(automationId, testEmail);

      // Run scheduler (should not send because step is scheduled for future)
      const result = await runAutomationScheduler();

      // Verify email was not sent
      const { data: emailSend } = await supabaseAdmin
        .from("email_sends")
        .select("*")
        .eq("email", testEmail);

      expect(emailSend || []).toHaveLength(0);
    });
  });

  describe("GRO-ONB-004: Completion nudges work", () => {
    it("should complete enrollment after all steps sent", async () => {
      // Ensure only one step exists
      await supabaseAdmin
        .from("automation_steps")
        .delete()
        .eq("automation_id", automationId)
        .neq("id", "b0000000-0000-0000-0000-000000000001");

      // Enroll and send
      await enrollInAutomation(automationId, testEmail);
      await runAutomationScheduler();

      // Check enrollment is completed
      const { data: enrollment } = await supabaseAdmin
        .from("automation_enrollments")
        .select("status, completed_at")
        .eq("email", testEmail)
        .single();

      expect(enrollment.status).toBe("completed");
      expect(enrollment.completed_at).toBeDefined();
    });

    it("should not send duplicate emails on scheduler re-run", async () => {
      await enrollInAutomation(automationId, testEmail);

      // Run scheduler twice
      await runAutomationScheduler();
      await runAutomationScheduler();

      // Verify only one email was sent
      const { data: emailSends } = await supabaseAdmin
        .from("email_sends")
        .select("*")
        .eq("email", testEmail);

      expect(emailSends).toHaveLength(1);
    });
  });

  describe("Integration with Stripe webhook", () => {
    it("should have onboarding automation in database", async () => {
      const { data, error } = await supabaseAdmin
        .from("email_automations")
        .select("*")
        .eq("trigger_event", "purchase_completed")
        .eq("status", "active")
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toContain("Onboarding");
    });

    it("should have all 4 onboarding steps", async () => {
      const { data: steps } = await supabaseAdmin
        .from("automation_steps")
        .select("*")
        .eq("automation_id", automationId)
        .eq("status", "active")
        .order("step_order");

      expect(steps).toHaveLength(4);
      expect(steps[0].step_order).toBe(0);
      expect(steps[1].step_order).toBe(1);
      expect(steps[2].step_order).toBe(2);
      expect(steps[3].step_order).toBe(3);

      // Verify delays
      expect(steps[0].delay_value).toBe(0);
      expect(steps[1].delay_value).toBe(3);
      expect(steps[2].delay_value).toBe(7);
      expect(steps[3].delay_value).toBe(14);
    });
  });
});
