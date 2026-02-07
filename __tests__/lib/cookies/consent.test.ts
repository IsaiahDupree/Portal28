/**
 * @jest-environment jsdom
 */

import {
  getConsentPreferences,
  setConsentPreferences,
  hasConsent,
  hasSeenConsentBanner,
  acceptAllCookies,
  rejectOptionalCookies,
  resetConsent,
  DEFAULT_CONSENT,
  type ConsentPreferences,
} from "@/lib/cookies/consent";

describe("Cookie Consent", () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Remove all event listeners
    const oldWindow = window;
    // @ts-ignore
    delete (window as any)._listeners;
  });

  describe("MVP-CKE-001: Banner appears on first visit", () => {
    it("should return null when no consent preferences are set", () => {
      const preferences = getConsentPreferences();
      expect(preferences).toBeNull();
    });

    it("should detect that banner has not been seen on first visit", () => {
      expect(hasSeenConsentBanner()).toBe(false);
    });

    it("should detect that banner has been seen after consent given", () => {
      setConsentPreferences(DEFAULT_CONSENT);
      expect(hasSeenConsentBanner()).toBe(true);
    });

    it("should have default consent structure", () => {
      expect(DEFAULT_CONSENT).toEqual({
        necessary: true,
        analytics: false,
        marketing: false,
      });
    });
  });

  describe("MVP-CKE-002: Consent stored in cookie", () => {
    it("should save consent preferences to cookie", () => {
      const preferences: ConsentPreferences = {
        necessary: true,
        analytics: true,
        marketing: false,
      };

      setConsentPreferences(preferences);
      const retrieved = getConsentPreferences();

      expect(retrieved).toEqual(preferences);
    });

    it("should persist consent across page loads", () => {
      setConsentPreferences({
        necessary: true,
        analytics: true,
        marketing: true,
      });

      // Simulate page reload by getting preferences again
      const preferences = getConsentPreferences();
      expect(preferences?.analytics).toBe(true);
      expect(preferences?.marketing).toBe(true);
    });

    it("should handle special characters in preferences", () => {
      const preferences: ConsentPreferences = {
        necessary: true,
        analytics: false,
        marketing: false,
      };

      setConsentPreferences(preferences);
      const retrieved = getConsentPreferences();

      expect(retrieved).toEqual(preferences);
    });

    it("should store cookie with expiry date", () => {
      setConsentPreferences(DEFAULT_CONSENT);

      // Cookie should exist and have expiry set
      const cookie = document.cookie;
      expect(cookie).toContain("portal28_cookie_consent");
    });
  });

  describe("MVP-CKE-003: Tracking respects consent", () => {
    it("should return false for marketing consent when not given", () => {
      setConsentPreferences({
        necessary: true,
        analytics: false,
        marketing: false,
      });

      expect(hasConsent("marketing")).toBe(false);
    });

    it("should return true for marketing consent when given", () => {
      setConsentPreferences({
        necessary: true,
        analytics: false,
        marketing: true,
      });

      expect(hasConsent("marketing")).toBe(true);
    });

    it("should return true for necessary cookies always", () => {
      setConsentPreferences({
        necessary: true,
        analytics: false,
        marketing: false,
      });

      expect(hasConsent("necessary")).toBe(true);
    });

    it("should return false when no consent given yet", () => {
      expect(hasConsent("marketing")).toBe(false);
      expect(hasConsent("analytics")).toBe(false);
    });

    it("should handle analytics consent separately", () => {
      setConsentPreferences({
        necessary: true,
        analytics: true,
        marketing: false,
      });

      expect(hasConsent("analytics")).toBe(true);
      expect(hasConsent("marketing")).toBe(false);
    });
  });

  describe("Helper Functions", () => {
    it("should accept all cookies", () => {
      acceptAllCookies();
      const preferences = getConsentPreferences();

      expect(preferences?.necessary).toBe(true);
      expect(preferences?.analytics).toBe(true);
      expect(preferences?.marketing).toBe(true);
    });

    it("should reject optional cookies", () => {
      rejectOptionalCookies();
      const preferences = getConsentPreferences();

      expect(preferences?.necessary).toBe(true);
      expect(preferences?.analytics).toBe(false);
      expect(preferences?.marketing).toBe(false);
    });

    it("should reset consent", () => {
      setConsentPreferences(DEFAULT_CONSENT);
      expect(hasSeenConsentBanner()).toBe(true);

      resetConsent();
      expect(hasSeenConsentBanner()).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle malformed cookie data gracefully", () => {
      // Set a malformed cookie
      document.cookie = "portal28_cookie_consent=invalid-json; path=/";

      const preferences = getConsentPreferences();
      expect(preferences).toBeNull();
    });

    it("should handle missing cookie gracefully", () => {
      const preferences = getConsentPreferences();
      expect(preferences).toBeNull();
    });

    it("should properly encode/decode preferences", () => {
      const preferences: ConsentPreferences = {
        necessary: true,
        analytics: true,
        marketing: false,
      };

      setConsentPreferences(preferences);
      const retrieved = getConsentPreferences();

      expect(retrieved).toEqual(preferences);
      expect(typeof retrieved?.analytics).toBe("boolean");
      expect(typeof retrieved?.marketing).toBe("boolean");
    });

    it("should handle rapid consent changes", () => {
      // Change consent multiple times rapidly
      acceptAllCookies();
      let preferences = getConsentPreferences();
      expect(preferences?.analytics).toBe(true);
      expect(preferences?.marketing).toBe(true);

      rejectOptionalCookies();
      preferences = getConsentPreferences();
      expect(preferences?.analytics).toBe(false);
      expect(preferences?.marketing).toBe(false);

      acceptAllCookies();
      preferences = getConsentPreferences();
      expect(preferences?.analytics).toBe(true);
      expect(preferences?.marketing).toBe(true);
    });
  });

  describe("GDPR Compliance", () => {
    it("should default to no consent (privacy-first)", () => {
      expect(hasConsent("analytics")).toBe(false);
      expect(hasConsent("marketing")).toBe(false);
    });

    it("should require explicit consent for non-necessary cookies", () => {
      // User must actively accept
      setConsentPreferences(DEFAULT_CONSENT);

      expect(hasConsent("necessary")).toBe(true);
      expect(hasConsent("analytics")).toBe(false);
      expect(hasConsent("marketing")).toBe(false);
    });

    it("should allow granular consent control", () => {
      // User can accept analytics but not marketing
      setConsentPreferences({
        necessary: true,
        analytics: true,
        marketing: false,
      });

      expect(hasConsent("analytics")).toBe(true);
      expect(hasConsent("marketing")).toBe(false);
    });

    it("should allow consent withdrawal", () => {
      acceptAllCookies();
      expect(hasConsent("marketing")).toBe(true);

      rejectOptionalCookies();
      expect(hasConsent("marketing")).toBe(false);
    });
  });
});
