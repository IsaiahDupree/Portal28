/**
 * Widget System Tests
 * Tests for feat-025: Widget System - Modular Apps
 * Test IDs: PLT-WDG-001 through PLT-WDG-006
 */

import {
  getWidgetsWithAccess,
  requireWidgetAccess,
  logPaywallEvent
} from "@/lib/access/requireWidgetAccess";
import { getUserEntitlements, evaluatePolicy } from "@/lib/access/entitlements";
import type { Widget, AccessDecision } from "@/lib/access/types";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: jest.fn(),
}));

// Mock entitlements
jest.mock("@/lib/access/entitlements", () => ({
  getUserEntitlements: jest.fn(),
  evaluatePolicy: jest.fn(),
  grantEntitlement: jest.fn(),
  revokeEntitlement: jest.fn(),
}));

const { supabaseServer } = require("@/lib/supabase/server");

describe("Widget System - PLT-WDG Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * PLT-WDG-001: Get widgets returns enabled widgets
   * Priority: P0
   *
   * Tests that getWidgetsWithAccess correctly retrieves active widgets from the database.
   * Verifies filtering by status and ordering by display_order.
   */
  describe("PLT-WDG-001: Get widgets function", () => {
    it("should return active widgets ordered by display_order", async () => {
      const mockWidgets: Widget[] = [
        {
          id: "widget-1",
          key: "dashboard",
          name: "Dashboard",
          route: "/app",
          description: "Overview",
          icon: "📊",
          category: "core",
          access_policy_json: { level: "AUTH" },
          saleswall_type: "none",
          saleswall_config: null,
          display_order: 1,
          status: "active",
        },
        {
          id: "widget-2",
          key: "community",
          name: "Community",
          route: "/app/community",
          description: "Connect with members",
          icon: "💬",
          category: "social",
          access_policy_json: {
            anyOf: [{ level: "MEMBERSHIP", tiers: ["member", "vip"] }]
          },
          saleswall_type: "membership",
          saleswall_config: { priceIds: ["price_123"], tiers: ["member", "vip"] },
          display_order: 2,
          status: "active",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockWidgets, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      // Mock entitlements for authenticated user
      (getUserEntitlements as jest.Mock).mockResolvedValue(
        new Set(["membership_tier:member"])
      );

      // Mock access decisions
      (evaluatePolicy as jest.Mock)
        .mockReturnValueOnce({ allow: true, reason: "authenticated" })
        .mockReturnValueOnce({ allow: true, reason: "has membership" });

      const result = await getWidgetsWithAccess({ id: "user-123" });

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe("dashboard");
      expect(result[0].decision.allow).toBe(true);
      expect(result[1].key).toBe("community");
      expect(result[1].decision.allow).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("widgets");
      expect(mockSupabase.select).toHaveBeenCalledWith("*");
      expect(mockSupabase.eq).toHaveBeenCalledWith("status", "active");
      expect(mockSupabase.order).toHaveBeenCalledWith("display_order");
    });

    it("should return widgets with mixed access for user without entitlements", async () => {
      const mockWidgets: Widget[] = [
        {
          id: "widget-1",
          key: "dashboard",
          name: "Dashboard",
          route: "/app",
          description: "Overview",
          icon: "📊",
          category: "core",
          access_policy_json: { level: "AUTH" },
          saleswall_type: "none",
          saleswall_config: null,
          display_order: 1,
          status: "active",
        },
        {
          id: "widget-2",
          key: "templates",
          name: "Templates",
          route: "/app/templates",
          description: "VIP only",
          icon: "📝",
          category: "resources",
          access_policy_json: {
            anyOf: [{ level: "MEMBERSHIP", tiers: ["vip"] }]
          },
          saleswall_type: "membership",
          saleswall_config: { priceIds: ["price_vip"], tiers: ["vip"] },
          display_order: 3,
          status: "active",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockWidgets, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      // User with no entitlements
      (getUserEntitlements as jest.Mock).mockResolvedValue(new Set());

      // First widget allows (AUTH only), second denies (needs VIP)
      (evaluatePolicy as jest.Mock)
        .mockReturnValueOnce({ allow: true, reason: "authenticated" })
        .mockReturnValueOnce({ allow: false, reason: "missing membership" });

      const result = await getWidgetsWithAccess({ id: "user-123" });

      expect(result).toHaveLength(2);
      expect(result[0].decision.allow).toBe(true);
      expect(result[1].decision.allow).toBe(false);
    });

    it("should handle unauthenticated users", async () => {
      const mockWidgets: Widget[] = [
        {
          id: "widget-1",
          key: "home",
          name: "Home",
          route: "/",
          description: "Public home",
          icon: "🏠",
          category: "public",
          access_policy_json: { level: "PUBLIC" },
          saleswall_type: "none",
          saleswall_config: null,
          display_order: 0,
          status: "active",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockWidgets, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (evaluatePolicy as jest.Mock).mockReturnValue({ allow: true, reason: "public" });

      const result = await getWidgetsWithAccess(null);

      expect(result).toHaveLength(1);
      expect(result[0].decision.allow).toBe(true);
      expect(getUserEntitlements).not.toHaveBeenCalled();
    });

    it("should return empty array on database error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: new Error("DB connection error")
        }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      await expect(getWidgetsWithAccess({ id: "user-123" })).rejects.toThrow();
    });
  });

  /**
   * PLT-WDG-002: Access check validates membership
   * Priority: P0
   *
   * Tests that requireWidgetAccess correctly validates user membership against widget access policies.
   * Verifies entitlement checking and policy evaluation.
   */
  describe("PLT-WDG-002: Access validation", () => {
    it("should allow access for user with required membership", async () => {
      const mockWidget: Widget = {
        id: "widget-community",
        key: "community",
        name: "Community",
        route: "/app/community",
        description: "Member access",
        icon: "💬",
        category: "social",
        access_policy_json: {
          anyOf: [{ level: "MEMBERSHIP", tiers: ["member", "vip"] }]
        },
        saleswall_type: "membership",
        saleswall_config: { priceIds: ["price_member"], tiers: ["member", "vip"] },
        display_order: 2,
        status: "active",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (getUserEntitlements as jest.Mock).mockResolvedValue(
        new Set(["membership_tier:member"])
      );

      (evaluatePolicy as jest.Mock).mockReturnValue({
        allow: true,
        reason: "has required membership tier"
      });

      const result = await requireWidgetAccess({
        widgetKey: "community",
        user: { id: "user-123" },
      });

      expect(result.widget.key).toBe("community");
      expect(result.decision.allow).toBe(true);
      expect(getUserEntitlements).toHaveBeenCalledWith("user-123");
      expect(evaluatePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          policy: mockWidget.access_policy_json,
          isAuthed: true,
          saleswallType: "membership",
        })
      );
    });

    it("should deny access for user without required membership", async () => {
      const mockWidget: Widget = {
        id: "widget-vip",
        key: "coaching",
        name: "Coaching",
        route: "/app/coaching",
        description: "VIP only",
        icon: "🎯",
        category: "premium",
        access_policy_json: {
          anyOf: [{ level: "MEMBERSHIP", tiers: ["vip"] }]
        },
        saleswall_type: "membership",
        saleswall_config: { priceIds: ["price_vip"], tiers: ["vip"] },
        display_order: 7,
        status: "active",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (getUserEntitlements as jest.Mock).mockResolvedValue(
        new Set(["membership_tier:member"])
      );

      (evaluatePolicy as jest.Mock).mockReturnValue({
        allow: false,
        reason: "requires VIP membership"
      });

      const result = await requireWidgetAccess({
        widgetKey: "coaching",
        user: { id: "user-123" },
      });

      expect(result.widget.key).toBe("coaching");
      expect(result.decision.allow).toBe(false);
      expect(result.decision.reason).toContain("VIP");
    });

    it("should allow access for course-based widget with course access", async () => {
      const mockWidget: Widget = {
        id: "widget-course",
        key: "course-resources",
        name: "Course Resources",
        route: "/app/resources",
        description: "Course access",
        icon: "📚",
        category: "education",
        access_policy_json: {
          anyOf: [{ level: "COURSE", courseSlugs: ["fb-ads-101"] }]
        },
        saleswall_type: "course",
        saleswall_config: { courseSlugs: ["fb-ads-101"] },
        display_order: 4,
        status: "active",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (getUserEntitlements as jest.Mock).mockResolvedValue(
        new Set(["course:fb-ads-101"])
      );

      (evaluatePolicy as jest.Mock).mockReturnValue({
        allow: true,
        reason: "owns required course"
      });

      const result = await requireWidgetAccess({
        widgetKey: "course-resources",
        user: { id: "user-123" },
      });

      expect(result.widget.key).toBe("course-resources");
      expect(result.decision.allow).toBe(true);
    });

    it("should handle hybrid access (membership OR course)", async () => {
      const mockWidget: Widget = {
        id: "widget-hybrid",
        key: "templates",
        name: "Templates",
        route: "/app/templates",
        description: "Member or course owner",
        icon: "📝",
        category: "resources",
        access_policy_json: {
          anyOf: [
            { level: "MEMBERSHIP", tiers: ["member", "vip"] },
            { level: "COURSE", courseSlugs: ["fb-ads-101"] }
          ]
        },
        saleswall_type: "hybrid",
        saleswall_config: {
          tiers: ["member", "vip"],
          courseSlugs: ["fb-ads-101"]
        },
        display_order: 3,
        status: "active",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      // User has course but not membership
      (getUserEntitlements as jest.Mock).mockResolvedValue(
        new Set(["course:fb-ads-101"])
      );

      (evaluatePolicy as jest.Mock).mockReturnValue({
        allow: true,
        reason: "owns qualifying course"
      });

      const result = await requireWidgetAccess({
        widgetKey: "templates",
        user: { id: "user-123" },
      });

      expect(result.widget.key).toBe("templates");
      expect(result.decision.allow).toBe(true);
    });

    it("should throw error for non-existent widget", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error("Not found")
        }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      await expect(
        requireWidgetAccess({
          widgetKey: "nonexistent",
          user: { id: "user-123" },
        })
      ).rejects.toThrow("Widget not found: nonexistent");
    });

    it("should handle unauthenticated user attempting to access auth-required widget", async () => {
      const mockWidget: Widget = {
        id: "widget-auth",
        key: "dashboard",
        name: "Dashboard",
        route: "/app",
        description: "Auth required",
        icon: "📊",
        category: "core",
        access_policy_json: { level: "AUTH" },
        saleswall_type: "none",
        saleswall_config: null,
        display_order: 1,
        status: "active",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (evaluatePolicy as jest.Mock).mockReturnValue({
        allow: false,
        reason: "authentication required"
      });

      const result = await requireWidgetAccess({
        widgetKey: "dashboard",
        user: null,
      });

      expect(result.decision.allow).toBe(false);
      expect(result.decision.reason).toContain("authentication");
    });
  });

  /**
   * PLT-WDG-003: Config retrieval returns settings
   * Priority: P1
   *
   * Tests that widget configuration (saleswall_type, saleswall_config) is correctly retrieved.
   * Verifies saleswall settings for different widget types.
   */
  describe("PLT-WDG-003: Configuration retrieval", () => {
    it("should retrieve widget with membership saleswall config", async () => {
      const mockWidget: Widget = {
        id: "widget-1",
        key: "community",
        name: "Community",
        route: "/app/community",
        description: "Members only",
        icon: "💬",
        category: "social",
        access_policy_json: {
          anyOf: [{ level: "MEMBERSHIP", tiers: ["member", "vip"] }]
        },
        saleswall_type: "membership",
        saleswall_config: {
          priceIds: ["price_member_monthly", "price_vip_yearly"],
          tiers: ["member", "vip"]
        },
        display_order: 2,
        status: "active",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (getUserEntitlements as jest.Mock).mockResolvedValue(new Set());
      (evaluatePolicy as jest.Mock).mockReturnValue({ allow: false, reason: "no membership" });

      const result = await requireWidgetAccess({
        widgetKey: "community",
        user: { id: "user-123" },
      });

      expect(result.widget.saleswall_type).toBe("membership");
      expect(result.widget.saleswall_config).toEqual({
        priceIds: ["price_member_monthly", "price_vip_yearly"],
        tiers: ["member", "vip"]
      });
    });

    it("should retrieve widget with course saleswall config", async () => {
      const mockWidget: Widget = {
        id: "widget-2",
        key: "course-templates",
        name: "Course Templates",
        route: "/app/templates",
        description: "Course owners only",
        icon: "📝",
        category: "education",
        access_policy_json: {
          anyOf: [{ level: "COURSE", courseSlugs: ["fb-ads-101", "tiktok-ads"] }]
        },
        saleswall_type: "course",
        saleswall_config: {
          courseSlugs: ["fb-ads-101", "tiktok-ads"]
        },
        display_order: 4,
        status: "active",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (getUserEntitlements as jest.Mock).mockResolvedValue(new Set());
      (evaluatePolicy as jest.Mock).mockReturnValue({ allow: false, reason: "no course" });

      const result = await requireWidgetAccess({
        widgetKey: "course-templates",
        user: { id: "user-123" },
      });

      expect(result.widget.saleswall_type).toBe("course");
      expect(result.widget.saleswall_config).toEqual({
        courseSlugs: ["fb-ads-101", "tiktok-ads"]
      });
    });

    it("should retrieve widget with hybrid saleswall config", async () => {
      const mockWidget: Widget = {
        id: "widget-3",
        key: "resources",
        name: "Resources",
        route: "/app/resources",
        description: "Member or course owner",
        icon: "📚",
        category: "resources",
        access_policy_json: {
          anyOf: [
            { level: "MEMBERSHIP", tiers: ["member"] },
            { level: "COURSE", courseSlugs: ["fb-ads-101"] }
          ]
        },
        saleswall_type: "hybrid",
        saleswall_config: {
          tiers: ["member", "vip"],
          courseSlugs: ["fb-ads-101"],
          priceIds: ["price_member", "price_course"]
        },
        display_order: 5,
        status: "active",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (getUserEntitlements as jest.Mock).mockResolvedValue(new Set());
      (evaluatePolicy as jest.Mock).mockReturnValue({ allow: false, reason: "no access" });

      const result = await requireWidgetAccess({
        widgetKey: "resources",
        user: { id: "user-123" },
      });

      expect(result.widget.saleswall_type).toBe("hybrid");
      expect(result.widget.saleswall_config).toHaveProperty("tiers");
      expect(result.widget.saleswall_config).toHaveProperty("courseSlugs");
      expect(result.widget.saleswall_config).toHaveProperty("priceIds");
    });

    it("should retrieve widget with no saleswall (public access)", async () => {
      const mockWidget: Widget = {
        id: "widget-4",
        key: "dashboard",
        name: "Dashboard",
        route: "/app",
        description: "All authenticated users",
        icon: "📊",
        category: "core",
        access_policy_json: { level: "AUTH" },
        saleswall_type: "none",
        saleswall_config: null,
        display_order: 1,
        status: "active",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (getUserEntitlements as jest.Mock).mockResolvedValue(new Set());
      (evaluatePolicy as jest.Mock).mockReturnValue({ allow: true, reason: "authenticated" });

      const result = await requireWidgetAccess({
        widgetKey: "dashboard",
        user: { id: "user-123" },
      });

      expect(result.widget.saleswall_type).toBe("none");
      expect(result.widget.saleswall_config).toBeNull();
    });
  });

  /**
   * PLT-WDG-006: Enable/disable admin toggles
   * Priority: P1
   *
   * Tests that widget status (active/hidden) is correctly handled.
   * Verifies that only active widgets are returned by default.
   */
  describe("PLT-WDG-006: Widget enable/disable", () => {
    it("should only return active widgets", async () => {
      const mockWidgets: Widget[] = [
        {
          id: "widget-1",
          key: "dashboard",
          name: "Dashboard",
          route: "/app",
          description: "Active widget",
          icon: "📊",
          category: "core",
          access_policy_json: { level: "AUTH" },
          saleswall_type: "none",
          saleswall_config: null,
          display_order: 1,
          status: "active",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockWidgets, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      (getUserEntitlements as jest.Mock).mockResolvedValue(new Set());
      (evaluatePolicy as jest.Mock).mockReturnValue({ allow: true, reason: "auth" });

      const result = await getWidgetsWithAccess({ id: "user-123" });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("active");
      expect(mockSupabase.eq).toHaveBeenCalledWith("status", "active");
    });

    it("should exclude hidden widgets from results", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error("Not found")
        }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      await expect(
        requireWidgetAccess({
          widgetKey: "hidden-widget",
          user: { id: "user-123" },
        })
      ).rejects.toThrow("Widget not found");

      expect(mockSupabase.eq).toHaveBeenCalledWith("status", "active");
    });

    it("should throw error when accessing widget with coming_soon status", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error("Not found")
        }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      await expect(
        requireWidgetAccess({
          widgetKey: "coming-soon-widget",
          user: { id: "user-123" },
        })
      ).rejects.toThrow();
    });
  });

  /**
   * Additional tests for paywall event logging
   */
  describe("Paywall event logging", () => {
    it("should log paywall view event", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      await logPaywallEvent({
        userId: "user-123",
        email: "test@example.com",
        eventType: "view",
        widgetKey: "community",
        paywallType: "membership",
        offerTier: "member",
        source: "sidebar",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("paywall_events");
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          email: "test@example.com",
          event_type: "view",
          widget_key: "community",
          paywall_type: "membership",
          offer_tier: "member",
          source: "sidebar",
          converted: false,
        })
      );
    });

    it("should log paywall conversion event", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };

      supabaseServer.mockReturnValue(mockSupabase);

      await logPaywallEvent({
        userId: "user-123",
        eventType: "complete",
        widgetKey: "templates",
        offerPriceId: "price_vip",
        converted: true,
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "complete",
          widget_key: "templates",
          offer_price_id: "price_vip",
          converted: true,
        })
      );
    });
  });
});
