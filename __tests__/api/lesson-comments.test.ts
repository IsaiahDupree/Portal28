/**
 * Lesson Comments API Tests
 * Tests for feat-038: Lesson Comments with nested replies
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

// Mock implementations
jest.unstable_mockModule('@/lib/supabase/server', () => ({
  supabaseServer: jest.fn(() => mockSupabase),
}));

describe('Lesson Comments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/comments', () => {
    it('should return comments for a lesson', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Great lesson!',
          created_at: '2026-01-14T00:00:00Z',
          user_id: 'user-1',
          parent_comment_id: null,
          reply_count: 2,
          users: { email: 'test@example.com', full_name: 'Test User', avatar_url: null },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockComments,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      const { GET } = await import('@/app/api/comments/route');
      const req = new Request('http://localhost/api/comments?lessonId=lesson-1');
      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.comments).toHaveLength(1);
      expect(data.comments[0]).toHaveProperty('id', 'comment-1');
      expect(data.comments[0]).toHaveProperty('replyCount', 2);
      expect(data.comments[0]).toHaveProperty('parentCommentId', null);
    });

    it('should return 400 if lessonId is missing', async () => {
      const { GET } = await import('@/app/api/comments/route');
      const req = new Request('http://localhost/api/comments');
      const response = await GET(req as any);

      expect(response.status).toBe(400);
    });

    it('should only return top-level comments (no parent)', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockImplementation((field, value) => {
              expect(field).toBe('parent_comment_id');
              expect(value).toBe(null);
              return {
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              };
            }),
          }),
        }),
      });

      const { GET } = await import('@/app/api/comments/route');
      const req = new Request('http://localhost/api/comments?lessonId=lesson-1');
      await GET(req as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('lesson_comments');
    });
  });

  describe('POST /api/comments', () => {
    it('should create a new top-level comment', async () => {
      const newComment = {
        id: 'new-comment',
        user_id: 'user-1',
        lesson_id: 'lesson-1',
        content: 'New comment',
        created_at: '2026-01-14T00:00:00Z',
        parent_comment_id: null,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newComment,
              error: null,
            }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { email: 'test@example.com', full_name: 'Test User' },
              error: null,
            }),
          }),
        }),
      });

      const { POST } = await import('@/app/api/comments/route');
      const req = new Request('http://localhost/api/comments', {
        method: 'POST',
        body: JSON.stringify({ lessonId: 'lesson-1', content: 'New comment' }),
      });
      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.comment).toHaveProperty('id', 'new-comment');
      expect(data.comment).toHaveProperty('parentCommentId', null);
      expect(data.comment).toHaveProperty('replyCount', 0);
    });

    it('should create a reply to an existing comment', async () => {
      const parentComment = {
        id: 'parent-comment',
        lesson_id: 'lesson-1',
      };

      const newReply = {
        id: 'new-reply',
        user_id: 'user-1',
        lesson_id: 'lesson-1',
        content: 'Reply comment',
        parent_comment_id: 'parent-comment',
        created_at: '2026-01-14T00:00:00Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      let selectCallCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'lesson_comments') {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First call: verify parent comment
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: parentComment,
                    error: null,
                  }),
                }),
              }),
            };
          } else {
            // Second call: insert reply
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: newReply,
                    error: null,
                  }),
                }),
              }),
            };
          }
        } else {
          // users table
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { email: 'test@example.com', full_name: 'Test User' },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const { POST } = await import('@/app/api/comments/route');
      const req = new Request('http://localhost/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: 'lesson-1',
          content: 'Reply comment',
          parentCommentId: 'parent-comment',
        }),
      });
      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.comment).toHaveProperty('parentCommentId', 'parent-comment');
    });

    it('should return 401 if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { POST } = await import('@/app/api/comments/route');
      const req = new Request('http://localhost/api/comments', {
        method: 'POST',
        body: JSON.stringify({ lessonId: 'lesson-1', content: 'Test' }),
      });
      const response = await POST(req as any);

      expect(response.status).toBe(401);
    });

    it('should return 404 if parent comment not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const { POST } = await import('@/app/api/comments/route');
      const req = new Request('http://localhost/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: 'lesson-1',
          content: 'Reply',
          parentCommentId: 'nonexistent',
        }),
      });
      const response = await POST(req as any);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/comments/[id]/replies', () => {
    it('should return replies for a comment', async () => {
      const mockReplies = [
        {
          id: 'reply-1',
          content: 'Reply content',
          created_at: '2026-01-14T00:00:00Z',
          user_id: 'user-2',
          parent_comment_id: 'comment-1',
          reply_count: 0,
          users: { email: 'user2@example.com', full_name: 'User 2', avatar_url: null },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockReplies,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      const { GET } = await import('@/app/api/comments/[id]/replies/route');
      const response = await GET({} as any, { params: { id: 'comment-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.replies).toHaveLength(1);
      expect(data.replies[0]).toHaveProperty('parentCommentId', 'comment-1');
    });
  });

  describe('DELETE /api/admin/comments/[id]', () => {
    it('should allow admin to delete any comment', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user' } },
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        callCount++;
        if (callCount === 1) {
          // First call: check admin role
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Second call: delete comment
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
      });

      const { DELETE } = await import('@/app/api/admin/comments/[id]/route');
      const response = await DELETE({} as any, { params: { id: 'comment-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 403 if user is not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'regular-user' } },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      });

      const { DELETE } = await import('@/app/api/admin/comments/[id]/route');
      const response = await DELETE({} as any, { params: { id: 'comment-1' } });

      expect(response.status).toBe(403);
    });
  });
});
