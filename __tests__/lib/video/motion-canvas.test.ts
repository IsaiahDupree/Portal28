/**
 * Tests for Motion Canvas Integration
 * Test IDs: VID-MCI-001, VID-MCI-002, VID-MCI-003
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createAudioEvent,
  validateAudioEvent,
  mergeAudioEvents,
  StandardAudioCues,
} from '@/lib/video/motion-canvas/audio-schema';
import { Timeline, createTimelineFromEvents } from '@/lib/video/motion-canvas/timeline';
import { AudioEvent, VisualReveal, MotionCanvasScene, RenderContext } from '@/lib/video/motion-canvas/types';

describe('Motion Canvas Integration', () => {
  describe('VID-MCI-001: Shared Audio Events Schema', () => {
    it('should create valid audio events', () => {
      const event = createAudioEvent('reveal', 1000, {
        soundFile: 'reveal-riser.mp3',
        volume: 0.8,
      });

      expect(event).toBeDefined();
      expect(event.type).toBe('reveal');
      expect(event.timestamp).toBe(1000);
      expect(event.soundFile).toBe('reveal-riser.mp3');
      expect(event.volume).toBe(0.8);
    });

    it('should validate audio events correctly', () => {
      const validEvent = createAudioEvent('transition', 500);
      expect(validateAudioEvent(validEvent)).toBe(true);

      const invalidEvent = { id: '123', type: 'invalid' };
      expect(validateAudioEvent(invalidEvent)).toBe(false);
    });

    it('should merge audio events from multiple sources', () => {
      const events1 = [
        createAudioEvent('reveal', 100),
        createAudioEvent('emphasis', 200),
      ];
      const events2 = [
        createAudioEvent('transition', 150),
        createAudioEvent('background', 300),
      ];

      const merged = mergeAudioEvents([events1, events2]);

      expect(merged).toHaveLength(4);
      expect(merged[0].timestamp).toBe(100);
      expect(merged[1].timestamp).toBe(150);
      expect(merged[2].timestamp).toBe(200);
      expect(merged[3].timestamp).toBe(300);
    });

    it('should have standard audio cues library', () => {
      expect(StandardAudioCues.reveal_riser).toBeDefined();
      expect(StandardAudioCues.impact_soft).toBeDefined();
      expect(StandardAudioCues.text_ping).toBeDefined();
      expect(StandardAudioCues.whoosh_fast).toBeDefined();
    });
  });

  describe('VID-MCI-002: Engine-Agnostic Timeline', () => {
    let timeline: Timeline;

    beforeEach(() => {
      timeline = new Timeline({ duration: 10, fps: 30 });
    });

    it('should create a timeline with correct configuration', () => {
      expect(timeline.getDuration()).toBe(10);
      expect(timeline.getFPS()).toBe(30);
      expect(timeline.getTotalFrames()).toBe(300);
    });

    it('should add and retrieve audio events', () => {
      const audioEvent: AudioEvent = createAudioEvent('reveal', 1000);
      timeline.addAudioEvent(audioEvent);

      const events = timeline.getEventsByType('audio');
      expect(events).toHaveLength(1);
      expect(events[0].data).toMatchObject({
        timestamp: 1000,
        type: 'reveal',
      });
    });

    it('should add and retrieve visual reveal events', () => {
      const reveal: VisualReveal = {
        id: 'reveal-1',
        timestamp: 2000,
        element: 'title',
        kind: 'fade-in',
        duration: 500,
      };

      timeline.addVisualReveal(reveal);

      const events = timeline.getEventsByType('visual');
      expect(events).toHaveLength(1);
      expect(events[0].data).toMatchObject(reveal);
    });

    it('should get events in a time range', () => {
      timeline.addAudioEvent(createAudioEvent('reveal', 1000));
      timeline.addAudioEvent(createAudioEvent('emphasis', 2000));
      timeline.addAudioEvent(createAudioEvent('transition', 3000));

      const events = timeline.getEventsInRange(1500, 2500);
      expect(events).toHaveLength(1);
      expect(events[0].timestamp).toBe(2000);
    });

    it('should convert between time and frames', () => {
      const time = 5.5; // 5.5 seconds
      const frame = timeline.timeToFrame(time);
      expect(frame).toBe(165); // 5.5 * 30 fps

      const backToTime = timeline.frameToTime(frame);
      expect(backToTime).toBeCloseTo(5.5, 1);
    });

    it('should export and import timeline as JSON', () => {
      timeline.addAudioEvent(createAudioEvent('reveal', 1000));

      const json = timeline.toJSON();
      expect(json.duration).toBe(10);
      expect(json.fps).toBe(30);
      expect(json.events).toHaveLength(1);

      const imported = Timeline.fromJSON(json);
      expect(imported.getDuration()).toBe(10);
      expect(imported.getFPS()).toBe(30);
      expect(imported.getAllEvents()).toHaveLength(1);
    });
  });

  describe('VID-MCI-003: Two-Pass Pipeline Integration', () => {
    it('should create timeline from audio and visual events', () => {
      const audioEvents: AudioEvent[] = [
        createAudioEvent('reveal', 1000),
        createAudioEvent('emphasis', 2000),
      ];

      const visualReveals: VisualReveal[] = [
        {
          id: 'reveal-1',
          timestamp: 1000,
          element: 'title',
          kind: 'fade-in',
          duration: 500,
        },
        {
          id: 'reveal-2',
          timestamp: 2000,
          element: 'subtitle',
          kind: 'slide-in',
          duration: 300,
        },
      ];

      const timeline = createTimelineFromEvents(audioEvents, visualReveals, {
        duration: 10,
        fps: 30,
      });

      expect(timeline.getAllEvents()).toHaveLength(4);
      expect(timeline.getEventsByType('audio')).toHaveLength(2);
      expect(timeline.getEventsByType('visual')).toHaveLength(2);
    });

    it('should coordinate audio and visual events', () => {
      const audioEvents: AudioEvent[] = [
        createAudioEvent('reveal', 1000, {
          soundFile: StandardAudioCues.reveal_riser.file,
        }),
      ];

      const visualReveals: VisualReveal[] = [
        {
          id: 'reveal-1',
          timestamp: 1000, // Same timestamp as audio
          element: 'title',
          kind: 'fade-in',
          duration: 500,
        },
      ];

      const timeline = createTimelineFromEvents(audioEvents, visualReveals, {
        duration: 10,
        fps: 30,
      });

      const eventsAtTime = timeline.getEventsAtTime(1000);
      expect(eventsAtTime).toHaveLength(2); // Both audio and visual at same time
    });

    it('should handle scene render context', async () => {
      const mockScene: MotionCanvasScene = {
        id: 'test-scene',
        name: 'Test Scene',
        duration: 5,
        audioEvents: [],
        onRender: async (context: RenderContext) => {
          // Trigger audio event
          context.triggerAudioEvent(createAudioEvent('reveal', 1000));

          // Record visual reveal
          context.recordVisualReveal({
            id: 'reveal-1',
            timestamp: 1000,
            element: 'title',
            kind: 'fade-in',
            duration: 500,
          });

          expect(context.fps).toBeGreaterThan(0);
          expect(context.timeline).toBeDefined();
        },
      };

      // Test that the scene can be called
      const audioEvents: AudioEvent[] = [];
      const visualReveals: VisualReveal[] = [];

      const context: RenderContext = {
        frame: 0,
        time: 0,
        fps: 30,
        timeline: [],
        triggerAudioEvent: (event) => audioEvents.push(event),
        recordVisualReveal: (reveal) => visualReveals.push(reveal),
      };

      await mockScene.onRender(context);

      expect(audioEvents).toHaveLength(1);
      expect(visualReveals).toHaveLength(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete video rendering workflow', () => {
      // Step 1: Create audio events
      const audioEvents: AudioEvent[] = [
        createAudioEvent('reveal', 0, {
          soundFile: StandardAudioCues.reveal_riser.file,
        }),
        createAudioEvent('emphasis', 2000, {
          soundFile: StandardAudioCues.impact_soft.file,
        }),
        createAudioEvent('transition', 4000, {
          soundFile: StandardAudioCues.whoosh_fast.file,
        }),
      ];

      // Step 2: Create visual reveals
      const visualReveals: VisualReveal[] = [
        {
          id: 'reveal-1',
          timestamp: 0,
          element: 'title',
          kind: 'fade-in',
          duration: 1000,
        },
        {
          id: 'reveal-2',
          timestamp: 2000,
          element: 'content',
          kind: 'slide-in',
          duration: 800,
        },
        {
          id: 'reveal-3',
          timestamp: 4000,
          element: 'cta',
          kind: 'scale-up',
          duration: 600,
        },
      ];

      // Step 3: Create timeline
      const timeline = createTimelineFromEvents(audioEvents, visualReveals, {
        duration: 10,
        fps: 30,
      });

      // Verify timeline is correctly constructed
      expect(timeline.getAllEvents()).toHaveLength(6);
      expect(timeline.getTotalFrames()).toBe(300);

      // Verify audio and visual are synced
      const eventsAtStart = timeline.getEventsAtTime(0);
      const audioAtStart = eventsAtStart.filter((e) => e.type === 'audio');
      const visualAtStart = eventsAtStart.filter((e) => e.type === 'visual');
      expect(audioAtStart).toHaveLength(1);
      expect(visualAtStart).toHaveLength(1);

      // Verify final output
      const json = timeline.toJSON();
      expect(json.events).toHaveLength(6);
      expect(json.duration).toBe(10);
    });
  });
});
