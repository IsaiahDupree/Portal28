/**
 * Admin Widget API Tests
 * Tests for feat-025: Widget System - Admin Management
 * Test ID: PLT-WDG-006
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockJson = jest.fn();
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: mockJson },
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
  order: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

describe("Admin Widget API - PLT-WDG-006", () => {
  let GET: any, PATCH: any, POST: any;

  beforeAll(async () => {
    const handlers = await import("@/app/api/admin/widgets/route");
    GET = handlers.GET;
    PATCH = handlers.PATCH;
    POST = handlers.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
    }));
  });

  describe("GET /api/admin/widgets", () => {
    it("should return all widgets for admin users", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { role: "admin" },
        error: null,
      });

      const mockWidgets = [
        { id: "1", key: "dashboard", name: "Dashboard", status: "active", display_order: 1 },
        { id: "2", key: "community", name: "Community", status: "hidden", display_order: 2 },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockWidgets,
        error: null,
      });

      const req = {} as any;
      const response = await GET(req);
      const data = await response.json();

      expect(data.widgets).toHaveLength(2);
      expect(data.widgets[0].key).toBe("dashboard");
    });

    it("should return 401 for unauthenticated users", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const req = {} as any;
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { role: "user" },
        error: null,
      });

      const req = {} as any;
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("PATCH /api/admin/widgets", () => {
    it("should update widget status successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      });

      mockSupabase.single
        .mockResolvedValueOnce({ data: { role: "admin" }, error: null })
        .mockResolvedValueOnce({
          data: { id: "1", key: "community", status: "hidden" },
          error: null,
        });

      const req = {
        json: async () => ({ key: "community", status: "hidden" }),
      } as any;

      const response = await PATCH(req);
      const data = await response.json();

      expect(data.ok).toBe(true);
      expect(data.widget.status).toBe("hidden");
    });

    it("should validate request body schema", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { role: "admin" },
        error: null,
      });

      const req = {
        json: async () => ({ key: "community", status: "invalid" }),
      } as any;

      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should handle invalid JSON", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { role: "admin" },
        error: null,
      });

      const req = {
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as any;

      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON");
    });
  });

  describe("POST /api/admin/widgets/toggle", () => {
    it("should toggle widget status from active to hidden", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      });

      mockSupabase.single
        .mockResolvedValueOnce({ data: { role: "admin" }, error: null })
        .mockResolvedValueOnce({
          data: { key: "community", status: "hidden" },
          error: null,
        });

      const req = {
        json: async () => ({ key: "community", status: "hidden" }),
      } as any;

      const response = await POST(req);
      const data = await response.json();

      expect(data.ok).toBe(true);
      expect(data.widget.status).toBe("hidden");
    });

    it("should reject invalid status values", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { role: "admin" },
        error: null,
      });

      const req = {
        json: async () => ({ key: "community", status: "invalid" }),
      } as any;

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });

    it("should require key and status fields", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { role: "admin" },
        error: null,
      });

      const req = {
        json: async () => ({ key: "community" }),
      } as any;

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 401 for unauthenticated toggle", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const req = {
        json: async () => ({ key: "community", status: "hidden" }),
      } as any;

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin toggle", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { role: "user" },
        error: null,
      });

      const req = {
        json: async () => ({ key: "community", status: "hidden" }),
      } as any;

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });
});
