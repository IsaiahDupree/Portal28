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
  is: jest.fn(() => mockSupabase),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

// Mock community query functions
const mockCreateCommunitySpace = jest.fn();
const mockGetSpaceBySlug = jest.fn();
const mockGetUserAccessibleSpaces = jest.fn();
const mockUserHasSpaceAccess = jest.fn();
const mockIsSpaceMember = jest.fn();

jest.mock("@/lib/community/queries", () => ({
  createCommunitySpace: mockCreateCommunitySpace,
  getSpaceBySlug: mockGetSpaceBySlug,
  getUserAccessibleSpaces: mockGetUserAccessibleSpaces,
  userHasSpaceAccess: mockUserHasSpaceAccess,
  isSpaceMember: mockIsSpaceMember,
}));

describe("Community Spaces API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data, options) => ({ data, ...options }));
  });

  describe("POST /api/admin/community/spaces - Create Space (PLT-SPC-001)", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/admin/community/spaces/route");

      const mockReq = {
        json: async () => ({
          slug: "test-space",
          name: "Test Space",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return 400 for invalid slug format", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const { POST } = await import("@/app/api/admin/community/spaces/route");

      const mockReq = {
        json: async () => ({
          slug: "Invalid Slug!", // Contains spaces and special characters
          name: "Test Space",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid input" }),
        { status: 400 }
      );
    });

    it("should create a new space with valid input", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockSpace = {
        id: "space-123",
        slug: "test-space",
        name: "Test Space",
        description: "A test space",
        is_active: true,
        created_at: new Date().toISOString(),
      };

      mockCreateCommunitySpace.mockResolvedValue(mockSpace);

      const { POST } = await import("@/app/api/admin/community/spaces/route");

      const mockReq = {
        json: async () => ({
          slug: "test-space",
          name: "Test Space",
          description: "A test space",
        }),
      };

      await POST(mockReq as any);

      expect(mockCreateCommunitySpace).toHaveBeenCalledWith(
        "test-space",
        "Test Space",
        "A test space"
      );

      expect(mockJson).toHaveBeenCalledWith({ space: mockSpace }, { status: 201 });
    });

    it("should return 400 if space creation fails (duplicate slug)", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      mockCreateCommunitySpace.mockResolvedValue(null);

      const { POST } = await import("@/app/api/admin/community/spaces/route");

      const mockReq = {
        json: async () => ({
          slug: "existing-space",
          name: "Existing Space",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Failed to create space. Slug may already exist." },
        { status: 400 }
      );
    });
  });

  describe("GET /api/community/spaces/[slug] - Get Space by Slug (PLT-SPC-002)", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import(
        "@/app/api/community/spaces/[slug]/route"
      );

      const mockReq = {} as any;
      const mockParams = { params: Promise.resolve({ slug: "portal28" }) };

      await GET(mockReq, mockParams);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return 404 if space not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      mockGetSpaceBySlug.mockResolvedValue(null);

      const { GET } = await import(
        "@/app/api/community/spaces/[slug]/route"
      );

      const mockReq = {} as any;
      const mockParams = { params: Promise.resolve({ slug: "nonexistent" }) };

      await GET(mockReq, mockParams);

      expect(mockGetSpaceBySlug).toHaveBeenCalledWith("nonexistent");
      expect(mockJson).toHaveBeenCalledWith(
        { error: "Space not found" },
        { status: 404 }
      );
    });

    it("should return space data for valid slug", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockSpace = {
        id: "space-123",
        slug: "portal28",
        name: "Portal28 Community",
        description: "Main community space",
        is_active: true,
        created_at: new Date().toISOString(),
      };

      mockGetSpaceBySlug.mockResolvedValue(mockSpace);

      const { GET } = await import(
        "@/app/api/community/spaces/[slug]/route"
      );

      const mockReq = {} as any;
      const mockParams = { params: Promise.resolve({ slug: "portal28" }) };

      await GET(mockReq, mockParams);

      expect(mockGetSpaceBySlug).toHaveBeenCalledWith("portal28");
      expect(mockJson).toHaveBeenCalledWith({ space: mockSpace }, { status: 200 });
    });
  });

  describe("GET /api/community/spaces - List User Spaces (PLT-SPC-003)", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/community/spaces/route");

      const mockReq = {} as any;

      await GET(mockReq);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return accessible spaces for authenticated user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockSpaces = [
        {
          id: "space-1",
          slug: "portal28",
          name: "Portal28 Community",
          is_active: true,
        },
        {
          id: "space-2",
          slug: "vip-lounge",
          name: "VIP Lounge",
          is_active: true,
        },
      ];

      mockGetUserAccessibleSpaces.mockResolvedValue(mockSpaces);

      const { GET } = await import("@/app/api/community/spaces/route");

      const mockReq = {} as any;

      await GET(mockReq);

      expect(mockGetUserAccessibleSpaces).toHaveBeenCalledWith("user-123");
      expect(mockJson).toHaveBeenCalledWith(
        { spaces: mockSpaces },
        { status: 200 }
      );
    });

    it("should return empty array if user has no accessible spaces", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      mockGetUserAccessibleSpaces.mockResolvedValue([]);

      const { GET } = await import("@/app/api/community/spaces/route");

      const mockReq = {} as any;

      await GET(mockReq);

      expect(mockJson).toHaveBeenCalledWith({ spaces: [] }, { status: 200 });
    });
  });

  describe("GET /api/community/spaces/[slug]/membership - Membership Check (PLT-SPC-004)", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import(
        "@/app/api/community/spaces/[slug]/membership/route"
      );

      const mockReq = {} as any;
      const mockParams = { params: Promise.resolve({ slug: "portal28" }) };

      await GET(mockReq, mockParams);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should return 404 if space not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      mockGetSpaceBySlug.mockResolvedValue(null);

      const { GET } = await import(
        "@/app/api/community/spaces/[slug]/membership/route"
      );

      const mockReq = {} as any;
      const mockParams = { params: Promise.resolve({ slug: "nonexistent" }) };

      await GET(mockReq, mockParams);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Space not found" },
        { status: 404 }
      );
    });

    it("should validate user access and membership for existing space", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockSpace = {
        id: "space-123",
        slug: "portal28",
        name: "Portal28 Community",
        is_active: true,
      };

      mockGetSpaceBySlug.mockResolvedValue(mockSpace);
      mockUserHasSpaceAccess.mockResolvedValue(true);
      mockIsSpaceMember.mockResolvedValue(true);

      const { GET } = await import(
        "@/app/api/community/spaces/[slug]/membership/route"
      );

      const mockReq = {} as any;
      const mockParams = { params: Promise.resolve({ slug: "portal28" }) };

      await GET(mockReq, mockParams);

      expect(mockUserHasSpaceAccess).toHaveBeenCalledWith("user-123", "space-123");
      expect(mockIsSpaceMember).toHaveBeenCalledWith("user-123", "space-123");

      expect(mockJson).toHaveBeenCalledWith(
        {
          hasAccess: true,
          isMember: true,
          spaceId: "space-123",
          spaceName: "Portal28 Community",
        },
        { status: 200 }
      );
    });

    it("should return false for non-member user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const mockSpace = {
        id: "space-123",
        slug: "vip-lounge",
        name: "VIP Lounge",
        is_active: true,
      };

      mockGetSpaceBySlug.mockResolvedValue(mockSpace);
      mockUserHasSpaceAccess.mockResolvedValue(true);
      mockIsSpaceMember.mockResolvedValue(false);

      const { GET } = await import(
        "@/app/api/community/spaces/[slug]/membership/route"
      );

      const mockReq = {} as any;
      const mockParams = { params: Promise.resolve({ slug: "vip-lounge" }) };

      await GET(mockReq, mockParams);

      expect(mockJson).toHaveBeenCalledWith(
        {
          hasAccess: true,
          isMember: false,
          spaceId: "space-123",
          spaceName: "VIP Lounge",
        },
        { status: 200 }
      );
    });
  });
});
