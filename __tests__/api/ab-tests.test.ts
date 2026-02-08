import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock NextRequest and NextResponse
const mockJson = jest.fn();
const mockNextResponse = {
  json: mockJson,
};

jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse,
}));

// Mock Supabase
const mockAdminUser = { id: "admin-123", email: "admin@example.com" };
const mockRegularUser = { id: "user-456", email: "user@example.com" };

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(),
  maybeSingle: jest.fn(),
};

const mockSupabaseAdmin = {
  from: jest.fn(() => mockSupabaseAdmin),
  select: jest.fn(() => mockSupabaseAdmin),
  insert: jest.fn(() => mockSupabaseAdmin),
  update: jest.fn(() => mockSupabaseAdmin),
  delete: jest.fn(() => mockSupabaseAdmin),
  eq: jest.fn(() => mockSupabaseAdmin),
  order: jest.fn(() => mockSupabaseAdmin),
  single: jest.fn(),
  maybeSingle: jest.fn(),
  rpc: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

describe("A/B Testing API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data, options) => ({ data, ...options }));
  });

  describe("POST /api/admin/ab-tests - Create Test", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/admin/ab-tests/route");

      const mockReq = {
        json: async () => ({
          name: "Test A",
          test_type: "pricing",
          variants: [
            { name: "Control", is_control: true, traffic_weight: 50, config: {} },
            { name: "Variant A", is_control: false, traffic_weight: 50, config: {} },
          ],
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return 403 when user is not admin", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockRegularUser } });
      mockSupabase.single.mockResolvedValue({
        data: { id: mockRegularUser.id, role: "student" },
      });

      const { POST } = await import("@/app/api/admin/ab-tests/route");

      const mockReq = {
        json: async () => ({
          name: "Test A",
          test_type: "pricing",
          variants: [
            { name: "Control", is_control: true, traffic_weight: 50, config: {} },
            { name: "Variant A", is_control: false, traffic_weight: 50, config: {} },
          ],
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Forbidden" },
        { status: 403 }
      );
    });

    it("should return 400 when variant weights don't sum to 100", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser } });
      mockSupabase.single.mockResolvedValue({
        data: { id: mockAdminUser.id, role: "admin" },
      });

      const { POST } = await import("@/app/api/admin/ab-tests/route");

      const mockReq = {
        json: async () => ({
          name: "Test A",
          test_type: "pricing",
          variants: [
            { name: "Control", is_control: true, traffic_weight: 40, config: {} },
            { name: "Variant A", is_control: false, traffic_weight: 50, config: {} },
          ],
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Variant traffic weights must sum to 100" },
        { status: 400 }
      );
    });

    it("should return 400 when multiple control variants exist", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser } });
      mockSupabase.single.mockResolvedValue({
        data: { id: mockAdminUser.id, role: "admin" },
      });

      const { POST } = await import("@/app/api/admin/ab-tests/route");

      const mockReq = {
        json: async () => ({
          name: "Test A",
          test_type: "pricing",
          variants: [
            { name: "Control 1", is_control: true, traffic_weight: 50, config: {} },
            { name: "Control 2", is_control: true, traffic_weight: 50, config: {} },
          ],
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Exactly one variant must be marked as control" },
        { status: 400 }
      );
    });

    it("should create test with variants successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser } });
      mockSupabase.single.mockResolvedValue({
        data: { id: mockAdminUser.id, role: "admin" },
      });

      const mockTest = {
        id: "test-123",
        name: "Pricing Test",
        test_type: "pricing",
        status: "draft",
        created_by: mockAdminUser.id,
      };

      const mockVariants = [
        { id: "var-1", name: "Control", is_control: true, test_id: "test-123" },
        { id: "var-2", name: "Variant A", is_control: false, test_id: "test-123" },
      ];

      mockSupabaseAdmin.single.mockResolvedValueOnce({ data: mockTest, error: null });
      mockSupabaseAdmin.select.mockResolvedValueOnce({ data: mockVariants, error: null });

      const { POST } = await import("@/app/api/admin/ab-tests/route");

      const mockReq = {
        json: async () => ({
          name: "Pricing Test",
          test_type: "pricing",
          variants: [
            { name: "Control", is_control: true, traffic_weight: 50, config: {} },
            { name: "Variant A", is_control: false, traffic_weight: 50, config: {} },
          ],
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          test: expect.objectContaining({
            id: "test-123",
            name: "Pricing Test",
          }),
        }),
        { status: 201 }
      );
    });
  });

  describe("POST /api/ab-tests/assign - Variant Assignment", () => {
    it("should return 404 when test not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockRegularUser } });
      mockSupabaseAdmin.single.mockResolvedValue({ data: null, error: { message: "Not found" } });

      const { POST } = await import("@/app/api/ab-tests/assign/route");

      const mockReq = {
        json: async () => ({
          test_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Test not found" },
        { status: 404 }
      );
    });

    it("should return 400 when test is not active", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockRegularUser } });
      mockSupabaseAdmin.single.mockResolvedValue({
        data: { id: "550e8400-e29b-41d4-a716-446655440000", status: "draft", traffic_allocation: 100 },
        error: null,
      });

      const { POST } = await import("@/app/api/ab-tests/assign/route");

      const mockReq = {
        json: async () => ({
          test_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Test is not active" },
        { status: 400 }
      );
    });

    it("should return existing assignment if user already assigned", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockRegularUser } });

      const mockTest = { id: "test-123", status: "active", traffic_allocation: 100 };
      const mockExistingAssignment = {
        id: "assign-1",
        test_id: "test-123",
        variant_id: "var-1",
        variant: { id: "var-1", name: "Control" },
      };

      mockSupabaseAdmin.single
        .mockResolvedValueOnce({ data: mockTest, error: null });

      mockSupabaseAdmin.maybeSingle
        .mockResolvedValueOnce({ data: mockExistingAssignment, error: null });

      const { POST } = await import("@/app/api/ab-tests/assign/route");

      const mockReq = {
        json: async () => ({
          test_id: "test-123",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          assignment: mockExistingAssignment,
          variant: mockExistingAssignment.variant,
        })
      );
    });
  });

  describe("POST /api/ab-tests/track - Event Tracking", () => {
    it("should return 404 when assignment not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockRegularUser } });
      mockSupabaseAdmin.maybeSingle.mockResolvedValue({ data: null, error: null });

      const { POST } = await import("@/app/api/ab-tests/track/route");

      const mockReq = {
        json: async () => ({
          test_id: "test-123",
          variant_id: "var-1",
          event_type: "purchase",
          event_value: 99.99,
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "No assignment found for this user and test" },
        { status: 404 }
      );
    });

    it("should track event successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockRegularUser } });

      const mockAssignment = { id: "assign-1" };
      const mockEvent = {
        id: "event-1",
        test_id: "test-123",
        variant_id: "var-1",
        assignment_id: "assign-1",
        event_type: "purchase",
        event_value: 99.99,
      };

      mockSupabaseAdmin.maybeSingle.mockResolvedValue({ data: mockAssignment, error: null });
      mockSupabaseAdmin.single.mockResolvedValue({ data: mockEvent, error: null });

      const { POST } = await import("@/app/api/ab-tests/track/route");

      const mockReq = {
        json: async () => ({
          test_id: "test-123",
          variant_id: "var-1",
          event_type: "purchase",
          event_value: 99.99,
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { event: mockEvent },
        { status: 201 }
      );
    });
  });
});
