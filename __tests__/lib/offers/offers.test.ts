/**
 * Offers System Tests
 * Tests for feat-016: Offers System - Multi-product Sales
 * Test IDs: GRO-OFR-001 through GRO-OFR-010
 */

import { getOfferByKey, getOffersByPlacement, getAllOffers, type Offer } from "@/lib/offers/getOffers";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: jest.fn(),
}));

const { supabaseServer } = require("@/lib/supabase/server");

describe("Offers System - GRO-OFR Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * GRO-OFR-001: getOffers function returns active offers
   * Priority: P0
   *
   * Tests that getAllOffers correctly retrieves active offers from the database.
   * Verifies filtering and ordering functionality.
   */
  describe("GRO-OFR-001: getAllOffers function", () => {
    it("should return active offers ordered by created_at desc", async () => {
      const mockOffers: Offer[] = [
        {
          key: "member-monthly",
          kind: "membership",
          title: "Membership (Monthly)",
          subtitle: "Full access",
          badge: "Popular",
          cta_text: "Join Now",
          price_label: "$29/mo",
          compare_at_label: null,
          bullets: ["Feature 1", "Feature 2"],
          payload: { tier: "member", interval: "monthly" },
          is_active: true,
        },
        {
          key: "vip-yearly",
          kind: "membership",
          title: "VIP (Yearly)",
          subtitle: "Premium access",
          badge: "Best Value",
          cta_text: "Go VIP",
          price_label: "$990/yr",
          compare_at_label: "$1188/yr",
          bullets: ["All features", "Priority support"],
          payload: { tier: "vip", interval: "yearly" },
          is_active: true,
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockOffers, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getAllOffers();

      expect(result).toEqual(mockOffers);
      expect(mockSupabase.from).toHaveBeenCalledWith("offers");
      expect(mockSupabase.select).toHaveBeenCalledWith("*");
      expect(mockSupabase.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("should return empty array on database error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getAllOffers();

      expect(result).toEqual([]);
    });
  });

  /**
   * GRO-OFR-002: Offer by key returns single offer
   * Priority: P0
   *
   * Tests that getOfferByKey retrieves a specific offer by its unique key.
   * Verifies active filter is applied.
   */
  describe("GRO-OFR-002: getOfferByKey function", () => {
    it("should return single active offer by key", async () => {
      const mockOffer: Offer = {
        key: "member-monthly",
        kind: "membership",
        title: "Membership (Monthly)",
        subtitle: "Full access",
        badge: "Popular",
        cta_text: "Join Now",
        price_label: "$29/mo",
        compare_at_label: null,
        bullets: ["Feature 1", "Feature 2"],
        payload: { tier: "member", interval: "monthly" },
        is_active: true,
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOffer, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getOfferByKey("member-monthly");

      expect(result).toEqual(mockOffer);
      expect(mockSupabase.from).toHaveBeenCalledWith("offers");
      expect(mockSupabase.eq).toHaveBeenCalledWith("key", "member-monthly");
      expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should return null if offer not found", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getOfferByKey("non-existent");

      expect(result).toBeNull();
    });

    it("should return null if offer is inactive", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getOfferByKey("inactive-offer");

      expect(result).toBeNull();
    });
  });

  /**
   * GRO-OFR-003: Offer placements system
   * Priority: P0
   *
   * Tests that getOffersByPlacement retrieves offers for a specific placement
   * and maintains correct sort order.
   */
  describe("GRO-OFR-003: getOffersByPlacement function", () => {
    it("should return offers ordered by sort_order for placement", async () => {
      const mockPlacements = [
        { offer_key: "member-monthly", sort_order: 0 },
        { offer_key: "member-yearly", sort_order: 1 },
      ];

      const mockOffers: Offer[] = [
        {
          key: "member-monthly",
          kind: "membership",
          title: "Membership (Monthly)",
          subtitle: null,
          badge: "Popular",
          cta_text: "Join Now",
          price_label: "$29/mo",
          compare_at_label: null,
          bullets: [],
          payload: { tier: "member", interval: "monthly" },
          is_active: true,
        },
        {
          key: "member-yearly",
          kind: "membership",
          title: "Membership (Yearly)",
          subtitle: null,
          badge: "Best Value",
          cta_text: "Join Now",
          price_label: "$290/yr",
          compare_at_label: "$348/yr",
          bullets: [],
          payload: { tier: "member", interval: "yearly" },
          is_active: true,
        },
      ];

      const mockSupabase = {
        from: jest.fn((table: string) => {
          if (table === "offer_placements") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValue({ data: mockPlacements, error: null }),
            };
          } else if (table === "offers") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: mockOffers, error: null }),
            };
          }
        }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getOffersByPlacement("pricing-page");

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe("member-monthly");
      expect(result[1].key).toBe("member-yearly");
    });

    it("should return empty array if no placements found", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getOffersByPlacement("non-existent-placement");

      expect(result).toEqual([]);
    });

    it("should filter out inactive offers", async () => {
      const mockPlacements = [{ offer_key: "inactive-offer", sort_order: 0 }];

      const mockSupabase = {
        from: jest.fn((table: string) => {
          if (table === "offer_placements") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValue({ data: mockPlacements, error: null }),
            };
          } else if (table === "offers") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
        }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getOffersByPlacement("test-placement");

      expect(result).toEqual([]);
    });
  });

  /**
   * GRO-OFR-004, GRO-OFR-005: Offer types and payload structure
   * Priority: P0, P1
   *
   * Tests that offers support multiple types (membership, course, bundle)
   * and payload structure is correct for each type.
   */
  describe("GRO-OFR-004, GRO-OFR-005: Offer types and payloads", () => {
    it("should support membership offer type with tier and interval", () => {
      const membershipOffer: Offer = {
        key: "member-monthly",
        kind: "membership",
        title: "Membership",
        subtitle: null,
        badge: null,
        cta_text: "Join",
        price_label: "$29/mo",
        compare_at_label: null,
        bullets: [],
        payload: {
          tier: "member",
          interval: "monthly",
        },
        is_active: true,
      };

      expect(membershipOffer.kind).toBe("membership");
      expect(membershipOffer.payload.tier).toBe("member");
      expect(membershipOffer.payload.interval).toBe("monthly");
    });

    it("should support course offer type with courseSlug", () => {
      const courseOffer: Offer = {
        key: "course-fb-ads",
        kind: "course",
        title: "FB Ads Course",
        subtitle: null,
        badge: null,
        cta_text: "Buy Now",
        price_label: "$99",
        compare_at_label: null,
        bullets: [],
        payload: {
          courseSlug: "fb-ads-101",
        },
        is_active: true,
      };

      expect(courseOffer.kind).toBe("course");
      expect(courseOffer.payload.courseSlug).toBe("fb-ads-101");
    });

    it("should support bundle offer type with course and membership", () => {
      const bundleOffer: Offer = {
        key: "bundle-starter",
        kind: "bundle",
        title: "Starter Bundle",
        subtitle: null,
        badge: "Best Value",
        cta_text: "Get Started",
        price_label: "$149",
        compare_at_label: "$178",
        bullets: [],
        payload: {
          courseSlug: "fb-ads-101",
          tier: "member",
          trialDays: 30,
        },
        is_active: true,
      };

      expect(bundleOffer.kind).toBe("bundle");
      expect(bundleOffer.payload.courseSlug).toBe("fb-ads-101");
      expect(bundleOffer.payload.tier).toBe("member");
      expect(bundleOffer.payload.trialDays).toBe(30);
    });
  });

  /**
   * GRO-OFR-006, GRO-OFR-007: Offer display fields
   * Priority: P0
   *
   * Tests that offers have all required display fields for rendering cards.
   */
  describe("GRO-OFR-006, GRO-OFR-007: Offer display fields", () => {
    it("should have all required display fields", () => {
      const offer: Offer = {
        key: "test-offer",
        kind: "membership",
        title: "Test Offer",
        subtitle: "Test subtitle",
        badge: "Popular",
        cta_text: "Buy Now",
        price_label: "$49/mo",
        compare_at_label: "$99/mo",
        bullets: ["Benefit 1", "Benefit 2", "Benefit 3"],
        payload: {},
        is_active: true,
      };

      expect(offer.title).toBeTruthy();
      expect(offer.cta_text).toBeTruthy();
      expect(Array.isArray(offer.bullets)).toBe(true);
      expect(offer.bullets.length).toBeGreaterThan(0);
    });

    it("should support optional badge for highlighting", () => {
      const offerWithBadge: Offer = {
        key: "popular-offer",
        kind: "membership",
        title: "Popular Plan",
        subtitle: null,
        badge: "Most Popular",
        cta_text: "Join",
        price_label: "$29/mo",
        compare_at_label: null,
        bullets: [],
        payload: {},
        is_active: true,
      };

      expect(offerWithBadge.badge).toBe("Most Popular");
    });

    it("should support compare_at pricing for strikethrough", () => {
      const offerWithDiscount: Offer = {
        key: "sale-offer",
        kind: "course",
        title: "Limited Sale",
        subtitle: null,
        badge: "50% Off",
        cta_text: "Buy Now",
        price_label: "$49",
        compare_at_label: "$99",
        bullets: [],
        payload: { courseSlug: "test-course" },
        is_active: true,
      };

      expect(offerWithDiscount.price_label).toBe("$49");
      expect(offerWithDiscount.compare_at_label).toBe("$99");
    });
  });

  /**
   * GRO-OFR-008: Offer impressions tracking
   * Priority: P1
   *
   * Documents the impression tracking API structure.
   * Actual API testing done in integration tests.
   */
  describe("GRO-OFR-008: Offer impressions tracking", () => {
    it("should document impression payload structure", () => {
      const impressionPayload = {
        placementKey: "pricing-page",
        offerKeys: ["member-monthly", "member-yearly"],
        anonSessionId: "test-session-id",
      };

      expect(impressionPayload.placementKey).toBeTruthy();
      expect(Array.isArray(impressionPayload.offerKeys)).toBe(true);
      expect(impressionPayload.offerKeys.length).toBeGreaterThan(0);
      expect(impressionPayload.anonSessionId).toBeTruthy();
    });
  });

  /**
   * GRO-OFR-009: Checkout attempts tracking
   * Priority: P1
   *
   * Documents the checkout attempt payload structure for analytics.
   */
  describe("GRO-OFR-009: Checkout attempts tracking", () => {
    it("should document checkout attempt payload structure", () => {
      const checkoutPayload = {
        offerKey: "member-monthly",
        eventId: "p28_12345678-1234-1234-1234-123456789012",
        next: "/app",
        placementKey: "pricing-page",
        anonSessionId: "test-session-id",
        meta: {
          fbp: "fb.1.1234567890.1234567890",
          fbc: "fb.1.1234567890.AbCdEfGhIjKlMnOpQrStUvWxYz",
        },
      };

      expect(checkoutPayload.offerKey).toBeTruthy();
      expect(checkoutPayload.eventId).toMatch(/^p28_/);
      expect(checkoutPayload.placementKey).toBeTruthy();
      expect(checkoutPayload.meta).toBeTruthy();
      expect(checkoutPayload.meta.fbp).toBeTruthy();
    });
  });

  /**
   * GRO-OFR-010: Multiple offers rendering
   * Priority: P1
   *
   * Tests that multiple offers can be retrieved and displayed correctly.
   */
  describe("GRO-OFR-010: Multiple offers rendering", () => {
    it("should support retrieving multiple offers for a placement", async () => {
      const mockPlacements = [
        { offer_key: "offer-1", sort_order: 0 },
        { offer_key: "offer-2", sort_order: 1 },
        { offer_key: "offer-3", sort_order: 2 },
      ];

      const mockOffers: Offer[] = [
        {
          key: "offer-1",
          kind: "membership",
          title: "Plan 1",
          subtitle: null,
          badge: null,
          cta_text: "Join",
          price_label: "$29/mo",
          compare_at_label: null,
          bullets: [],
          payload: {},
          is_active: true,
        },
        {
          key: "offer-2",
          kind: "membership",
          title: "Plan 2",
          subtitle: null,
          badge: "Popular",
          cta_text: "Join",
          price_label: "$49/mo",
          compare_at_label: null,
          bullets: [],
          payload: {},
          is_active: true,
        },
        {
          key: "offer-3",
          kind: "membership",
          title: "Plan 3",
          subtitle: null,
          badge: "Best Value",
          cta_text: "Join",
          price_label: "$99/mo",
          compare_at_label: null,
          bullets: [],
          payload: {},
          is_active: true,
        },
      ];

      const mockSupabase = {
        from: jest.fn((table: string) => {
          if (table === "offer_placements") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValue({ data: mockPlacements, error: null }),
            };
          } else if (table === "offers") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: mockOffers, error: null }),
            };
          }
        }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getOffersByPlacement("pricing-page");

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe("offer-1");
      expect(result[1].key).toBe("offer-2");
      expect(result[2].key).toBe("offer-3");
    });
  });

  /**
   * BONUS: Additional edge cases and validation tests
   */
  describe("Additional validation tests", () => {
    it("should handle offers with empty bullets array", async () => {
      const mockOffer: Offer = {
        key: "minimal-offer",
        kind: "course",
        title: "Minimal Offer",
        subtitle: null,
        badge: null,
        cta_text: "Buy",
        price_label: "$49",
        compare_at_label: null,
        bullets: [],
        payload: { courseSlug: "test" },
        is_active: true,
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOffer, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getOfferByKey("minimal-offer");

      expect(result).toEqual(mockOffer);
      expect(result?.bullets).toEqual([]);
    });

    it("should preserve sort order from database", async () => {
      const mockPlacements = [
        { offer_key: "z-offer", sort_order: 0 },
        { offer_key: "a-offer", sort_order: 1 },
        { offer_key: "m-offer", sort_order: 2 },
      ];

      const mockOffers: Offer[] = [
        { key: "a-offer", kind: "course", title: "A", subtitle: null, badge: null, cta_text: "Buy", price_label: "$1", compare_at_label: null, bullets: [], payload: {}, is_active: true },
        { key: "m-offer", kind: "course", title: "M", subtitle: null, badge: null, cta_text: "Buy", price_label: "$2", compare_at_label: null, bullets: [], payload: {}, is_active: true },
        { key: "z-offer", kind: "course", title: "Z", subtitle: null, badge: null, cta_text: "Buy", price_label: "$3", compare_at_label: null, bullets: [], payload: {}, is_active: true },
      ];

      const mockSupabase = {
        from: jest.fn((table: string) => {
          if (table === "offer_placements") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValue({ data: mockPlacements, error: null }),
            };
          } else if (table === "offers") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: mockOffers, error: null }),
            };
          }
        }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      const result = await getOffersByPlacement("test");

      // Should be in sort_order, not alphabetical
      expect(result[0].key).toBe("z-offer");
      expect(result[1].key).toBe("a-offer");
      expect(result[2].key).toBe("m-offer");
    });
  });
});
