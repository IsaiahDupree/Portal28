import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// Validation schema for advanced search
const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200, 'Search query too long'),
  type: z.enum(['all', 'courses', 'lessons', 'forums', 'resources']).optional().default('all'),
  category: z.string().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  instructorId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    // Validate input with advanced filters
    const validation = searchSchema.safeParse({
      q: searchParams.get('q'),
      type: searchParams.get('type'),
      category: searchParams.get('category'),
      priceMin: searchParams.get('priceMin'),
      priceMax: searchParams.get('priceMax'),
      instructorId: searchParams.get('instructorId'),
      courseId: searchParams.get('courseId'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const params = validation.data;
    const supabase = await createClient();

    const results: any = {
      query: params.q,
      type: params.type,
      courses: [],
      lessons: [],
      totalResults: 0,
    };

    // Search courses if type is "all" or "courses"
    if (params.type === 'all' || params.type === 'courses') {
      const { data: courses, error: coursesError } = await supabase.rpc('search_courses', {
        search_query: params.q,
        p_limit: params.limit,
        p_offset: params.offset,
        p_category_filter: params.category || null,
        p_price_min: params.priceMin || null,
        p_price_max: params.priceMax || null,
        p_instructor_id: params.instructorId || null,
      });

      if (!coursesError && courses) {
        results.courses = courses;
      } else if (coursesError) {
        console.error('Course search error:', coursesError);
      }
    }

    // Search lessons if type is "all" or "lessons"
    if (params.type === 'all' || params.type === 'lessons') {
      const { data: lessons, error: lessonsError } = await supabase.rpc('search_lessons', {
        search_query: params.q,
        p_limit: params.limit,
        p_offset: params.offset,
        p_course_id: params.courseId || null,
      });

      if (!lessonsError && lessons) {
        results.lessons = lessons;
      } else if (lessonsError) {
        console.error('Lesson search error:', lessonsError);
      }
    }

    results.totalResults = results.courses.length + results.lessons.length;

    // Track the search query
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const searchDuration = Date.now() - startTime;

    // Track search query asynchronously (don't wait for it)
    if (results.totalResults > 0) {
      supabase.rpc('track_search_query', {
        p_query: params.q,
        p_user_id: user?.id || null,
        p_result_count: results.totalResults,
        p_filters: {
          type: params.type,
          category: params.category,
          priceMin: params.priceMin,
          priceMax: params.priceMax,
          instructorId: params.instructorId,
          courseId: params.courseId,
        },
        p_search_duration_ms: searchDuration,
      }).catch((err) => {
        console.error('Failed to track search query:', err);
      });
    }

    return NextResponse.json({
      success: true,
      ...results,
      searchDurationMs: searchDuration,
      filters: {
        category: params.category,
        priceMin: params.priceMin,
        priceMax: params.priceMax,
        instructorId: params.instructorId,
        courseId: params.courseId,
      },
    });
  } catch (error) {
    console.error('Unexpected search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get human-readable type labels
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    course: 'Course',
    lesson: 'Lesson',
    forum_thread: 'Forum Thread',
    forum_post: 'Forum Post',
    announcement: 'Announcement',
    resource: 'Resource',
  };
  return labels[type] || type;
}
