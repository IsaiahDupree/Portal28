import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/achievements
 * Returns all achievements for the current user (unlocked and locked with progress)
 */
export async function GET() {
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

    // Get user achievements with progress
    const { data, error } = await supabase.rpc('get_user_achievements', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error fetching achievements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch achievements' },
        { status: 500 }
      );
    }

    return NextResponse.json({ achievements: data || [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/achievements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
