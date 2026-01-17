// __tests__/api/community/forum-posts.test.ts
// Test suite for Forum Posts API
// Test IDs: PLT-FOR-P-001 through PLT-FOR-P-008

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { POST as createPost } from "@/app/api/community/forum/post/create/route";
import { PATCH as editPost, DELETE as deletePost } from "@/app/api/community/forum/post/[postId]/route";

const mockJson = jest.fn((data: any) => ({ json: data }));
const mockNextResponse = { json: mockJson };

jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse,
}));

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
  single: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

describe("Forum Posts API (PLT-FOR-P)", () => {
  const testUserId = "test-user-123";
  const testThreadId = "thread-123";
  const testPostId = "post-123";

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: testUserId } },
    });
  });

  describe("PLT-FOR-P-004: Create post API", () => {
    it("should create a post successfully", async () => {
      const mockThread = { id: testThreadId, is_locked: false };
      mockSupabase.single.mockResolvedValueOnce({ data: mockThread });
      mockSupabase.insert.mockResolvedValueOnce({ error: null });
      mockSupabase.update.mockResolvedValueOnce({ error: null });

      const req = {
        json: async () => ({
          threadId: testThreadId,
          body: "New reply content",
        }),
      } as any;

      await createPost(req);

      expect(mockSupabase.from).toHaveBeenCalledWith("forum_threads");
      expect(mockSupabase.from).toHaveBeenCalledWith("forum_posts");
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({ ok: true });
    });

    it("should reject empty body", async () => {
      const req = {
        json: async () => ({
          threadId: testThreadId,
          body: "   ",
        }),
      } as any;

      await createPost(req);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Thread ID and body are required" },
        { status: 400 }
      );
    });

    it("should reject post to locked thread", async () => {
      const mockThread = { id: testThreadId, is_locked: true };
      mockSupabase.single.mockResolvedValueOnce({ data: mockThread });

      const req = {
        json: async () => ({
          threadId: testThreadId,
          body: "Should fail",
        }),
      } as any;

      await createPost(req);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Thread is locked" },
        { status: 403 }
      );
    });

    it("should reject unauthenticated requests", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

      const req = {
        json: async () => ({
          threadId: testThreadId,
          body: "Should fail",
        }),
      } as any;

      await createPost(req);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("should handle thread not found", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null });

      const req = {
        json: async () => ({
          threadId: "nonexistent",
          body: "Should fail",
        }),
      } as any;

      await createPost(req);

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Thread not found" },
        { status: 404 }
      );
    });
  });

  describe("PLT-FOR-P-002: Edit own post", () => {
    it("should update post successfully", async () => {
      const mockPost = {
        id: testPostId,
        author_user_id: testUserId,
        thread_id: testThreadId,
      };
      mockSupabase.single.mockResolvedValueOnce({ data: mockPost });
      mockSupabase.update.mockResolvedValueOnce({ error: null });

      const req = {
        json: async () => ({ body: "Updated content" }),
      } as any;

      await editPost(req, { params: { postId: testPostId } });

      expect(mockSupabase.update).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({ ok: true });
    });

    it("should reject edit by non-author", async () => {
      const mockPost = {
        id: testPostId,
        author_user_id: "different-user",
        thread_id: testThreadId,
      };
      mockSupabase.single.mockResolvedValueOnce({ data: mockPost });

      const req = {
        json: async () => ({ body: "Unauthorized edit" }),
      } as any;

      await editPost(req, { params: { postId: testPostId } });

      expect(mockJson).toHaveBeenCalledWith(
        { error: "You can only edit your own posts" },
        { status: 403 }
      );
    });

    it("should reject empty body", async () => {
      const req = {
        json: async () => ({ body: "   " }),
      } as any;

      await editPost(req, { params: { postId: testPostId } });

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Body is required" },
        { status: 400 }
      );
    });

    it("should handle post not found", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null });

      const req = {
        json: async () => ({ body: "Updated content" }),
      } as any;

      await editPost(req, { params: { postId: "nonexistent" } });

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Post not found" },
        { status: 404 }
      );
    });
  });

  describe("PLT-FOR-P-003: Delete own post", () => {
    it("should delete post successfully", async () => {
      const mockPost = {
        id: testPostId,
        author_user_id: testUserId,
        thread_id: testThreadId,
      };
      mockSupabase.single.mockResolvedValueOnce({ data: mockPost });
      mockSupabase.delete.mockResolvedValueOnce({ error: null });

      const req = {} as any;

      await deletePost(req, { params: { postId: testPostId } });

      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({ ok: true });
    });

    it("should reject delete by non-author", async () => {
      const mockPost = {
        id: testPostId,
        author_user_id: "different-user",
        thread_id: testThreadId,
      };
      mockSupabase.single.mockResolvedValueOnce({ data: mockPost });

      const req = {} as any;

      await deletePost(req, { params: { postId: testPostId } });

      expect(mockJson).toHaveBeenCalledWith(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    });

    it("should handle post not found", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null });

      const req = {} as any;

      await deletePost(req, { params: { postId: "nonexistent" } });

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Post not found" },
        { status: 404 }
      );
    });

    it("should reject unauthenticated delete", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

      const req = {} as any;

      await deletePost(req, { params: { postId: testPostId } });

      expect(mockJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });
  });
});
