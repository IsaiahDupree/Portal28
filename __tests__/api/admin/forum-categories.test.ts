/**
 * Integration tests for Forum Categories API
 * Test IDs: PLT-FOR-C-004, PLT-FOR-C-005
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock NextResponse
const mockJson = jest.fn();
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: mockJson },
}));

// Mock Supabase server
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
  order: jest.fn(() => mockSupabase),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

describe("Forum Categories API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data, options) => ({ data, ...options }));
  });

  describe("POST /api/admin/forum-categories - Create Category (PLT-FOR-C-004)", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const { POST } = await import("@/app/api/admin/forum-categories/route");

      const mockReq = {
        json: async () => ({
          space_id: "space-123",
          slug: "test-category",
          name: "Test Category",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return 400 if request data is invalid", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const { POST } = await import("@/app/api/admin/forum-categories/route");

      const mockReq = {
        json: async () => ({
          // Missing required fields
          slug: "test-category",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid request data" }),
        { status: 400 }
      );
    });

    it("should create a new forum category with valid data", async () => {
      const validSpaceId = "550e8400-e29b-41d4-a716-446655440000";
      const validCatId = "650e8400-e29b-41d4-a716-446655440001";

      const mockCategory = {
        id: validCatId,
        space_id: validSpaceId,
        slug: "test-category",
        name: "Test Category",
        description: "A test category",
        icon: "📚",
        sort_order: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: mockCategory,
        error: null,
      });

      const { POST } = await import("@/app/api/admin/forum-categories/route");

      const mockReq = {
        json: async () => ({
          space_id: validSpaceId,
          slug: "test-category",
          name: "Test Category",
          description: "A test category",
          icon: "📚",
          sort_order: 0,
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(mockCategory, { status: 201 });
    });

    it("should return 409 if category slug already exists", async () => {
      // Use a valid UUID for space_id
      const validSpaceId = "550e8400-e29b-41d4-a716-446655440000";

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "Duplicate key value" },
      });

      const { POST } = await import("@/app/api/admin/forum-categories/route");

      const mockReq = {
        json: async () => ({
          space_id: validSpaceId,
          slug: "duplicate-slug",
          name: "Test Category",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "A category with this slug already exists in this space" },
        { status: 409 }
      );
    });
  });

  describe("GET /api/admin/forum-categories (PLT-FOR-C-005)", () => {
    it("should return 400 if space_id is missing", async () => {
      const { GET } = await import("@/app/api/admin/forum-categories/route");

      const mockReq = {
        url: "http://localhost:2828/api/admin/forum-categories",
      };

      await GET(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "space_id query parameter is required" },
        { status: 400 }
      );
    });

    it("should return categories sorted by sort_order", async () => {
      const mockCategories = [
        {
          id: "cat-1",
          space_id: "space-123",
          slug: "general",
          name: "General",
          sort_order: 0,
          is_active: true,
          thread_count: [{ count: 5 }],
        },
        {
          id: "cat-2",
          space_id: "space-123",
          slug: "help",
          name: "Help",
          sort_order: 1,
          is_active: true,
          thread_count: [{ count: 3 }],
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      const { GET } = await import("@/app/api/admin/forum-categories/route");

      const mockReq = {
        url: "http://localhost:2828/api/admin/forum-categories?space_id=space-123",
      };

      await GET(mockReq as any);

      expect(mockSupabase.from).toHaveBeenCalledWith("forum_categories");
      expect(mockSupabase.order).toHaveBeenCalledWith("sort_order", {
        ascending: true,
      });
      expect(mockJson).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "cat-1",
            thread_count: 5,
            sort_order: 0,
          }),
          expect.objectContaining({
            id: "cat-2",
            thread_count: 3,
            sort_order: 1,
          }),
        ]),
        { status: 200 }
      );
    });

    it("should return empty array if no categories exist", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const { GET } = await import("@/app/api/admin/forum-categories/route");

      const mockReq = {
        url: "http://localhost:2828/api/admin/forum-categories?space_id=space-123",
      };

      await GET(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith([], { status: 200 });
    });
  });
});
