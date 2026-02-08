import React from 'react';
import { render, screen } from '@testing-library/react';
import { AchievementBadge } from '@/components/achievements/AchievementBadge';

describe('AchievementBadge', () => {
  const mockAchievement = {
    icon: '🎯',
    name: 'First Steps',
    description: 'Complete your first lesson',
    tier: 'bronze' as const,
  };

  it('should render unlocked achievement correctly', () => {
    render(
      <AchievementBadge
        {...mockAchievement}
        isUnlocked={true}
      />
    );

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Complete your first lesson')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('Unlocked')).toBeInTheDocument();
  });

  it('should render locked achievement with progress', () => {
    render(
      <AchievementBadge
        {...mockAchievement}
        isUnlocked={false}
        currentProgress={5}
        targetValue={10}
      />
    );

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText('Unlocked')).not.toBeInTheDocument();
  });

  it('should render all tier types correctly', () => {
    const tiers: Array<'bronze' | 'silver' | 'gold' | 'platinum'> = [
      'bronze',
      'silver',
      'gold',
      'platinum',
    ];

    tiers.forEach((tier) => {
      const { rerender } = render(
        <AchievementBadge
          {...mockAchievement}
          tier={tier}
          isUnlocked={true}
        />
      );

      expect(screen.getByText('First Steps')).toBeInTheDocument();
      rerender(<div />); // Clear for next iteration
    });
  });

  it('should apply locked styling when not unlocked', () => {
    const { container } = render(
      <AchievementBadge
        {...mockAchievement}
        isUnlocked={false}
      />
    );

    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('opacity-60');
  });

  it('should render without progress bar when no progress data', () => {
    render(
      <AchievementBadge
        {...mockAchievement}
        isUnlocked={false}
      />
    );

    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('should calculate progress percentage correctly', () => {
    render(
      <AchievementBadge
        {...mockAchievement}
        isUnlocked={false}
        currentProgress={7}
        targetValue={10}
      />
    );

    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('should cap progress at 100%', () => {
    render(
      <AchievementBadge
        {...mockAchievement}
        isUnlocked={false}
        currentProgress={15}
        targetValue={10}
      />
    );

    // Progress should be capped at 100%
    const progressText = screen.getByText(/100%/);
    expect(progressText).toBeInTheDocument();
  });
});
