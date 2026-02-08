import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/achievements/check
 * Manually triggers achievement checking for the current user
 * Optional: can specify category to check
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body (optional category filter)
    let category: string | null = null;
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const body = await request.json();
        category = body?.category || null;
      }
    } catch {
      // No body or invalid JSON - that's fine, check all categories
    }

    // Check and unlock achievements
    const { data, error } = await supabase.rpc('check_and_unlock_achievements', {
      p_user_id: user.id,
      p_category: category,
    });

    if (error) {
      console.error('Error checking achievements:', error);
      return NextResponse.json(
        { error: 'Failed to check achievements' },
        { status: 500 }
      );
    }

    const newlyUnlocked = data || [];

    return NextResponse.json({
      checked: true,
      newlyUnlocked,
      count: newlyUnlocked.length,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/achievements/check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
