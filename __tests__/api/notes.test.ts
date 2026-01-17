// __tests__/api/notes.test.ts
// Test suite for Lesson Notes API
// Test IDs: PLT-NOT-005, PLT-NOT-006

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
  upsert: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

// Mock Request class for tests
class MockRequest {
  public nextUrl: { searchParams: URLSearchParams };
  public method: string;
  private body: any;

  constructor(url: string, init?: { method?: string; body?: string }) {
    const urlObj = new URL(url);
    this.nextUrl = { searchParams: urlObj.searchParams };
    this.method = init?.method || "GET";
    this.body = init?.body;
  }

  async json() {
    return JSON.parse(this.body);
  }
}

global.Request = MockRequest as any;

describe("Notes API - feat-037", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // Reset module cache before each test
    mockJson.mockImplementation((data) => ({
      json: async () => data,
      status: 200,
    }));
  });

  describe("GET /api/notes - PLT-NOT-005", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      mockJson.mockReturnValue({
        json: async () => ({ error: "Unauthorized" }),
        status: 401,
      });

      const { GET } = await import("@/app/api/notes/route");
      const req = {
        nextUrl: { searchParams: { get: () => "123" } },
      };

      const response = await GET(req as any);
      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return 400 if lessonId is missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const { GET } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes");
      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("lessonId required");
    });

    it("should fetch note for authenticated user", async () => {
      const mockNote = {
        id: "note-123",
        user_id: "user-123",
        lesson_id: "lesson-123",
        content: "Test note content",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest
        .fn()
        .mockResolvedValue({ data: mockNote, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
      });

      const { GET } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes?lessonId=lesson-123");
      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.note).toEqual(mockNote);
      expect(mockSupabase.from).toHaveBeenCalledWith("lesson_notes");
    });

    it("should return null if note does not exist", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
      });

      const { GET } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes?lessonId=lesson-123");
      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.note).toBeNull();
    });
  });

  describe("POST /api/notes", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({ lessonId: "lesson-123", content: "Test" }),
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if lessonId is missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const { POST } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({ content: "Test" }),
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("lessonId required");
    });

    it("should upsert note for authenticated user", async () => {
      const mockNote = {
        id: "note-123",
        user_id: "user-123",
        lesson_id: "lesson-123",
        content: "New note content",
        updated_at: new Date().toISOString(),
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest
        .fn()
        .mockResolvedValue({ data: mockNote, error: null });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
        select: mockSelect,
        single: mockSingle,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { POST } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({
          lessonId: "lesson-123",
          content: "New note content",
        }),
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.note).toEqual(mockNote);
      expect(mockSupabase.from).toHaveBeenCalledWith("lesson_notes");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          lesson_id: "lesson-123",
          content: "New note content",
        }),
        { onConflict: "user_id,lesson_id" }
      );
    });

    it("should handle empty content", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { content: "" },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
        select: mockSelect,
        single: mockSingle,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { POST } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({
          lessonId: "lesson-123",
          content: "",
        }),
      });

      const response = await POST(req as any);

      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "",
        }),
        { onConflict: "user_id,lesson_id" }
      );
    });
  });

  describe("DELETE /api/notes", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { DELETE } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes?lessonId=123", {
        method: "DELETE",
      });

      const response = await DELETE(req as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if lessonId is missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const { DELETE } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes", {
        method: "DELETE",
      });

      const response = await DELETE(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("lessonId required");
    });

    it("should delete note for authenticated user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn();

      // Create a chain where each .eq() returns an object with .eq() method
      const eqChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockEq.mockReturnValue(eqChain);

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      const { DELETE } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes?lessonId=lesson-123", {
        method: "DELETE",
      });

      const response = await DELETE(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("lesson_notes");
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should return 500 if delete fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn();

      // Create a chain where each .eq() returns an object with .eq() method
      const eqChain = {
        eq: jest.fn().mockResolvedValue({ error: { message: "Database error" } }),
      };

      mockEq.mockReturnValue(eqChain);

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      const { DELETE } = await import("@/app/api/notes/route");
      const req = new Request("http://localhost/api/notes?lessonId=lesson-123", {
        method: "DELETE",
      });

      const response = await DELETE(req as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });
  });
});
