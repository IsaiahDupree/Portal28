// __tests__/api/community/resources/item-create.test.ts
// Test suite for Resource Item Creation API
// Test IDs: PLT-RES-007

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
  insert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

describe("Resource Item Creation API - PLT-RES-007", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/community/resources/item/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({}),
    } as any;

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 }
    );
  });

  it("should return 403 if user is not admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: { role: "member" },
      error: null,
    });

    const { POST } = await import("@/app/api/community/resources/item/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        folderId: "folder-123",
        kind: "file",
        title: "Test File",
      }),
    } as any;

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Forbidden" },
      { status: 403 }
    );
  });

  it("should return 400 if required fields are missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-123", email: "admin@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    const { POST } = await import("@/app/api/community/resources/item/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        // Missing required fields
      }),
    } as any;

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Folder ID, kind, and title are required" },
      { status: 400 }
    );
  });

  it("should return 400 if kind is invalid", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-123", email: "admin@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    const { POST } = await import("@/app/api/community/resources/item/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        folderId: "folder-123",
        kind: "invalid-kind",
        title: "Test Item",
      }),
    } as any;

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Invalid kind" },
      { status: 400 }
    );
  });

  it("should create link item successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-123", email: "admin@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    mockSupabase.insert.mockResolvedValue({
      error: null,
    });

    const { POST } = await import("@/app/api/community/resources/item/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        folderId: "folder-123",
        kind: "link",
        title: "Test Link",
        url: "https://example.com",
        description: "Test description",
      }),
    } as any;

    await POST(mockRequest);

    expect(mockSupabase.insert).toHaveBeenCalledWith({
      folder_id: "folder-123",
      kind: "link",
      title: "Test Link",
      description: "Test description",
      url: "https://example.com",
      body: null,
      storage_path: null,
    });

    expect(mockJson).toHaveBeenCalledWith({ ok: true });
  });

  it("should create file item successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-123", email: "admin@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    mockSupabase.insert.mockResolvedValue({
      error: null,
    });

    const { POST } = await import("@/app/api/community/resources/item/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        folderId: "folder-123",
        kind: "file",
        title: "Test File",
        storagePath: "resources/folder-123/test.pdf",
      }),
    } as any;

    await POST(mockRequest);

    expect(mockSupabase.insert).toHaveBeenCalledWith({
      folder_id: "folder-123",
      kind: "file",
      title: "Test File",
      description: null,
      url: null,
      body: null,
      storage_path: "resources/folder-123/test.pdf",
    });

    expect(mockJson).toHaveBeenCalledWith({ ok: true });
  });

  it("should create note item successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-123", email: "admin@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    mockSupabase.insert.mockResolvedValue({
      error: null,
    });

    const { POST } = await import("@/app/api/community/resources/item/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        folderId: "folder-123",
        kind: "note",
        title: "Test Note",
        body: "This is a test note content",
      }),
    } as any;

    await POST(mockRequest);

    expect(mockSupabase.insert).toHaveBeenCalledWith({
      folder_id: "folder-123",
      kind: "note",
      title: "Test Note",
      description: null,
      url: null,
      body: "This is a test note content",
      storage_path: null,
    });

    expect(mockJson).toHaveBeenCalledWith({ ok: true });
  });
});
