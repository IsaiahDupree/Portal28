import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// Validation schema for search query
const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200, 'Search query too long'),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = searchParams.get('limit');

    // Validate input
    const validation = searchSchema.safeParse({ q: query, limit });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { q, limit: resultLimit } = validation.data;

    // Create Supabase client (works for both authenticated and anonymous users)
    const supabase = await createClient();

    // Call the search function
    const { data, error } = await supabase.rpc('search_content', {
      search_query: q,
      result_limit: resultLimit,
    });

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    // Transform results to include type-specific metadata
    const results = (data || []).map((result: any) => ({
      id: result.id,
      type: result.type,
      title: result.title,
      excerpt: result.excerpt,
      url: result.url,
      rank: result.rank,
      createdAt: result.created_at,
      // Add icon/badge based on type
      typeLabel: getTypeLabel(result.type),
    }));

    return NextResponse.json({
      query: q,
      count: results.length,
      results,
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
