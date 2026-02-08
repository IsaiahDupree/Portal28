/**
 * Visual Reveals System - Reveal Recorder
 * Captures visual element appearances during rendering with accurate timestamps
 */

import { VisualReveal, AudioEvent } from '../motion-canvas/types';
import { createAudioEvent, StandardAudioCues } from '../motion-canvas/audio-schema';

/**
 * Reveal kind definitions
 */
export type RevealKind =
  | 'fade-in'
  | 'slide-in'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'slide-in-up'
  | 'slide-in-down'
  | 'scale-up'
  | 'scale-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'rotate-in'
  | 'bounce-in'
  | 'custom';

/**
 * Reveal event with enhanced metadata
 */
export interface RevealEvent extends VisualReveal {
  element: string;
  kind: RevealKind;
  timestamp: number; // milliseconds
  duration: number; // milliseconds
  sfx?: string; // Associated sound effect
  metadata?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    opacity?: number;
    scale?: number;
    [key: string]: any;
  };
}

/**
 * Reveal recorder for capturing visual element appearances
 */
export class RevealRecorder {
  private reveals: RevealEvent[] = [];
  private startTime: number;
  private isRecording: boolean = false;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Start recording reveals
   */
  start(): void {
    this.startTime = Date.now();
    this.isRecording = true;
    this.reveals = [];
  }

  /**
   * Stop recording reveals
   */
  stop(): void {
    this.isRecording = false;
  }

  /**
   * Record a visual reveal event
   */
  record(
    element: string,
    kind: RevealKind,
    options?: {
      duration?: number;
      sfx?: string;
      metadata?: RevealEvent['metadata'];
      timestamp?: number;
    }
  ): RevealEvent {
    const timestamp = options?.timestamp ?? (Date.now() - this.startTime);
    const duration = options?.duration ?? this.getDefaultDuration(kind);

    const reveal: RevealEvent = {
      id: `reveal-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      element,
      kind,
      timestamp,
      duration,
      sfx: options?.sfx,
      metadata: options?.metadata,
    };

    if (this.isRecording) {
      this.reveals.push(reveal);
    }

    return reveal;
  }

  /**
   * Get default duration for reveal kind
   */
  private getDefaultDuration(kind: RevealKind): number {
    const defaults: Record<RevealKind, number> = {
      'fade-in': 500,
      'slide-in': 400,
      'slide-in-left': 400,
      'slide-in-right': 400,
      'slide-in-up': 400,
      'slide-in-down': 400,
      'scale-up': 300,
      'scale-down': 300,
      'zoom-in': 400,
      'zoom-out': 400,
      'rotate-in': 500,
      'bounce-in': 600,
      'custom': 500,
    };

    return defaults[kind] || 500;
  }

  /**
   * Get all recorded reveals
   */
  getReveals(): RevealEvent[] {
    return [...this.reveals];
  }

  /**
   * Get reveals in a time range
   */
  getRevealsInRange(startTime: number, endTime: number): RevealEvent[] {
    return this.reveals.filter(
      (reveal) =>
        reveal.timestamp >= startTime && reveal.timestamp <= endTime
    );
  }

  /**
   * Clear recorded reveals
   */
  clear(): void {
    this.reveals = [];
  }

  /**
   * Export reveals to JSON
   */
  toJSON(): {
    reveals: RevealEvent[];
    totalDuration: number;
    count: number;
  } {
    const maxTimestamp = Math.max(
      ...this.reveals.map((r) => r.timestamp + r.duration),
      0
    );

    return {
      reveals: this.reveals,
      totalDuration: maxTimestamp,
      count: this.reveals.length,
    };
  }
}

/**
 * Sync SFX to reveals
 */
export function syncSFXToReveals(reveals: RevealEvent[]): AudioEvent[] {
  const audioEvents: AudioEvent[] = [];

  for (const reveal of reveals) {
    // If reveal already has SFX specified, use it
    if (reveal.sfx) {
      audioEvents.push(
        createAudioEvent('reveal', reveal.timestamp, {
          soundFile: reveal.sfx,
        })
      );
      continue;
    }

    // Otherwise, auto-assign SFX based on reveal kind
    const sfx = getDefaultSFXForReveal(reveal.kind);
    if (sfx) {
      audioEvents.push(
        createAudioEvent('reveal', reveal.timestamp, {
          soundFile: sfx,
        })
      );
    }
  }

  return audioEvents;
}

/**
 * Get default SFX for reveal kind
 */
function getDefaultSFXForReveal(kind: RevealKind): string | null {
  const mapping: Partial<Record<RevealKind, string>> = {
    'fade-in': StandardAudioCues.reveal_riser.file,
    'slide-in': StandardAudioCues.whoosh_fast.file,
    'slide-in-left': StandardAudioCues.whoosh_fast.file,
    'slide-in-right': StandardAudioCues.whoosh_fast.file,
    'slide-in-up': StandardAudioCues.whoosh_fast.file,
    'slide-in-down': StandardAudioCues.whoosh_fast.file,
    'scale-up': StandardAudioCues.impact_soft.file,
    'zoom-in': StandardAudioCues.reveal_riser.file,
    'bounce-in': StandardAudioCues.text_ping.file,
  };

  return mapping[kind] || null;
}

/**
 * Validate reveal timestamps for accuracy
 */
export function validateRevealTimestamps(
  reveals: RevealEvent[],
  tolerance: number = 50
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for negative timestamps
  const negativeTimestamps = reveals.filter((r) => r.timestamp < 0);
  if (negativeTimestamps.length > 0) {
    errors.push(
      `Found ${negativeTimestamps.length} reveals with negative timestamps`
    );
  }

  // Check for overlapping reveals on same element
  for (let i = 0; i < reveals.length; i++) {
    for (let j = i + 1; j < reveals.length; j++) {
      const r1 = reveals[i];
      const r2 = reveals[j];

      if (r1.element === r2.element) {
        const r1End = r1.timestamp + r1.duration;
        const overlap =
          r2.timestamp >= r1.timestamp && r2.timestamp < r1End;

        if (overlap && Math.abs(r2.timestamp - r1End) > tolerance) {
          errors.push(
            `Reveals overlap on element "${r1.element}" at ${r2.timestamp}ms`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
