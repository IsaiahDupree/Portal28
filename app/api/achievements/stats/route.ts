import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/achievements/stats
 * Returns achievement statistics for the current user
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

    // Get user achievement stats
    const { data, error } = await supabase.rpc('get_user_achievement_stats', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error fetching achievement stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch achievement stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({ stats: data?.[0] || {} });
  } catch (error) {
    console.error('Unexpected error in GET /api/achievements/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
