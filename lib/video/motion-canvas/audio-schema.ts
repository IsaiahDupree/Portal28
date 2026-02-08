/**
 * Motion Canvas Integration - Shared Audio Events Schema
 * Engine-agnostic audio event definitions for synchronization
 */

import { AudioEvent } from './types';

/**
 * Audio event types
 */
export const AudioEventTypes = {
  REVEAL: 'reveal',
  TRANSITION: 'transition',
  EMPHASIS: 'emphasis',
  BACKGROUND: 'background',
} as const;

/**
 * Standard audio cues library
 */
export const StandardAudioCues = {
  reveal_riser: { file: 'reveal-riser.mp3', duration: 500 },
  impact_soft: { file: 'impact-soft.mp3', duration: 200 },
  text_ping: { file: 'text-ping.mp3', duration: 150 },
  whoosh_fast: { file: 'whoosh-fast.mp3', duration: 300 },
  transition_sweep: { file: 'transition-sweep.mp3', duration: 400 },
  emphasis_ding: { file: 'emphasis-ding.mp3', duration: 250 },
  bg_ambient: { file: 'bg-ambient.mp3', duration: -1 }, // loops
} as const;

/**
 * Create an audio event
 */
export function createAudioEvent(
  type: AudioEvent['type'],
  timestamp: number,
  options?: {
    soundFile?: string;
    volume?: number;
    metadata?: Record<string, any>;
  }
): AudioEvent {
  return {
    id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    type,
    soundFile: options?.soundFile,
    volume: options?.volume ?? 1.0,
    metadata: options?.metadata,
  };
}

/**
 * Validate audio event schema
 */
export function validateAudioEvent(event: any): event is AudioEvent {
  return (
    typeof event === 'object' &&
    typeof event.id === 'string' &&
    typeof event.timestamp === 'number' &&
    ['reveal', 'transition', 'emphasis', 'background'].includes(event.type) &&
    (event.soundFile === undefined || typeof event.soundFile === 'string') &&
    (event.volume === undefined || typeof event.volume === 'number')
  );
}

/**
 * Merge audio events from multiple sources
 */
export function mergeAudioEvents(events: AudioEvent[][]): AudioEvent[] {
  const merged = events.flat();
  // Sort by timestamp
  merged.sort((a, b) => a.timestamp - b.timestamp);
  // Remove duplicates based on ID
  const unique = merged.filter(
    (event, index, self) => index === self.findIndex((e) => e.id === event.id)
  );
  return unique;
}

/**
 * Get audio events in a time range
 */
export function getEventsInRange(
  events: AudioEvent[],
  startTime: number,
  endTime: number
): AudioEvent[] {
  return events.filter(
    (event) => event.timestamp >= startTime && event.timestamp <= endTime
  );
}

/**
 * Convert audio events to timeline format
 */
export function audioEventsToTimeline(events: AudioEvent[]): {
  timestamp: number;
  type: string;
  data: AudioEvent;
}[] {
  return events.map((event) => ({
    timestamp: event.timestamp,
    type: 'audio',
    data: event,
  }));
}
