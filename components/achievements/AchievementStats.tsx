'use client';

import { useEffect, useState } from 'react';
import { Trophy, Target, Star } from 'lucide-react';

interface AchievementStatsData {
  total_points: number;
  achievements_unlocked: number;
  achievements_total: number;
  completion_percentage: number;
}

interface AchievementStatsProps {
  initialStats?: AchievementStatsData;
}

export function AchievementStats({ initialStats }: AchievementStatsProps) {
  const [stats, setStats] = useState<AchievementStatsData | null>(
    initialStats || null
  );
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    if (!initialStats) {
      fetchStats();
    }
  }, [initialStats]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/achievements/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching achievement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-600" />
        Achievement Stats
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Points */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 rounded-full p-3">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Points</p>
              <p className="text-2xl font-bold text-yellow-900">
                {stats.total_points.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Achievements Unlocked */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-3">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Unlocked</p>
              <p className="text-2xl font-bold text-green-900">
                {stats.achievements_unlocked} / {stats.achievements_total}
              </p>
            </div>
          </div>
        </div>

        {/* Completion Percentage */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-3">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completion</p>
              <p className="text-2xl font-bold text-blue-900">
                {stats.completion_percentage}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Overall Progress</span>
          <span>{stats.completion_percentage}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.completion_percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
