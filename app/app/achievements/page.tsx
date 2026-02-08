import { createClient } from '@/lib/supabase/server';
import { AchievementStats } from '@/components/achievements/AchievementStats';
import { AchievementGrid } from '@/components/achievements/AchievementGrid';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Achievements | Portal28',
  description: 'View your achievements and track your progress',
};

export default async function AchievementsPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch achievements
  const { data: achievementsData } = await supabase.rpc('get_user_achievements', {
    p_user_id: user.id,
  });

  // Fetch stats
  const { data: statsData } = await supabase.rpc('get_user_achievement_stats', {
    p_user_id: user.id,
  });

  const achievements = achievementsData || [];
  const stats = statsData?.[0] || null;

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link href="/app/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Your Achievements</h1>
        <p className="text-gray-600">
          Track your progress and unlock achievements as you learn
        </p>
      </div>

      {/* Stats Section */}
      <div className="mb-8">
        <AchievementStats initialStats={stats} />
      </div>

      {/* Achievements Grid */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold mb-6">All Achievements</h2>
        <AchievementGrid userId={user.id} initialAchievements={achievements} />
      </div>
    </div>
  );
}
