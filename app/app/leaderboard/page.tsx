import { createClient } from '@/lib/supabase/server';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';

export const metadata = {
  title: 'Leaderboard | Portal28',
  description: 'See how you rank against other learners',
};

export default async function LeaderboardPage() {
  const supabase = await createClient();

  // Fetch initial leaderboard data (overall, top 50)
  const { data: leaderboardData } = await supabase.rpc('get_leaderboard', {
    p_period: 'overall',
    p_limit: 50,
    p_offset: 0,
  });

  // Get current user's rank (if logged in)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRank = null;
  if (user) {
    const { data: rankData } = await supabase.rpc('get_user_rank', {
      p_user_id: user.id,
      p_period: 'overall',
    });
    userRank = rankData?.[0] || null;
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link href="/app/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">Leaderboard</h1>
        </div>
        <p className="text-gray-600">
          Compete with other learners and climb the ranks by earning achievement points
        </p>
      </div>

      {/* User's Rank Card */}
      {userRank && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Rank</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Rank</p>
              <p className="text-3xl font-bold text-blue-600">
                #{userRank.user_rank}
                <span className="text-sm text-gray-600 font-normal ml-2">
                  of {userRank.total_users}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Points</p>
              <p className="text-3xl font-bold">{userRank.points.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Next Rank</p>
              {userRank.above_user_name ? (
                <div>
                  <p className="font-semibold">{userRank.above_user_name}</p>
                  <p className="text-sm text-gray-600">
                    {userRank.above_user_points - userRank.points} points ahead
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">You're #1!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <LeaderboardTable initialData={leaderboardData || []} />
      </div>

      {/* How Points Work */}
      <div className="mt-8 bg-gray-50 rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">How Points Work</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Earn points by unlocking achievements</p>
          <p>• Different achievements award different point values:</p>
          <ul className="ml-6 space-y-1 list-disc">
            <li>Bronze achievements: 10-50 points</li>
            <li>Silver achievements: 100-300 points</li>
            <li>Gold achievements: 500-1000 points</li>
            <li>Platinum achievements: 2000+ points</li>
          </ul>
          <p className="mt-4">
            • Rankings are updated every 5 minutes
          </p>
          <p>
            • Weekly and monthly leaderboards reset at the start of each period
          </p>
        </div>
      </div>
    </div>
  );
}
