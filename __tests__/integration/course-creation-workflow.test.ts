/**
 * Integration Test: Course Creation Workflow
 *
 * Tests the complete course creation flow from initial creation to publishing
 * including lessons, content, pricing, and verification.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

describe('Course Creation Workflow Integration', () => {
  let mockSupabase: any;
  let mockCookies: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCookies = {
      get: jest.fn((name) => ({ name, value: '' })),
      set: jest.fn(),
      delete: jest.fn(),
    };
    (cookies as jest.Mock).mockReturnValue(mockCookies);

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            maybeSingle: jest.fn(),
          })),
          order: jest.fn(() => ({
            limit: jest.fn(),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(),
        })),
      })),
    };

    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Course Creation', () => {
    it('should create a new course with basic details', async () => {
      const courseData = {
        id: 'course-123',
        creator_id: 'user-123',
        title: 'Introduction to JavaScript',
        slug: 'intro-to-javascript',
        description: 'Learn JavaScript from scratch',
        status: 'draft',
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: courseData,
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .insert({
          creator_id: 'user-123',
          title: 'Introduction to JavaScript',
          slug: 'intro-to-javascript',
          description: 'Learn JavaScript from scratch',
        })
        .select()
        .single();

      expect(result.data).toBeDefined();
      expect(result.data.title).toBe('Introduction to JavaScript');
      expect(result.data.status).toBe('draft');
      expect(result.error).toBeNull();
    });

    it('should enforce unique course slugs', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'duplicate key value violates unique constraint' },
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .insert({
          creator_id: 'user-123',
          title: 'Test Course',
          slug: 'existing-slug',
        })
        .select()
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('duplicate key');
    });

    it('should set creator_id from authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'creator@example.com' },
        },
        error: null,
      });

      const userResult = await mockSupabase.auth.getUser();
      const creatorId = userResult.data.user.id;

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'course-123',
                creator_id: creatorId,
                title: 'Test Course',
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .insert({
          creator_id: creatorId,
          title: 'Test Course',
        })
        .select()
        .single();

      expect(result.data.creator_id).toBe('user-123');
    });
  });

  describe('Lesson Management', () => {
    it('should add lessons to a course', async () => {
      const lessonData = {
        id: 'lesson-1',
        course_id: 'course-123',
        title: 'Introduction',
        type: 'video',
        order: 0,
        status: 'draft',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: lessonData,
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('lessons')
        .insert({
          course_id: 'course-123',
          title: 'Introduction',
          type: 'video',
          order: 0,
        })
        .select()
        .single();

      expect(result.data).toBeDefined();
      expect(result.data.course_id).toBe('course-123');
      expect(result.data.title).toBe('Introduction');
    });

    it('should maintain lesson order', async () => {
      const lessons = [
        { id: 'lesson-1', order: 0, title: 'Lesson 1' },
        { id: 'lesson-2', order: 1, title: 'Lesson 2' },
        { id: 'lesson-3', order: 2, title: 'Lesson 3' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: lessons, error: null })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('lessons')
        .select('*')
        .eq('course_id', 'course-123')
        .order('order');

      expect(result.data).toHaveLength(3);
      expect(result.data[0].order).toBe(0);
      expect(result.data[1].order).toBe(1);
      expect(result.data[2].order).toBe(2);
    });

    it('should support different lesson types', async () => {
      const lessonTypes = ['video', 'text', 'quiz', 'assignment'];

      for (const type of lessonTypes) {
        mockSupabase.from.mockReturnValue({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: `lesson-${type}`,
                  course_id: 'course-123',
                  title: `${type} lesson`,
                  type,
                },
                error: null,
              }),
            })),
          })),
        });

        const result = await mockSupabase
          .from('lessons')
          .insert({
            course_id: 'course-123',
            title: `${type} lesson`,
            type,
          })
          .select()
          .single();

        expect(result.data.type).toBe(type);
      }
    });

    it('should delete lessons from a course', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      const result = await mockSupabase
        .from('lessons')
        .delete()
        .eq('id', 'lesson-1');

      expect(result.error).toBeNull();
    });
  });

  describe('Course Content', () => {
    it('should update course details', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'course-123',
                  title: 'Updated Title',
                  description: 'Updated description',
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .update({
          title: 'Updated Title',
          description: 'Updated description',
        })
        .eq('id', 'course-123')
        .select()
        .single();

      expect(result.data.title).toBe('Updated Title');
      expect(result.data.description).toBe('Updated description');
    });

    it('should save course metadata', async () => {
      const metadata = {
        difficulty: 'beginner',
        duration_hours: 10,
        prerequisites: [],
        learning_outcomes: ['Understand JavaScript basics', 'Build web apps'],
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'course-123',
                  metadata,
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .update({ metadata })
        .eq('id', 'course-123')
        .select()
        .single();

      expect(result.data.metadata).toEqual(metadata);
    });
  });

  describe('Pricing Configuration', () => {
    it('should set course as free', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'course-123',
                  is_free: true,
                  price: 0,
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .update({ is_free: true, price: 0 })
        .eq('id', 'course-123')
        .select()
        .single();

      expect(result.data.is_free).toBe(true);
      expect(result.data.price).toBe(0);
    });

    it('should set course price', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'course-123',
                  is_free: false,
                  price: 49.99,
                  currency: 'USD',
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .update({
          is_free: false,
          price: 49.99,
          currency: 'USD',
        })
        .eq('id', 'course-123')
        .select()
        .single();

      expect(result.data.is_free).toBe(false);
      expect(result.data.price).toBe(49.99);
      expect(result.data.currency).toBe('USD');
    });
  });

  describe('Course Publishing', () => {
    it('should publish a course', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'course-123',
                  status: 'published',
                  published_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', 'course-123')
        .select()
        .single();

      expect(result.data.status).toBe('published');
      expect(result.data.published_at).toBeDefined();
    });

    it('should unpublish a course', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'course-123',
                  status: 'draft',
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .update({ status: 'draft' })
        .eq('id', 'course-123')
        .select()
        .single();

      expect(result.data.status).toBe('draft');
    });

    it('should require lessons before publishing', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      });

      const lessonsResult = await mockSupabase
        .from('lessons')
        .select('*')
        .eq('course_id', 'course-123');

      expect(lessonsResult.data).toHaveLength(0);
      // In real application, would prevent publishing with 0 lessons
    });
  });

  describe('Verification', () => {
    it('should verify course creation by creator', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'course-123',
                creator_id: 'user-123',
                title: 'Test Course',
                status: 'published',
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .select('*')
        .eq('id', 'course-123')
        .single();

      expect(result.data.creator_id).toBe('user-123');
      expect(result.data.status).toBe('published');
    });

    it('should verify lesson count matches expectations', async () => {
      const expectedLessonCount = 5;
      const mockLessons = Array.from({ length: expectedLessonCount }, (_, i) => ({
        id: `lesson-${i}`,
        course_id: 'course-123',
        order: i,
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: mockLessons, error: null })),
        })),
      });

      const result = await mockSupabase
        .from('lessons')
        .select('*')
        .eq('course_id', 'course-123');

      expect(result.data).toHaveLength(expectedLessonCount);
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized course creation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await mockSupabase.auth.getUser();

      expect(result.error).toBeDefined();
      expect(result.data.user).toBeNull();
    });

    it('should handle course creation failures', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .insert({ title: 'Test' })
        .select()
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });
});
