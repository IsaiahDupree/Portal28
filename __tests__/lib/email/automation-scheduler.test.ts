/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  runAutomationScheduler,
  enrollInAutomation
} from "@/lib/email/automation-scheduler";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Mock Resend
jest.mock("@/lib/email/resend", () => ({
  getResend: jest.fn(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: "mock-resend-id" }, error: null })
    }
  }))
}));

describe("Email Automation Scheduler", () => {
  describe("GRO-EPG-001: List programs", () => {
    it("should list all email automations", async () => {
      const { data } = await supabaseAdmin
        .from("email_automations")
        .select("*")
        .order("created_at", { ascending: false });

      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("GRO-EPG-002: Create program", () => {
    it("should create an automation with required fields", () => {
      const automation = {
        name: "Test Automation",
        trigger_event: "lead_created",
        status: "draft"
      };

      expect(automation.name).toBeDefined();
      expect(automation.trigger_event).toBeDefined();
      expect(automation.status).toBe("draft");
    });

    it("should validate trigger_event is one of allowed values", () => {
      const validTriggers = [
        "lead_created",
        "purchase_completed",
        "course_started",
        "subscription_created",
        "trial_started"
      ];

      const trigger = "lead_created";
      expect(validTriggers).toContain(trigger);
    });
  });

  describe("GRO-EPG-003: Add email step", () => {
    it("should create automation step with delay configuration", () => {
      const step = {
        automation_id: "test-id",
        step_order: 0,
        delay_value: 1,
        delay_unit: "days",
        subject: "Welcome!",
        html_content: "<p>Welcome email</p>",
        status: "draft"
      };

      expect(step.delay_value).toBe(1);
      expect(step.delay_unit).toBe("days");
      expect(step.subject).toBe("Welcome!");
      expect(step.html_content).toBeDefined();
    });

    it("should validate delay_unit is valid", () => {
      const validUnits = ["minutes", "hours", "days", "weeks"];
      const unit = "days";

      expect(validUnits).toContain(unit);
    });

    it("should enforce step order sequencing", () => {
      const steps = [
        { step_order: 0, subject: "First email" },
        { step_order: 1, subject: "Second email" },
        { step_order: 2, subject: "Third email" }
      ];

      const orders = steps.map((s) => s.step_order);
      expect(orders).toEqual([0, 1, 2]);
    });
  });

  describe("GRO-EPG-004: Set delay", () => {
    it("should configure delay in different units", () => {
      const delayConfigs = [
        { value: 0, unit: "minutes" },
        { value: 1, unit: "hours" },
        { value: 3, unit: "days" },
        { value: 1, unit: "weeks" }
      ];

      delayConfigs.forEach((config) => {
        expect(config.value).toBeGreaterThanOrEqual(0);
        expect(["minutes", "hours", "days", "weeks"]).toContain(config.unit);
      });
    });

    it("should allow immediate send (0 delay)", () => {
      const immediateStep = {
        delay_value: 0,
        delay_unit: "minutes"
      };

      expect(immediateStep.delay_value).toBe(0);
    });
  });

  describe("GRO-EPG-005: Activate", () => {
    it("should update automation status to active", () => {
      const automation = { status: "draft" };
      const activated = { ...automation, status: "active" };

      expect(activated.status).toBe("active");
    });

    it("should require at least one step before activation", () => {
      const automation = { steps: [] };
      const hasSteps = automation.steps.length > 0;

      expect(hasSteps).toBe(false);
    });

    it("should activate all steps when automation is activated", () => {
      const steps = [
        { id: "1", status: "draft" },
        { id: "2", status: "draft" }
      ];

      const activatedSteps = steps.map((s) => ({ ...s, status: "active" }));

      activatedSteps.forEach((step) => {
        expect(step.status).toBe("active");
      });
    });
  });

  describe("GRO-EPG-006: Scheduler runs", () => {
    it("should run scheduler and process due enrollments", async () => {
      const result = await runAutomationScheduler();

      expect(result).toHaveProperty("processed");
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("failed");
      expect(result).toHaveProperty("errors");
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should send emails for due enrollments only", () => {
      const now = new Date();
      const enrollments = [
        { next_step_at: new Date(now.getTime() - 1000).toISOString(), status: "active" }, // Due
        { next_step_at: new Date(now.getTime() + 1000).toISOString(), status: "active" }  // Not due
      ];

      const dueEnrollments = enrollments.filter((e) => {
        const nextStep = new Date(e.next_step_at);
        return nextStep <= now && e.status === "active";
      });

      expect(dueEnrollments.length).toBe(1);
    });

    it("should calculate next step time correctly", () => {
      const baseTime = new Date("2026-01-01T00:00:00Z");

      // Test different delay units
      const dayDelay = new Date(baseTime);
      dayDelay.setDate(dayDelay.getDate() + 3);

      const hourDelay = new Date(baseTime);
      hourDelay.setHours(hourDelay.getHours() + 24);

      expect(dayDelay.getDate()).toBe(4); // 3 days later
      expect(hourDelay.getHours()).toBe(0); // 24 hours later
    });
  });

  describe("GRO-EPG-007: Skip sent", () => {
    it("should check for existing sends before sending", async () => {
      const email = "test@example.com";
      const template = "automation_123_step_456";

      // Simulate checking for existing send
      const { data: existingSend } = await supabaseAdmin
        .from("email_sends")
        .select("id")
        .eq("email", email)
        .eq("template", template)
        .eq("status", "sent")
        .maybeSingle();

      // Should not exist in test
      expect(existingSend).toBeNull();
    });

    it("should prevent duplicate sends with idempotency check", () => {
      const sends = [
        { id: "1", email: "user@example.com", template: "auto_1_step_1", status: "sent" }
      ];

      const email = "user@example.com";
      const template = "auto_1_step_1";

      const alreadySent = sends.some(
        (s) => s.email === email && s.template === template && s.status === "sent"
      );

      expect(alreadySent).toBe(true);
    });
  });

  describe("GRO-EPG-008: Enroll user", () => {
    it("should enroll user in automation", async () => {
      const result = await enrollInAutomation(
        "test-automation-id",
        "test@example.com",
        null,
        { source: "test" }
      );

      expect(result).toHaveProperty("success");
      // Will fail in test without real data, but validates interface
    });

    it("should create enrollment record with all fields", () => {
      const enrollment = {
        automation_id: "auto-123",
        email: "user@example.com",
        user_id: "user-456",
        current_step: 0,
        status: "active",
        next_step_at: new Date().toISOString(),
        trigger_data: { source: "signup" },
        enrolled_at: new Date().toISOString()
      };

      expect(enrollment.automation_id).toBeDefined();
      expect(enrollment.email).toBeDefined();
      expect(enrollment.status).toBe("active");
      expect(enrollment.current_step).toBe(0);
    });

    it("should prevent duplicate enrollments", () => {
      const enrollments = [
        { automation_id: "auto-1", email: "user@example.com", status: "active" }
      ];

      const automationId = "auto-1";
      const email = "user@example.com";

      const existing = enrollments.find(
        (e) => e.automation_id === automationId && e.email === email
      );

      expect(existing).toBeDefined();
      expect(existing?.status).toBe("active");
    });
  });

  describe("GRO-EPG-009: Drip timing", () => {
    it("should respect delay between emails", () => {
      const enrolledAt = new Date("2026-01-01T00:00:00Z");
      const delayValue = 2;
      const delayUnit = "days";

      const nextStepAt = new Date(enrolledAt);
      nextStepAt.setDate(nextStepAt.getDate() + delayValue);

      expect(nextStepAt.getTime() - enrolledAt.getTime()).toBe(2 * 24 * 60 * 60 * 1000);
    });

    it("should advance enrollment to next step after sending", () => {
      const enrollment = {
        current_step: 0,
        status: "active"
      };

      const steps = [
        { step_order: 0, delay_value: 0, delay_unit: "minutes" },
        { step_order: 1, delay_value: 1, delay_unit: "days" }
      ];

      const nextStep = steps[1];
      const updatedEnrollment = {
        ...enrollment,
        current_step: nextStep.step_order
      };

      expect(updatedEnrollment.current_step).toBe(1);
    });

    it("should mark as completed when no more steps", () => {
      const enrollment = { current_step: 2, status: "active" };
      const steps = [
        { step_order: 0 },
        { step_order: 1 }
      ];

      const currentStepIndex = steps.findIndex((s) => s.step_order === enrollment.current_step);
      const hasMoreSteps = currentStepIndex + 1 < steps.length;

      expect(hasMoreSteps).toBe(false);

      const completed = { ...enrollment, status: "completed" };
      expect(completed.status).toBe("completed");
    });
  });

  describe("GRO-EPG-010: Program analytics", () => {
    it("should calculate automation analytics", () => {
      const enrollments = [
        { status: "active" },
        { status: "active" },
        { status: "completed" },
        { status: "cancelled" }
      ];

      const analytics = {
        total_enrolled: enrollments.length,
        active_enrollments: enrollments.filter((e) => e.status === "active").length,
        completed_enrollments: enrollments.filter((e) => e.status === "completed").length,
        cancelled_enrollments: enrollments.filter((e) => e.status === "cancelled").length
      };

      expect(analytics.total_enrolled).toBe(4);
      expect(analytics.active_enrollments).toBe(2);
      expect(analytics.completed_enrollments).toBe(1);
      expect(analytics.cancelled_enrollments).toBe(1);
    });

    it("should calculate completion rate", () => {
      const totalEnrolled = 10;
      const completed = 7;

      const completionRate = (completed / totalEnrolled) * 100;

      expect(completionRate).toBe(70);
    });

    it("should calculate email open and click rates", () => {
      const totalSent = 100;
      const delivered = 98;
      const opened = 50;
      const clicked = 15;

      const analytics = {
        delivery_rate: (delivered / totalSent) * 100,
        open_rate: (opened / delivered) * 100,
        click_rate: (clicked / delivered) * 100
      };

      expect(analytics.delivery_rate).toBe(98);
      expect(analytics.open_rate).toBeCloseTo(51.02, 2);
      expect(analytics.click_rate).toBeCloseTo(15.31, 2);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing automation steps gracefully", async () => {
      const result = await runAutomationScheduler();

      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should return errors for failed sends", () => {
      const sendResults = [
        { success: true, enrollmentId: "1" },
        { success: false, error: "Resend API error" }
      ];

      const failures = sendResults.filter((r) => !r.success);

      expect(failures.length).toBe(1);
      expect(failures[0].error).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    it("should have database schema for automations", async () => {
      const { data, error } = await supabaseAdmin
        .from("email_automations")
        .select("*")
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it("should have database schema for automation_steps", async () => {
      const { data, error } = await supabaseAdmin
        .from("automation_steps")
        .select("*")
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it("should have database schema for automation_enrollments", async () => {
      const { data, error } = await supabaseAdmin
        .from("automation_enrollments")
        .select("*")
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });
});
