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
const mockUser = { id: "user-123", email: "test@example.com" };
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

describe("Progress API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data, options) => ({ data, ...options }));
  });

  describe("POST /api/progress/lesson", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/progress/lesson/route");

      const mockReq = {
        json: async () => ({
          lessonId: "lesson-123",
          courseId: "course-456",
          status: "completed",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return 400 when lessonId is missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const { POST } = await import("@/app/api/progress/lesson/route");

      const mockReq = {
        json: async () => ({
          courseId: "course-456",
          status: "completed",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        expect.objectContaining({ status: 400 })
      );
    });

    it("should update progress successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "progress-1",
          lesson_id: "lesson-123",
          status: "completed",
        },
        error: null,
      });

      const { POST } = await import("@/app/api/progress/lesson/route");

      const mockReq = {
        json: async () => ({
          lessonId: "lesson-123",
          courseId: "course-456",
          status: "completed",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true })
      );
    });
  });

  describe("GET /api/progress/lesson", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/progress/lesson/route");

      const mockReq = {
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      };

      await GET(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });
  });
});
