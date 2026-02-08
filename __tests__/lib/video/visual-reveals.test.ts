/**
 * Tests for Visual Reveals System
 * Test IDs: VID-VRS-001, VID-VRS-002, VID-VRS-003
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  RevealRecorder,
  syncSFXToReveals,
  validateRevealTimestamps,
  RevealEvent,
} from '@/lib/video/format/reveal-recorder';
import {
  PacingSeeder,
  DEFAULT_WPM_CONFIG,
  quickSeed,
  createSeeder,
  ContentBlock,
} from '@/lib/video/format/pacing-seeder';
import { StandardAudioCues } from '@/lib/video/motion-canvas/audio-schema';

describe('Visual Reveals System', () => {
  describe('VID-VRS-001: Capture Visual Element Appearances', () => {
    let recorder: RevealRecorder;

    beforeEach(() => {
      recorder = new RevealRecorder();
    });

    it('should capture reveal events with timestamps', () => {
      recorder.start();

      const reveal1 = recorder.record('title', 'fade-in');
      const reveal2 = recorder.record('subtitle', 'slide-in', {
        timestamp: 500,
      });

      const reveals = recorder.getReveals();

      expect(reveals).toHaveLength(2);
      expect(reveals[0].element).toBe('title');
      expect(reveals[0].kind).toBe('fade-in');
      expect(reveals[1].timestamp).toBe(500);
    });

    it('should record reveal kind accurately', () => {
      recorder.start();

      const reveal = recorder.record('element', 'scale-up', {
        duration: 300,
      });

      expect(reveal.kind).toBe('scale-up');
      expect(reveal.duration).toBe(300);
    });

    it('should support multiple reveal kinds', () => {
      recorder.start();

      const kinds = [
        'fade-in',
        'slide-in-left',
        'slide-in-right',
        'scale-up',
        'zoom-in',
        'bounce-in',
      ] as const;

      for (const kind of kinds) {
        recorder.record(`element-${kind}`, kind);
      }

      const reveals = recorder.getReveals();
      expect(reveals).toHaveLength(6);
    });

    it('should include metadata with reveals', () => {
      recorder.start();

      const reveal = recorder.record('element', 'fade-in', {
        metadata: {
          x: 100,
          y: 200,
          opacity: 0.5,
        },
      });

      expect(reveal.metadata).toEqual({
        x: 100,
        y: 200,
        opacity: 0.5,
      });
    });

    it('should only record when actively recording', () => {
      const reveal1 = recorder.record('before', 'fade-in');

      recorder.start();
      const reveal2 = recorder.record('during', 'fade-in');
      recorder.stop();

      const reveal3 = recorder.record('after', 'fade-in');

      const reveals = recorder.getReveals();
      expect(reveals).toHaveLength(1);
      expect(reveals[0].element).toBe('during');
    });

    it('should get reveals in time range', () => {
      recorder.start();

      recorder.record('early', 'fade-in', { timestamp: 100 });
      recorder.record('middle', 'fade-in', { timestamp: 500 });
      recorder.record('late', 'fade-in', { timestamp: 900 });

      const reveals = recorder.getRevealsInRange(200, 800);
      expect(reveals).toHaveLength(1);
      expect(reveals[0].element).toBe('middle');
    });

    it('should export reveals to JSON', () => {
      recorder.start();

      recorder.record('element1', 'fade-in', { timestamp: 0, duration: 500 });
      recorder.record('element2', 'slide-in', { timestamp: 600, duration: 400 });

      const json = recorder.toJSON();

      expect(json.count).toBe(2);
      expect(json.totalDuration).toBe(1000); // 600 + 400
      expect(json.reveals).toHaveLength(2);
    });
  });

  describe('VID-VRS-002: Timestamp Accuracy', () => {
    it('should validate reveal timestamps', () => {
      const validReveals: RevealEvent[] = [
        {
          id: 'r1',
          element: 'element1',
          kind: 'fade-in',
          timestamp: 0,
          duration: 500,
        },
        {
          id: 'r2',
          element: 'element2',
          kind: 'slide-in',
          timestamp: 600,
          duration: 400,
        },
      ];

      const result = validateRevealTimestamps(validReveals);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect negative timestamps', () => {
      const invalidReveals: RevealEvent[] = [
        {
          id: 'r1',
          element: 'element',
          kind: 'fade-in',
          timestamp: -100,
          duration: 500,
        },
      ];

      const result = validateRevealTimestamps(invalidReveals);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect overlapping reveals on same element', () => {
      const overlappingReveals: RevealEvent[] = [
        {
          id: 'r1',
          element: 'same-element',
          kind: 'fade-in',
          timestamp: 0,
          duration: 500,
        },
        {
          id: 'r2',
          element: 'same-element',
          kind: 'slide-in',
          timestamp: 300, // Overlaps with first reveal
          duration: 400,
        },
      ];

      const result = validateRevealTimestamps(overlappingReveals, 50);
      expect(result.valid).toBe(false);
    });

    it('should allow reveals on different elements at same time', () => {
      const simultaneousReveals: RevealEvent[] = [
        {
          id: 'r1',
          element: 'element1',
          kind: 'fade-in',
          timestamp: 100,
          duration: 500,
        },
        {
          id: 'r2',
          element: 'element2',
          kind: 'fade-in',
          timestamp: 100, // Same time, different element
          duration: 500,
        },
      ];

      const result = validateRevealTimestamps(simultaneousReveals);
      expect(result.valid).toBe(true);
    });
  });

  describe('VID-VRS-003: SFX Sync and WPM Seeder', () => {
    it('should sync SFX to reveals', () => {
      const reveals: RevealEvent[] = [
        {
          id: 'r1',
          element: 'title',
          kind: 'fade-in',
          timestamp: 0,
          duration: 500,
        },
        {
          id: 'r2',
          element: 'content',
          kind: 'slide-in',
          timestamp: 600,
          duration: 400,
        },
      ];

      const audioEvents = syncSFXToReveals(reveals);

      expect(audioEvents).toHaveLength(2);
      expect(audioEvents[0].timestamp).toBe(0);
      expect(audioEvents[1].timestamp).toBe(600);
      expect(audioEvents[0].type).toBe('reveal');
    });

    it('should use custom SFX when specified', () => {
      const reveals: RevealEvent[] = [
        {
          id: 'r1',
          element: 'title',
          kind: 'fade-in',
          timestamp: 0,
          duration: 500,
          sfx: 'custom-sound.mp3',
        },
      ];

      const audioEvents = syncSFXToReveals(reveals);

      expect(audioEvents[0].soundFile).toBe('custom-sound.mp3');
    });

    it('should assign appropriate SFX based on reveal kind', () => {
      const reveals: RevealEvent[] = [
        {
          id: 'r1',
          element: 'title',
          kind: 'fade-in',
          timestamp: 0,
          duration: 500,
        },
        {
          id: 'r2',
          element: 'content',
          kind: 'slide-in',
          timestamp: 600,
          duration: 400,
        },
      ];

      const audioEvents = syncSFXToReveals(reveals);

      expect(audioEvents[0].soundFile).toBe(StandardAudioCues.reveal_riser.file);
      expect(audioEvents[1].soundFile).toBe(StandardAudioCues.whoosh_fast.file);
    });
  });

  describe('WPM-Based Pacing Seeder', () => {
    let seeder: PacingSeeder;

    beforeEach(() => {
      seeder = new PacingSeeder();
    });

    it('should use WPM model for pacing', () => {
      const blocks: ContentBlock[] = [
        {
          type: 'text',
          content: 'This is a test sentence with ten words in it.',
          wordCount: 10,
        },
      ];

      const result = seeder.seed(blocks);

      expect(result.wpmUsed).toBe(DEFAULT_WPM_CONFIG.readingSpeed);
      expect(result.reveals).toHaveLength(1);
    });

    it('should generate reveals with accurate timing', () => {
      const blocks: ContentBlock[] = [
        {
          type: 'heading',
          content: 'Introduction',
        },
        {
          type: 'text',
          content: 'This is the main content with more words to read.',
        },
      ];

      const result = seeder.seed(blocks);

      expect(result.reveals).toHaveLength(2);
      expect(result.reveals[0].timestamp).toBe(0);
      expect(result.reveals[1].timestamp).toBeGreaterThan(
        result.reveals[0].timestamp
      );
    });

    it('should optimize pacing with minimum intervals', () => {
      const blocks: ContentBlock[] = [
        { type: 'text', content: 'One' },
        { type: 'text', content: 'Two' },
        { type: 'text', content: 'Three' },
      ];

      const result = seeder.seed(blocks);
      const optimized = seeder.optimizePacing(result.reveals);

      // Check intervals between reveals
      for (let i = 1; i < optimized.length; i++) {
        const interval = optimized[i].timestamp - optimized[i - 1].timestamp;
        expect(interval).toBeGreaterThanOrEqual(DEFAULT_WPM_CONFIG.minRevealInterval);
      }
    });

    it('should calculate optimal WPM for target duration', () => {
      const blocks: ContentBlock[] = [
        {
          type: 'text',
          content: 'Word '.repeat(100), // 100 words
          wordCount: 100,
        },
      ];

      const targetDuration = 30000; // 30 seconds
      const optimalWPM = seeder.calculateOptimalWPM(blocks, targetDuration);

      // 100 words in 30 seconds = 200 WPM
      expect(optimalWPM).toBeCloseTo(200, 0);
    });

    it('should support quick seed for simple content', () => {
      const result = quickSeed('This is a test with five words', 180);

      expect(result.reveals).toHaveLength(1);
      expect(result.wpmUsed).toBe(180);
    });

    it('should create seeder with custom WPM', () => {
      const customSeeder = createSeeder(250);
      const blocks: ContentBlock[] = [
        {
          type: 'text',
          content: 'Test content',
        },
      ];

      const result = customSeeder.seed(blocks);
      expect(result.wpmUsed).toBe(250);
    });

    it('should apply duration modifiers for different content types', () => {
      const blocks: ContentBlock[] = [
        { type: 'heading', content: 'Quick heading' },
        { type: 'code', content: 'Slower code block' },
        { type: 'text', content: 'Normal text speed' },
      ];

      const result = seeder.seed(blocks);

      // Code should take longer than heading
      const headingDuration = result.reveals[0].timestamp;
      const codeDuration = result.reveals[1].timestamp - result.reveals[0].timestamp;

      // Code has 1.8x modifier vs heading's 0.6x modifier
      expect(codeDuration).toBeGreaterThan(headingDuration);
    });
  });

  describe('Integration: Complete Reveal System', () => {
    it('should capture, seed, and sync reveals with SFX', () => {
      // Step 1: Seed reveals using WPM model
      const blocks: ContentBlock[] = [
        { type: 'heading', content: 'Title' },
        { type: 'text', content: 'Main content here' },
        { type: 'image', content: 'Image description' },
      ];

      const seeder = new PacingSeeder();
      const seedResult = seeder.seed(blocks);

      // Step 2: Validate timestamps
      const validation = validateRevealTimestamps(seedResult.reveals);
      expect(validation.valid).toBe(true);

      // Step 3: Sync SFX
      const audioEvents = syncSFXToReveals(seedResult.reveals);
      expect(audioEvents).toHaveLength(3);

      // Step 4: Verify audio events align with reveals
      for (let i = 0; i < seedResult.reveals.length; i++) {
        expect(audioEvents[i].timestamp).toBe(seedResult.reveals[i].timestamp);
      }
    });
  });
});
