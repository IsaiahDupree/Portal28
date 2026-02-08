'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trophy, Medal, Award, Flame, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  rank: number;
  points: number;
  achievements_count: number;
  current_streak: number;
  lessons_completed: number;
}

interface LeaderboardTableProps {
  initialData?: LeaderboardEntry[];
  initialPeriod?: 'overall' | 'weekly' | 'monthly';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />;
    default:
      return null;
  }
}

export function LeaderboardTable({
  initialData,
  initialPeriod = 'overall',
}: LeaderboardTableProps) {
  const [period, setPeriod] = useState<'overall' | 'weekly' | 'monthly'>(
    initialPeriod
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(
    initialData || []
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) {
      fetchLeaderboard();
    }
  }, [period, initialData]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/leaderboard?period=${period}&limit=50`);

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="text-gray-600 mt-2">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <p>Error loading leaderboard: {error}</p>
        <Button onClick={fetchLeaderboard} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overall">All Time</TabsTrigger>
          <TabsTrigger value="weekly">This Week</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-4">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No rankings available yet.</p>
              <p className="text-sm mt-2">
                Start completing lessons and unlocking achievements to appear on the
                leaderboard!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.user_id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(entry.rank) || (
                      <span className="text-lg font-bold text-gray-600">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar & Name */}
                  <Link
                    href={`/app/profile/${entry.user_id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={entry.avatar_url || undefined}
                        alt={entry.display_name || 'User'}
                      />
                      <AvatarFallback>
                        {entry.display_name ? getInitials(entry.display_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {entry.display_name || 'Anonymous User'}
                      </p>
                    </div>
                  </Link>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    {/* Points */}
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                      <span className="font-semibold">
                        {entry.points.toLocaleString()}
                      </span>
                    </div>

                    {/* Achievements */}
                    <div className="hidden sm:flex items-center gap-1.5 text-gray-600">
                      <Award className="h-4 w-4" />
                      <span>{entry.achievements_count}</span>
                    </div>

                    {/* Streak */}
                    {entry.current_streak > 0 && (
                      <div className="hidden md:flex items-center gap-1.5 text-gray-600">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span>{entry.current_streak}</span>
                      </div>
                    )}

                    {/* Lessons */}
                    <div className="hidden lg:flex items-center gap-1.5 text-gray-600">
                      <BookOpen className="h-4 w-4" />
                      <span>{entry.lessons_completed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
