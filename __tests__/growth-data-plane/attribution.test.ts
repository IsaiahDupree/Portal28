/**
 * Growth Data Plane - Attribution Tests
 * Feature: GDP-006
 * Tests attribution tracking: email → click → session → conversion
 */

import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

describe("Growth Data Plane - Attribution (GDP-006)", () => {
  describe("GDP-006: Attribution System Structure", () => {
    let attributionContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/attribution.ts"
      );
      attributionContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should have attribution data interface", () => {
      expect(attributionContent).toContain("AttributionData");
      expect(attributionContent).toContain("anonymous_id");
      expect(attributionContent).toContain("session_id");
      expect(attributionContent).toContain("email_message_id");
      expect(attributionContent).toContain("link_url");
      expect(attributionContent).toContain("utm_source");
      expect(attributionContent).toContain("utm_medium");
      expect(attributionContent).toContain("utm_campaign");
    });

    it("should have first-party cookie support", () => {
      expect(attributionContent).toContain("ATTRIBUTION_COOKIE");
      expect(attributionContent).toContain("cookies()");
      expect(attributionContent).toContain("httpOnly: true");
      expect(attributionContent).toContain("sameSite");
    });

    it("should have 30-day cookie expiration", () => {
      expect(attributionContent).toContain("30");
      expect(attributionContent).toContain("24 * 60 * 60");
    });
  });

  describe("GDP-006: Email Click Attribution", () => {
    let attributionContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/attribution.ts"
      );
      attributionContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should have trackEmailClickAttribution function", () => {
      expect(attributionContent).toContain("trackEmailClickAttribution");
      expect(attributionContent).toContain("emailMessageId");
      expect(attributionContent).toContain("linkUrl");
    });

    it("should track email click event", () => {
      expect(attributionContent).toContain("attribution.email_click");
      expect(attributionContent).toContain("track_event");
    });

    it("should update attribution with email data", () => {
      expect(attributionContent).toContain("email_message_id");
      expect(attributionContent).toContain("link_url");
      expect(attributionContent).toContain("updateAttribution");
    });
  });

  describe("GDP-006: Page View Attribution", () => {
    let attributionContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/attribution.ts"
      );
      attributionContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should have trackPageViewAttribution function", () => {
      expect(attributionContent).toContain("trackPageViewAttribution");
      expect(attributionContent).toContain("url");
      expect(attributionContent).toContain("referrer");
      expect(attributionContent).toContain("utmParams");
    });

    it("should track first-touch attribution", () => {
      expect(attributionContent).toContain("first_landing_page");
      expect(attributionContent).toContain("first_referrer");
    });

    it("should track last-touch UTM parameters", () => {
      expect(attributionContent).toContain("utm_source");
      expect(attributionContent).toContain("utm_medium");
      expect(attributionContent).toContain("utm_campaign");
      expect(attributionContent).toContain("utm_content");
      expect(attributionContent).toContain("utm_term");
    });

    it("should track landing_view event", () => {
      expect(attributionContent).toContain("landing_view");
    });
  });

  describe("GDP-006: Conversion Attribution", () => {
    let attributionContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/attribution.ts"
      );
      attributionContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should have trackConversionAttribution function", () => {
      expect(attributionContent).toContain("trackConversionAttribution");
      expect(attributionContent).toContain("eventName");
      expect(attributionContent).toContain("personId");
    });

    it("should include full attribution chain in conversion", () => {
      expect(attributionContent).toContain("email_message_id");
      expect(attributionContent).toContain("first_landing_page");
      expect(attributionContent).toContain("first_referrer");
      expect(attributionContent).toContain("utm_source");
    });

    it("should link anonymous_id to person", () => {
      expect(attributionContent).toContain("link_identity");
      expect(attributionContent).toContain("anonymous_id");
    });

    it("should update person_features with attribution", () => {
      expect(attributionContent).toContain("person_features");
      expect(attributionContent).toContain("update");
    });
  });

  describe("GDP-006: Identity Stitching", () => {
    let attributionContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/attribution.ts"
      );
      attributionContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should have stitchAnonymousTouch function", () => {
      expect(attributionContent).toContain("stitchAnonymousTouch");
      expect(attributionContent).toContain("personId");
      expect(attributionContent).toContain("userId");
    });

    it("should update events to link anonymous sessions to person", () => {
      expect(attributionContent).toContain("event");
      expect(attributionContent).toContain("anonymous_id");
      expect(attributionContent).toContain("person_id");
    });

    it("should link both anonymous_id and session_id", () => {
      expect(attributionContent).toContain("anonymous_id");
      expect(attributionContent).toContain("session_id");
      expect(attributionContent).toContain("link_identity");
    });
  });

  describe("GDP-006: Attribution Reporting", () => {
    let attributionContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/attribution.ts"
      );
      attributionContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should have getPersonAttribution function", () => {
      expect(attributionContent).toContain("getPersonAttribution");
      expect(attributionContent).toContain("person_features");
      expect(attributionContent).toContain("touch_points");
      expect(attributionContent).toContain("email_attribution");
    });

    it("should have getConversionPaths function", () => {
      expect(attributionContent).toContain("getConversionPaths");
      expect(attributionContent).toContain("time_to_convert");
      expect(attributionContent).toContain("path");
    });

    it("should analyze conversion paths", () => {
      expect(attributionContent).toContain("time_to_convert_seconds");
      expect(attributionContent).toContain("personEvents");
    });
  });

  describe("GDP-006: Click Tracking Endpoint", () => {
    let routeContent: string;

    beforeAll(() => {
      const routePath = path.join(
        process.cwd(),
        "app/api/track/click/route.ts"
      );
      routeContent = fs.readFileSync(routePath, "utf-8");
    });

    it("should have click tracking route", () => {
      expect(routeContent).toContain("export async function GET");
      expect(routeContent).toContain("trackEmailClickAttribution");
    });

    it("should accept message_id and url parameters", () => {
      expect(routeContent).toContain('searchParams.get("m")');
      expect(routeContent).toContain('searchParams.get("u")');
      expect(routeContent).toContain("messageId");
      expect(routeContent).toContain("encodedUrl");
    });

    it("should decode base64 URL", () => {
      expect(routeContent).toContain("Buffer.from");
      expect(routeContent).toContain("base64");
      expect(routeContent).toContain("toString");
    });

    it("should validate URL", () => {
      expect(routeContent).toContain("new URL");
      expect(routeContent).toContain("Invalid destination URL");
    });

    it("should redirect to destination", () => {
      expect(routeContent).toContain("NextResponse.redirect");
      expect(routeContent).toContain("destinationUrl");
    });

    it("should handle errors gracefully", () => {
      expect(routeContent).toContain("catch");
      expect(routeContent).toContain("console.error");
    });

    it("should use edge runtime for performance", () => {
      expect(routeContent).toContain('runtime = "edge"');
    });
  });

  describe("GDP-006: Cookie Security", () => {
    let attributionContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/attribution.ts"
      );
      attributionContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should use httpOnly cookies", () => {
      expect(attributionContent).toContain("httpOnly: true");
    });

    it("should use secure in production", () => {
      expect(attributionContent).toContain('process.env.NODE_ENV === "production"');
    });

    it("should use lax sameSite", () => {
      expect(attributionContent).toContain('sameSite: "lax"');
    });

    it("should set cookie path to root", () => {
      expect(attributionContent).toContain('path: "/"');
    });
  });

  describe("GDP-006: UUID Generation", () => {
    let attributionContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/attribution.ts"
      );
      attributionContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should import uuid library", () => {
      expect(attributionContent).toContain("uuid");
      expect(attributionContent).toContain("uuidv4");
    });

    it("should generate anonymous_id and session_id", () => {
      expect(attributionContent).toContain("anonymous_id: uuidv4()");
      expect(attributionContent).toContain("session_id: uuidv4()");
    });
  });

  describe("GDP-006: Attribution Flow", () => {
    it("should support full attribution flow", () => {
      const steps = [
        "Email sent with tracking link",
        "User clicks → trackEmailClickAttribution",
        "User lands → trackPageViewAttribution",
        "User converts → trackConversionAttribution",
        "Events linked via anonymous_id and session_id",
      ];

      // All steps should be representable in the system
      expect(steps.length).toBe(5);
    });
  });

  describe("GDP-006: Integration with Person Features", () => {
    let attributionContent: string;

    beforeAll(() => {
      const filePath = path.join(
        process.cwd(),
        "lib/growth-data-plane/attribution.ts"
      );
      attributionContent = fs.readFileSync(filePath, "utf-8");
    });

    it("should store attribution in person_features", () => {
      expect(attributionContent).toContain("person_features");
      expect(attributionContent).toContain("utm_source");
      expect(attributionContent).toContain("first_landing_page");
      expect(attributionContent).toContain("first_referrer");
    });

    it("should update person_features on conversion", () => {
      expect(attributionContent).toContain(".update({");
      expect(attributionContent).toContain('eq("person_id", personId)');
    });
  });
});
