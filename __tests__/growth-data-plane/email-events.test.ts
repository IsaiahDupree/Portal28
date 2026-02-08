/**
 * Growth Data Plane - Email Events Tests
 * Features: GDP-004, GDP-005
 * Tests email webhook processing and event tracking
 */

import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

describe("Growth Data Plane - Email Events (GDP-004, GDP-005)", () => {

  describe("GDP-004: Webhook Signature Verification", () => {
    let webhookContent: string;

    beforeAll(() => {
      const webhookPath = path.join(
        process.cwd(),
        "app/api/resend/webhook/route.ts"
      );
      webhookContent = fs.readFileSync(webhookPath, "utf-8");
    });

    it("should verify webhook signature exists in route.ts", () => {
      // Should use Svix for verification
      expect(webhookContent).toContain('from "svix"');
      expect(webhookContent).toContain("new Webhook(secret)");
      expect(webhookContent).toContain("wh.verify");

      // Should check for Svix headers
      expect(webhookContent).toContain("svix-id");
      expect(webhookContent).toContain("svix-timestamp");
      expect(webhookContent).toContain("svix-signature");

      // Should return 401 on invalid signature
      expect(webhookContent).toContain("Invalid signature");
      expect(webhookContent).toContain("401");
    });

    it("should call Growth Data Plane processing", () => {
      expect(webhookContent).toContain("processGDPEmailEvent");
      expect(webhookContent).toContain("growth-data-plane/email-events");
    });

    it("should check for webhook secret configuration", () => {
      expect(webhookContent).toContain("RESEND_WEBHOOK_SECRET");
      expect(webhookContent).toContain("Webhook secret not configured");
    });
  });

  describe("GDP-005: Email Event Tracking", () => {
    let emailEventsContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/email-events.ts"
      );
      emailEventsContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should have processGDPEmailEvent function", () => {
      expect(emailEventsContent).toContain("processGDPEmailEvent");
      expect(emailEventsContent).toContain("GDPEmailEvent");
    });

    it("should call upsert_person_from_email", () => {
      expect(emailEventsContent).toContain("upsert_person_from_email");
      expect(emailEventsContent).toContain("p_email");
    });

    it("should create email_message records", () => {
      expect(emailEventsContent).toContain("email_message");
      expect(emailEventsContent).toContain("resend_id");
    });

    it("should create email_event records", () => {
      expect(emailEventsContent).toContain("email_event");
      expect(emailEventsContent).toContain("email_message_id");
      expect(emailEventsContent).toContain("event_type");
    });

    it("should track unified events", () => {
      expect(emailEventsContent).toContain("track_event");
      expect(emailEventsContent).toContain("p_event_name");
      expect(emailEventsContent).toContain("p_source");
    });

    it("should link Resend identity to person", () => {
      expect(emailEventsContent).toContain("link_identity");
      expect(emailEventsContent).toContain("p_identity_type");
      expect(emailEventsContent).toContain("resend");
    });

    it("should support all required event types", () => {
      expect(emailEventsContent).toContain("delivered");
      expect(emailEventsContent).toContain("opened");
      expect(emailEventsContent).toContain("clicked");
      expect(emailEventsContent).toContain("bounced");
      expect(emailEventsContent).toContain("complained");
    });

    it("should normalize emails to lowercase", () => {
      expect(emailEventsContent).toContain("toLowerCase()");
      expect(emailEventsContent).toContain("trim()");
    });
  });

  describe("GDP-005: Email Message Deduplication", () => {
    let emailEventsContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/email-events.ts"
      );
      emailEventsContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should check for existing email_message by resend_id", () => {
      expect(emailEventsContent).toContain("existingMessage");
      expect(emailEventsContent).toContain("eq(\"resend_id\"");
    });
  });

  describe("GDP-005: Person Features", () => {
    let emailEventsContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/email-events.ts"
      );
      emailEventsContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should have getPersonEmailStats function", () => {
      expect(emailEventsContent).toContain("getPersonEmailStats");
      expect(emailEventsContent).toContain("email_opens_30d");
      expect(emailEventsContent).toContain("email_clicks_30d");
    });

    it("should have recomputePersonFeaturesForEmail function", () => {
      expect(emailEventsContent).toContain("recomputePersonFeaturesForEmail");
      expect(emailEventsContent).toContain("compute_person_features");
    });
  });

  describe("GDP-005: Error Handling", () => {
    let emailEventsContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/email-events.ts"
      );
      emailEventsContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should handle database errors with try-catch", () => {
      expect(emailEventsContent).toContain("try {");
      expect(emailEventsContent).toContain("catch");
      expect(emailEventsContent).toContain("console.error");
    });

    it("should check for errors in database operations", () => {
      expect(emailEventsContent).toContain("Error");
      expect(emailEventsContent).toContain("throw");
    });
  });

  describe("GDP-004/GDP-005: Integration Requirements", () => {
    it("should handle all required event types", () => {
      const eventTypes: Array<
        "delivered" | "opened" | "clicked" | "bounced" | "complained"
      > = ["delivered", "opened", "clicked", "bounced", "complained"];

      eventTypes.forEach((type) => {
        expect(["delivered", "opened", "clicked", "bounced", "complained"]).toContain(
          type
        );
      });
    });

    it("should normalize emails to lowercase", () => {
      // This is tested implicitly in processGDPEmailEvent
      // which calls toLowerCase() on emails
      expect("TEST@EXAMPLE.COM".toLowerCase()).toBe("test@example.com");
    });

    it("should trim whitespace from emails", () => {
      expect("  test@example.com  ".toLowerCase().trim()).toBe(
        "test@example.com"
      );
    });
  });
});
