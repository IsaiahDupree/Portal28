/**
 * Motion Canvas Integration - Engine-Agnostic Timeline
 * Timeline management for coordinating audio and visual events
 */

import { TimelineEvent, AudioEvent, VisualReveal } from './types';

/**
 * Timeline manager for coordinating events
 */
export class Timeline {
  private events: TimelineEvent[] = [];
  private duration: number = 0;
  private fps: number = 30;

  constructor(config: { duration: number; fps?: number }) {
    this.duration = config.duration;
    this.fps = config.fps ?? 30;
  }

  /**
   * Add an event to the timeline
   */
  addEvent(event: TimelineEvent): void {
    this.events.push(event);
    // Keep events sorted by timestamp
    this.events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Add multiple events at once
   */
  addEvents(events: TimelineEvent[]): void {
    this.events.push(...events);
    this.events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Add an audio event
   */
  addAudioEvent(audioEvent: AudioEvent): void {
    this.addEvent({
      id: audioEvent.id,
      timestamp: audioEvent.timestamp,
      duration: 0, // Point event
      type: 'audio',
      data: audioEvent,
    });
  }

  /**
   * Add a visual reveal event
   */
  addVisualReveal(reveal: VisualReveal): void {
    this.addEvent({
      id: reveal.id,
      timestamp: reveal.timestamp,
      duration: reveal.duration,
      type: 'visual',
      data: reveal,
    });
  }

  /**
   * Get all events
   */
  getAllEvents(): TimelineEvent[] {
    return [...this.events];
  }

  /**
   * Get events at a specific time
   */
  getEventsAtTime(time: number): TimelineEvent[] {
    return this.events.filter(
      (event) =>
        event.timestamp <= time &&
        (event.duration === 0 || event.timestamp + event.duration >= time)
    );
  }

  /**
   * Get events in a time range
   */
  getEventsInRange(startTime: number, endTime: number): TimelineEvent[] {
    return this.events.filter(
      (event) =>
        (event.timestamp >= startTime && event.timestamp <= endTime) ||
        (event.timestamp < startTime &&
          event.timestamp + event.duration > startTime)
    );
  }

  /**
   * Get events by type
   */
  getEventsByType(type: TimelineEvent['type']): TimelineEvent[] {
    return this.events.filter((event) => event.type === type);
  }

  /**
   * Get the total duration
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Get the FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Get the total number of frames
   */
  getTotalFrames(): number {
    return Math.ceil(this.duration * this.fps);
  }

  /**
   * Convert time to frame number
   */
  timeToFrame(time: number): number {
    return Math.floor(time * this.fps);
  }

  /**
   * Convert frame number to time
   */
  frameToTime(frame: number): number {
    return frame / this.fps;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Export timeline to JSON
   */
  toJSON(): {
    duration: number;
    fps: number;
    events: TimelineEvent[];
  } {
    return {
      duration: this.duration,
      fps: this.fps,
      events: this.events,
    };
  }

  /**
   * Import timeline from JSON
   */
  static fromJSON(data: {
    duration: number;
    fps: number;
    events: TimelineEvent[];
  }): Timeline {
    const timeline = new Timeline({
      duration: data.duration,
      fps: data.fps,
    });
    timeline.addEvents(data.events);
    return timeline;
  }
}

/**
 * Create a timeline from audio and visual events
 */
export function createTimelineFromEvents(
  audioEvents: AudioEvent[],
  visualReveals: VisualReveal[],
  config: { duration: number; fps?: number }
): Timeline {
  const timeline = new Timeline(config);

  // Add audio events
  for (const audioEvent of audioEvents) {
    timeline.addAudioEvent(audioEvent);
  }

  // Add visual reveals
  for (const reveal of visualReveals) {
    timeline.addVisualReveal(reveal);
  }

  return timeline;
}
