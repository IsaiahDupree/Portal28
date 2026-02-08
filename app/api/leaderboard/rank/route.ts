import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/leaderboard/rank?period=overall
 * Returns the current user's rank and nearby competitors
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'overall';

    // Validate period
    if (!['overall', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be overall, weekly, or monthly' },
        { status: 400 }
      );
    }

    // Get user rank
    const { data, error } = await supabase.rpc('get_user_rank', {
      p_user_id: user.id,
      p_period: period,
    });

    if (error) {
      console.error('Error fetching user rank:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user rank' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rank: data?.[0] || null,
      period,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/leaderboard/rank:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
