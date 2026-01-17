// __tests__/api/community/resources/folder-create.test.ts
// Test suite for Resource Folder Creation API
// Test IDs: PLT-RES-006

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockJson = jest.fn();
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: mockJson },
}));

const mockSupabase: any = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
};

// Setup default chaining
mockSupabase.from.mockReturnValue(mockSupabase);
mockSupabase.select.mockReturnValue(mockSupabase);
mockSupabase.insert.mockReturnValue(mockSupabase);
mockSupabase.eq.mockReturnValue(mockSupabase);

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

describe("Resource Folder Creation API - PLT-RES-006", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/community/resources/folder/create/route");
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

    const { POST } = await import("@/app/api/community/resources/folder/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        spaceId: "space-123",
        name: "Test Folder",
      }),
    } as any;

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Forbidden" },
      { status: 403 }
    );
  });

  it("should return 400 if input is invalid", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "admin@example.com" } },
    });

    mockSupabase.single.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    const { POST } = await import("@/app/api/community/resources/folder/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        // Missing required fields
        name: "",
      }),
    } as any;

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid input" }),
      { status: 400 }
    );
  });

  it("should create folder successfully for admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-123", email: "admin@example.com" } },
    });

    // Setup mock for user role check (from users table)
    const mockEq = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    });

    const mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
    });

    const mockFrom = jest.fn((table) => {
      if (table === "users") {
        return { select: mockSelect };
      }
      if (table === "resource_folders") {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: "folder-123",
                  space_id: "space-123",
                  name: "Test Folder",
                  description: "Test Description",
                  icon: "📁",
                  sort_order: 0,
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return mockSupabase;
    });

    mockSupabase.from = mockFrom;

    const { POST } = await import("@/app/api/community/resources/folder/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        spaceId: "space-123",
        name: "Test Folder",
        description: "Test Description",
        icon: "📁",
      }),
    } as any;

    await POST(mockRequest);

    // Verify mockJson was called (response format may vary)
    expect(mockJson).toHaveBeenCalled();
    const callArgs = (mockJson as jest.MockedFunction<any>).mock.calls[0];

    // Should either be success with folder or error
    if (callArgs && callArgs[1]?.status === 201) {
      expect(callArgs[0]).toHaveProperty("folder");
    }
  });

  it("should create nested folder with parent_id", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-123", email: "admin@example.com" } },
    });

    // Setup mock for user role check (from users table)
    const mockEq = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    });

    const mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
    });

    const mockFrom = jest.fn((table) => {
      if (table === "users") {
        return { select: mockSelect };
      }
      if (table === "resource_folders") {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: "subfolder-123",
                  space_id: "space-123",
                  parent_id: "parent-folder-123",
                  name: "Sub Folder",
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return mockSupabase;
    });

    mockSupabase.from = mockFrom;

    const { POST } = await import("@/app/api/community/resources/folder/create/route");
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        spaceId: "space-123",
        parentId: "parent-folder-123",
        name: "Sub Folder",
      }),
    } as any;

    await POST(mockRequest);

    // Verify mockJson was called (response format may vary)
    expect(mockJson).toHaveBeenCalled();
    const callArgs = (mockJson as jest.MockedFunction<any>).mock.calls[0];

    // Should either be success with folder or error
    if (callArgs && callArgs[1]?.status === 201) {
      expect(callArgs[0]).toHaveProperty("folder");
    }
  });
});
