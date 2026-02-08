/**
 * Macro Cues System
 * Defines macro → SFX mappings with intelligent placement policies
 */

import { AudioEvent } from '../motion-canvas/types';
import { createAudioEvent, StandardAudioCues } from '../motion-canvas/audio-schema';

/**
 * Macro cue types
 */
export type MacroCue =
  | 'reveal_riser'
  | 'impact_soft'
  | 'text_ping'
  | 'whoosh_fast'
  | 'transition_sweep'
  | 'emphasis_ding'
  | 'bg_ambient';

/**
 * Macro cue configuration
 */
export interface MacroCueConfig {
  sfxFile: string;
  duration: number; // milliseconds
  priority: number; // 1-10, higher = more important
  cooldown: number; // milliseconds before same cue can be used again
  volume?: number;
}

/**
 * Macro cue definitions
 */
export const MACRO_CUES: Record<MacroCue, MacroCueConfig> = {
  reveal_riser: {
    sfxFile: StandardAudioCues.reveal_riser.file,
    duration: StandardAudioCues.reveal_riser.duration,
    priority: 8,
    cooldown: 1000,
    volume: 0.8,
  },
  impact_soft: {
    sfxFile: StandardAudioCues.impact_soft.file,
    duration: StandardAudioCues.impact_soft.duration,
    priority: 6,
    cooldown: 500,
    volume: 0.7,
  },
  text_ping: {
    sfxFile: StandardAudioCues.text_ping.file,
    duration: StandardAudioCues.text_ping.duration,
    priority: 4,
    cooldown: 300,
    volume: 0.6,
  },
  whoosh_fast: {
    sfxFile: StandardAudioCues.whoosh_fast.file,
    duration: StandardAudioCues.whoosh_fast.duration,
    priority: 7,
    cooldown: 800,
    volume: 0.75,
  },
  transition_sweep: {
    sfxFile: StandardAudioCues.transition_sweep.file,
    duration: StandardAudioCues.transition_sweep.duration,
    priority: 9,
    cooldown: 1500,
    volume: 0.85,
  },
  emphasis_ding: {
    sfxFile: StandardAudioCues.emphasis_ding.file,
    duration: StandardAudioCues.emphasis_ding.duration,
    priority: 5,
    cooldown: 600,
    volume: 0.65,
  },
  bg_ambient: {
    sfxFile: StandardAudioCues.bg_ambient.file,
    duration: -1, // Loops
    priority: 1,
    cooldown: 0, // Can always play
    volume: 0.3,
  },
};

/**
 * Macro cue usage tracking
 */
interface CueUsage {
  cue: MacroCue;
  timestamp: number;
  priority: number;
}

/**
 * Macro cues manager with policy enforcement
 */
export class MacroCuesManager {
  private usageHistory: CueUsage[] = [];
  private readonly maxHistorySize = 100;

  /**
   * Check if a cue can be placed at the given timestamp
   */
  canPlaceCue(cue: MacroCue, timestamp: number): {
    allowed: boolean;
    reason?: string;
  } {
    const config = MACRO_CUES[cue];

    // Check cooldown
    const lastUsage = this.getLastUsage(cue);
    if (lastUsage && timestamp - lastUsage.timestamp < config.cooldown) {
      return {
        allowed: false,
        reason: `Cooldown not met (${config.cooldown}ms required)`,
      };
    }

    // Check for conflicts with higher priority cues
    const conflictingCues = this.getConflictingCues(timestamp, config.duration);
    const higherPriorityCue = conflictingCues.find(
      (usage) => usage.priority > config.priority
    );

    if (higherPriorityCue) {
      return {
        allowed: false,
        reason: `Conflicts with higher priority cue: ${higherPriorityCue.cue}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Place a cue at the given timestamp
   */
  placeCue(
    cue: MacroCue,
    timestamp: number,
    options?: {
      forcePlace?: boolean;
      customVolume?: number;
    }
  ): { success: boolean; audioEvent?: AudioEvent; reason?: string } {
    // Check if placement is allowed
    if (!options?.forcePlace) {
      const check = this.canPlaceCue(cue, timestamp);
      if (!check.allowed) {
        return {
          success: false,
          reason: check.reason,
        };
      }
    }

    const config = MACRO_CUES[cue];

    // Record usage
    this.recordUsage(cue, timestamp, config.priority);

    // Create audio event
    const audioEvent = createAudioEvent('emphasis', timestamp, {
      soundFile: config.sfxFile,
      volume: options?.customVolume ?? config.volume,
      metadata: {
        macro: cue,
        priority: config.priority,
        duration: config.duration,
      },
    });

    return {
      success: true,
      audioEvent,
    };
  }

  /**
   * Place multiple cues
   */
  placeCues(
    placements: Array<{ cue: MacroCue; timestamp: number }>
  ): {
    placed: AudioEvent[];
    rejected: Array<{ cue: MacroCue; timestamp: number; reason: string }>;
  } {
    const placed: AudioEvent[] = [];
    const rejected: Array<{ cue: MacroCue; timestamp: number; reason: string }> = [];

    for (const placement of placements) {
      const result = this.placeCue(placement.cue, placement.timestamp);
      if (result.success && result.audioEvent) {
        placed.push(result.audioEvent);
      } else {
        rejected.push({
          cue: placement.cue,
          timestamp: placement.timestamp,
          reason: result.reason || 'Unknown error',
        });
      }
    }

    return { placed, rejected };
  }

  /**
   * Get the last usage of a specific cue
   */
  private getLastUsage(cue: MacroCue): CueUsage | null {
    const usages = this.usageHistory.filter((u) => u.cue === cue);
    return usages.length > 0 ? usages[usages.length - 1] : null;
  }

  /**
   * Get cues that would conflict with placement at timestamp
   */
  private getConflictingCues(
    timestamp: number,
    duration: number
  ): CueUsage[] {
    const endTime = timestamp + duration;

    return this.usageHistory.filter((usage) => {
      const usageConfig = MACRO_CUES[usage.cue];
      const usageEndTime = usage.timestamp + usageConfig.duration;

      // Check if time ranges overlap
      return (
        (timestamp >= usage.timestamp && timestamp < usageEndTime) ||
        (endTime > usage.timestamp && endTime <= usageEndTime) ||
        (timestamp <= usage.timestamp && endTime >= usageEndTime)
      );
    });
  }

  /**
   * Record cue usage
   */
  private recordUsage(cue: MacroCue, timestamp: number, priority: number): void {
    this.usageHistory.push({ cue, timestamp, priority });

    // Keep history size manageable
    if (this.usageHistory.length > this.maxHistorySize) {
      this.usageHistory = this.usageHistory.slice(-this.maxHistorySize);
    }

    // Sort by timestamp
    this.usageHistory.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear usage history
   */
  clearHistory(): void {
    this.usageHistory = [];
  }

  /**
   * Get usage statistics
   */
  getStats(): {
    totalUsages: number;
    cueBreakdown: Record<MacroCue, number>;
    averageInterval: number;
  } {
    const cueBreakdown: Record<string, number> = {};

    for (const usage of this.usageHistory) {
      cueBreakdown[usage.cue] = (cueBreakdown[usage.cue] || 0) + 1;
    }

    // Calculate average interval between cues
    const intervals: number[] = [];
    for (let i = 1; i < this.usageHistory.length; i++) {
      intervals.push(this.usageHistory[i].timestamp - this.usageHistory[i - 1].timestamp);
    }

    const averageInterval =
      intervals.length > 0
        ? intervals.reduce((a, b) => a + b, 0) / intervals.length
        : 0;

    return {
      totalUsages: this.usageHistory.length,
      cueBreakdown: cueBreakdown as Record<MacroCue, number>,
      averageInterval,
    };
  }
}

/**
 * Create a macro cues manager
 */
export function createMacroCuesManager(): MacroCuesManager {
  return new MacroCuesManager();
}

/**
 * Get cue configuration
 */
export function getCueConfig(cue: MacroCue): MacroCueConfig {
  return MACRO_CUES[cue];
}

/**
 * Get all available macro cues
 */
export function getAvailableCues(): MacroCue[] {
  return Object.keys(MACRO_CUES) as MacroCue[];
}
