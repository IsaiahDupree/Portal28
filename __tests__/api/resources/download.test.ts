// __tests__/api/resources/download.test.ts
// Test suite for Resource Download API
// Test IDs: PLT-RES-003

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockJson = jest.fn();
const mockNextResponseConstructor = jest.fn().mockImplementation((body, init) => {
  return { body, headers: init?.headers };
});

jest.mock("next/server", () => {
  const NextResponse: any = mockNextResponseConstructor;
  NextResponse.json = mockJson;
  return {
    NextRequest: jest.fn(),
    NextResponse,
  };
});

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
  storage: {
    from: jest.fn(() => ({
      download: jest.fn(),
    })),
  },
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

describe("Resource Download API - PLT-RES-003", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/resources/download/route");
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams("path=resources/folder-123/test.pdf"),
      },
    } as any;

    await GET(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 }
    );
  });

  it("should return 400 if path is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    const { GET } = await import("@/app/api/resources/download/route");
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
    } as any;

    await GET(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Path is required" },
      { status: 400 }
    );
  });

  it("should return 400 if path format is invalid", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    const { GET } = await import("@/app/api/resources/download/route");
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams("path=invalid/path"),
      },
    } as any;

    await GET(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Invalid path format" },
      { status: 400 }
    );
  });

  it("should return 404 if resource not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const { GET } = await import("@/app/api/resources/download/route");
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams("path=resources/folder-123/test.pdf"),
      },
    } as any;

    await GET(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Resource not found or access denied" },
      { status: 404 }
    );
  });

  it("should download file successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: {
        id: "item-123",
        folder_id: "folder-123",
      },
      error: null,
    });

    const mockBlob = new Blob(["test content"], { type: "application/pdf" });
    const mockDownload = jest.fn().mockResolvedValue({
      data: mockBlob,
      error: null,
    });

    mockSupabase.storage.from.mockReturnValue({
      download: mockDownload,
    });

    const { GET } = await import("@/app/api/resources/download/route");
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams("path=resources/folder-123/test.pdf"),
      },
    } as any;

    await GET(mockRequest);

    expect(mockDownload).toHaveBeenCalledWith("resources/folder-123/test.pdf");
    expect(mockNextResponseConstructor).toHaveBeenCalledWith(
      mockBlob,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="test.pdf"',
        }),
      })
    );
  });

  it("should return 500 if storage download fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: {
        id: "item-123",
        folder_id: "folder-123",
      },
      error: null,
    });

    const mockDownload = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Storage error" },
    });

    mockSupabase.storage.from.mockReturnValue({
      download: mockDownload,
    });

    const { GET } = await import("@/app/api/resources/download/route");
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams("path=resources/folder-123/test.pdf"),
      },
    } as any;

    await GET(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Failed to download file" },
      { status: 500 }
    );
  });
});
