'use client';

import { cn } from '@/lib/utils';

interface AchievementBadgeProps {
  icon: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isUnlocked: boolean;
  currentProgress?: number;
  targetValue?: number;
  className?: string;
  onClick?: () => void;
}

const tierColors = {
  bronze: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-900',
    icon: 'text-amber-600',
    locked: 'bg-gray-50 border-gray-200',
  },
  silver: {
    bg: 'bg-slate-100 border-slate-300',
    text: 'text-slate-900',
    icon: 'text-slate-600',
    locked: 'bg-gray-50 border-gray-200',
  },
  gold: {
    bg: 'bg-yellow-50 border-yellow-300',
    text: 'text-yellow-900',
    icon: 'text-yellow-600',
    locked: 'bg-gray-50 border-gray-200',
  },
  platinum: {
    bg: 'bg-purple-50 border-purple-200',
    text: 'text-purple-900',
    icon: 'text-purple-600',
    locked: 'bg-gray-50 border-gray-200',
  },
};

export function AchievementBadge({
  icon,
  name,
  description,
  tier,
  isUnlocked,
  currentProgress,
  targetValue,
  className,
  onClick,
}: AchievementBadgeProps) {
  const colors = tierColors[tier];
  const progressPercentage =
    currentProgress !== undefined && targetValue
      ? Math.min(100, (currentProgress / targetValue) * 100)
      : 0;

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-all',
        isUnlocked ? colors.bg : colors.locked,
        onClick ? 'cursor-pointer hover:shadow-md' : '',
        !isUnlocked && 'opacity-60',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'text-3xl',
            isUnlocked ? colors.icon : 'text-gray-400 grayscale'
          )}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                'font-semibold text-sm',
                isUnlocked ? colors.text : 'text-gray-500'
              )}
            >
              {name}
            </h3>
            {isUnlocked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium whitespace-nowrap">
                Unlocked
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600 mt-1">{description}</p>

          {/* Progress Bar (for locked achievements) */}
          {!isUnlocked &&
            currentProgress !== undefined &&
            targetValue !== undefined && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>
                    {currentProgress} / {targetValue}
                  </span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={cn('h-1.5 rounded-full', colors.icon.replace('text-', 'bg-'))}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
