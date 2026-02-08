/**
 * Visual Reveals System - Pacing-Accurate Seeder
 * Uses WPM (Words Per Minute) model for intelligent reveal timing
 */

import { RevealEvent, RevealKind } from './reveal-recorder';

/**
 * WPM (Words Per Minute) configuration
 */
export interface WPMConfig {
  readingSpeed: number; // Words per minute (default: 150-200)
  pauseBetweenSections: number; // milliseconds
  minRevealInterval: number; // minimum time between reveals (ms)
  maxRevealInterval: number; // maximum time between reveals (ms)
}

/**
 * Default WPM configuration
 */
export const DEFAULT_WPM_CONFIG: WPMConfig = {
  readingSpeed: 180, // Average reading speed
  pauseBetweenSections: 500,
  minRevealInterval: 200,
  maxRevealInterval: 2000,
};

/**
 * Content block for pacing calculation
 */
export interface ContentBlock {
  type: 'text' | 'image' | 'video' | 'code' | 'heading' | 'list';
  content: string;
  wordCount?: number;
  duration?: number; // Optional fixed duration
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Seeding result with timed reveals
 */
export interface SeedingResult {
  reveals: RevealEvent[];
  totalDuration: number; // milliseconds
  averageInterval: number;
  wpmUsed: number;
}

/**
 * Pacing-accurate seeder using WPM model
 */
export class PacingSeeder {
  private config: WPMConfig;

  constructor(config?: Partial<WPMConfig>) {
    this.config = { ...DEFAULT_WPM_CONFIG, ...config };
  }

  /**
   * Seed reveals based on content blocks
   */
  seed(blocks: ContentBlock[]): SeedingResult {
    const reveals: RevealEvent[] = [];
    let currentTime = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockDuration = this.calculateBlockDuration(block);
      const revealKind = this.getRevealKindForBlockType(block.type);

      // Create reveal for this block
      const reveal: RevealEvent = {
        id: `reveal-${i}-${Date.now()}`,
        element: `block-${i}`,
        kind: revealKind,
        timestamp: currentTime,
        duration: Math.min(blockDuration * 0.3, 600), // Reveal takes 30% of block duration, max 600ms
        metadata: {
          blockType: block.type,
          wordCount: block.wordCount,
          priority: block.priority,
        },
      };

      reveals.push(reveal);

      // Advance time by block duration
      currentTime += blockDuration;

      // Add pause between sections if not the last block
      if (i < blocks.length - 1) {
        currentTime += this.config.pauseBetweenSections;
      }
    }

    // Calculate statistics
    const intervals = reveals.slice(1).map((r, i) => r.timestamp - reveals[i].timestamp);
    const averageInterval = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;

    return {
      reveals,
      totalDuration: currentTime,
      averageInterval,
      wpmUsed: this.config.readingSpeed,
    };
  }

  /**
   * Calculate duration for a content block based on WPM
   */
  private calculateBlockDuration(block: ContentBlock): number {
    // If fixed duration provided, use it
    if (block.duration) {
      return block.duration;
    }

    // Calculate word count if not provided
    const wordCount = block.wordCount ?? this.countWords(block.content);

    // Calculate reading time based on WPM
    const readingTimeMs = (wordCount / this.config.readingSpeed) * 60 * 1000;

    // Apply duration modifiers based on content type
    const modifier = this.getDurationModifierForType(block.type);
    const adjustedDuration = readingTimeMs * modifier;

    // Clamp to min/max interval
    return Math.max(
      this.config.minRevealInterval,
      Math.min(this.config.maxRevealInterval, adjustedDuration)
    );
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Get duration modifier for content type
   */
  private getDurationModifierForType(type: ContentBlock['type']): number {
    const modifiers: Record<ContentBlock['type'], number> = {
      text: 1.0, // Standard reading speed
      heading: 0.6, // Headings read faster
      image: 1.5, // Images need viewing time
      video: 1.0, // Videos have own duration
      code: 1.8, // Code takes longer to read
      list: 0.8, // Lists read slightly faster
    };

    return modifiers[type] || 1.0;
  }

  /**
   * Get reveal kind for block type
   */
  private getRevealKindForBlockType(type: ContentBlock['type']): RevealKind {
    const kindMap: Record<ContentBlock['type'], RevealKind> = {
      text: 'fade-in',
      heading: 'slide-in-down',
      image: 'scale-up',
      video: 'fade-in',
      code: 'slide-in-left',
      list: 'slide-in-right',
    };

    return kindMap[type] || 'fade-in';
  }

  /**
   * Optimize reveal timing for better pacing
   */
  optimizePacing(reveals: RevealEvent[]): RevealEvent[] {
    const optimized = [...reveals];

    // Ensure minimum interval between reveals
    for (let i = 1; i < optimized.length; i++) {
      const prevReveal = optimized[i - 1];
      const currentReveal = optimized[i];
      const interval = currentReveal.timestamp - prevReveal.timestamp;

      if (interval < this.config.minRevealInterval) {
        // Push this and all subsequent reveals forward
        const adjustment = this.config.minRevealInterval - interval;
        for (let j = i; j < optimized.length; j++) {
          optimized[j].timestamp += adjustment;
        }
      }
    }

    return optimized;
  }

  /**
   * Calculate optimal WPM for target duration
   */
  calculateOptimalWPM(blocks: ContentBlock[], targetDuration: number): number {
    const totalWords = blocks.reduce(
      (sum, block) => sum + (block.wordCount ?? this.countWords(block.content)),
      0
    );

    // Calculate required WPM to fit target duration
    const requiredWPM = (totalWords / (targetDuration / 1000)) * 60;

    // Clamp to reasonable reading speeds (100-300 WPM)
    return Math.max(100, Math.min(300, requiredWPM));
  }
}

/**
 * Create a seeder with custom WPM
 */
export function createSeeder(wpm: number): PacingSeeder {
  return new PacingSeeder({ readingSpeed: wpm });
}

/**
 * Quick seed function for simple content
 */
export function quickSeed(content: string, wpm?: number): SeedingResult {
  const blocks: ContentBlock[] = [
    {
      type: 'text',
      content,
    },
  ];

  const seeder = new PacingSeeder(wpm ? { readingSpeed: wpm } : undefined);
  return seeder.seed(blocks);
}
