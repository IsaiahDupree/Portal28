/**
 * Beat Action Mapping
 * Maps format blocks to visual beats and timing
 */

import {
  FormatBlock,
  BeatAction,
  BEAT_ACTION_TO_REVEAL,
  DEFAULT_STYLES,
} from './hybrid-types';
import { RevealEvent, RevealKind } from './reveal-recorder';
import { AudioEvent } from '../motion-canvas/types';
import { createAudioEvent, StandardAudioCues } from '../motion-canvas/audio-schema';

/**
 * Beat mapping result
 */
export interface BeatMapping {
  reveals: RevealEvent[];
  audioEvents: AudioEvent[];
  totalDuration: number;
}

/**
 * Beat mapper configuration
 */
export interface BeatMapperConfig {
  baseInterval: number; // Time between blocks (ms)
  audioCuesEnabled: boolean;
  respectBlockDurations: boolean;
}

/**
 * Default beat mapper configuration
 */
export const DEFAULT_BEAT_CONFIG: BeatMapperConfig = {
  baseInterval: 800,
  audioCuesEnabled: true,
  respectBlockDurations: true,
};

/**
 * Beat action mapper
 */
export class BeatMapper {
  private config: BeatMapperConfig;

  constructor(config?: Partial<BeatMapperConfig>) {
    this.config = { ...DEFAULT_BEAT_CONFIG, ...config };
  }

  /**
   * Map format blocks to visual beats
   */
  mapBeats(blocks: FormatBlock[]): BeatMapping {
    const reveals: RevealEvent[] = [];
    const audioEvents: AudioEvent[] = [];
    let currentTime = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Use block timestamp if provided, otherwise calculate
      const timestamp = block.timestamp ?? currentTime;

      // Create visual reveal
      const reveal = this.blockToReveal(block, timestamp);
      reveals.push(reveal);

      // Create audio cue if enabled
      if (this.config.audioCuesEnabled) {
        const audioCue = this.blockToAudioCue(block, timestamp);
        if (audioCue) {
          audioEvents.push(audioCue);
        }
      }

      // Advance time
      const blockDuration = this.config.respectBlockDurations
        ? (block.style?.duration || DEFAULT_STYLES[block.type].duration || 500)
        : 500;

      currentTime = timestamp + blockDuration + this.config.baseInterval;
    }

    return {
      reveals,
      audioEvents,
      totalDuration: currentTime,
    };
  }

  /**
   * Convert block to reveal event
   */
  private blockToReveal(block: FormatBlock, timestamp: number): RevealEvent {
    const beatAction = block.beatAction || DEFAULT_STYLES[block.type].animation || 'fade-in';
    const revealKind = this.beatActionToRevealKind(beatAction);
    const duration = block.style?.duration || DEFAULT_STYLES[block.type].duration || 500;

    return {
      id: block.id,
      element: `block-${block.type}-${block.id}`,
      kind: revealKind,
      timestamp,
      duration,
      metadata: {
        blockType: block.type,
        content: block.content,
        beatAction,
      },
    };
  }

  /**
   * Convert beat action to reveal kind
   */
  private beatActionToRevealKind(beatAction: BeatAction): RevealKind {
    const mapping: Record<BeatAction, RevealKind> = {
      'fade-in': 'fade-in',
      'slide-in': 'slide-in',
      'highlight': 'scale-up',
      'pulse': 'bounce-in',
      'shake': 'custom',
      'zoom': 'zoom-in',
      'none': 'fade-in',
    };

    return mapping[beatAction] || 'fade-in';
  }

  /**
   * Convert block to audio cue
   */
  private blockToAudioCue(block: FormatBlock, timestamp: number): AudioEvent | null {
    // Map block types to audio cues
    const audioMapping: Partial<Record<typeof block.type, string>> = {
      keyword: StandardAudioCues.text_ping.file,
      bullet: StandardAudioCues.text_ping.file,
      code: StandardAudioCues.impact_soft.file,
      error: StandardAudioCues.emphasis_ding.file,
      success: StandardAudioCues.emphasis_ding.file,
      cta: StandardAudioCues.reveal_riser.file,
      heading: StandardAudioCues.whoosh_fast.file,
      warning: StandardAudioCues.emphasis_ding.file,
    };

    const soundFile = audioMapping[block.type];
    if (!soundFile) {
      return null;
    }

    return createAudioEvent('emphasis', timestamp, {
      soundFile,
      metadata: {
        blockType: block.type,
        blockId: block.id,
      },
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BeatMapperConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): BeatMapperConfig {
    return { ...this.config };
  }
}

/**
 * Create a beat mapper
 */
export function createBeatMapper(config?: Partial<BeatMapperConfig>): BeatMapper {
  return new BeatMapper(config);
}

/**
 * Quick map function for simple use cases
 */
export function quickMapBeats(blocks: FormatBlock[]): BeatMapping {
  const mapper = new BeatMapper();
  return mapper.mapBeats(blocks);
}

/**
 * Optimize beat timing for smoother playback
 */
export function optimizeBeatTiming(
  mapping: BeatMapping,
  targetDuration?: number
): BeatMapping {
  if (!targetDuration) {
    return mapping;
  }

  // Scale timing to fit target duration
  const scale = targetDuration / mapping.totalDuration;

  const optimizedReveals = mapping.reveals.map((reveal) => ({
    ...reveal,
    timestamp: Math.floor(reveal.timestamp * scale),
    duration: Math.floor(reveal.duration * scale),
  }));

  const optimizedAudio = mapping.audioEvents.map((event) => ({
    ...event,
    timestamp: Math.floor(event.timestamp * scale),
  }));

  return {
    reveals: optimizedReveals,
    audioEvents: optimizedAudio,
    totalDuration: targetDuration,
  };
}
