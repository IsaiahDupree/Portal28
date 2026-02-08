'use client';

import { useEffect, useState } from 'react';
import { AchievementBadge } from './AchievementBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Achievement {
  achievement_id: string;
  achievement_key: string;
  achievement_name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  is_unlocked: boolean;
  unlocked_at: string | null;
  current_progress: number;
  target_value: number;
  progress_percentage: number;
}

interface AchievementGridProps {
  userId?: string;
  initialAchievements?: Achievement[];
  showUnlockedOnly?: boolean;
}

export function AchievementGrid({
  userId,
  initialAchievements,
  showUnlockedOnly = false,
}: AchievementGridProps) {
  const [achievements, setAchievements] = useState<Achievement[]>(
    initialAchievements || []
  );
  const [loading, setLoading] = useState(!initialAchievements);
  const [error, setError] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(
    null
  );
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    if (!initialAchievements) {
      fetchAchievements();
    }
  }, [userId, initialAchievements]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/achievements');

      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }

      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (achievement: Achievement) => {
    const url = `${window.location.origin}/app/profile/${userId || 'me'}?achievement=${achievement.achievement_key}`;
    setShareUrl(url);

    if (navigator.share) {
      navigator
        .share({
          title: `I unlocked ${achievement.achievement_name}!`,
          text: achievement.description,
          url,
        })
        .catch(() => {
          // User cancelled share
        });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        alert('Achievement link copied to clipboard!');
      });
    }
  };

  const filteredAchievements = showUnlockedOnly
    ? achievements.filter((a) => a.is_unlocked)
    : achievements;

  const groupedByCategory = filteredAchievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="text-gray-600 mt-2">Loading achievements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading achievements: {error}</p>
        <Button onClick={fetchAchievements} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (filteredAchievements.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No achievements to display.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {Object.entries(groupedByCategory).map(([category, categoryAchievements]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-4 capitalize">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryAchievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.achievement_id}
                  icon={achievement.icon}
                  name={achievement.achievement_name}
                  description={achievement.description}
                  tier={achievement.tier}
                  isUnlocked={achievement.is_unlocked}
                  currentProgress={achievement.current_progress}
                  targetValue={achievement.target_value}
                  onClick={() => setSelectedAchievement(achievement)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Achievement Detail Dialog */}
      <Dialog
        open={selectedAchievement !== null}
        onOpenChange={(open) => !open && setSelectedAchievement(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-4xl">{selectedAchievement?.icon}</span>
              <span>{selectedAchievement?.achievement_name}</span>
            </DialogTitle>
            <DialogDescription>{selectedAchievement?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tier:</span>
              <span className="font-medium capitalize">{selectedAchievement?.tier}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Points:</span>
              <span className="font-medium">{selectedAchievement?.points}</span>
            </div>

            {selectedAchievement?.is_unlocked && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Unlocked:</span>
                  <span className="font-medium">
                    {selectedAchievement.unlocked_at
                      ? new Date(selectedAchievement.unlocked_at).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>

                <Button
                  onClick={() => selectedAchievement && handleShare(selectedAchievement)}
                  className="w-full"
                >
                  Share Achievement
                </Button>
              </>
            )}

            {!selectedAchievement?.is_unlocked && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">Progress</div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>
                    {selectedAchievement?.current_progress} /{' '}
                    {selectedAchievement?.target_value}
                  </span>
                  <span>{selectedAchievement?.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${selectedAchievement?.progress_percentage || 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
