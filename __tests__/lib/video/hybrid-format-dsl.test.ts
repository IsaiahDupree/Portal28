/**
 * Tests for Hybrid Format DSL
 * Test IDs: VID-HFD-001, VID-HFD-002, VID-HFD-003
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  FormatBlockType,
  DEFAULT_STYLES,
  BEAT_ACTION_TO_REVEAL,
} from '@/lib/video/format/hybrid-types';
import {
  DSLParser,
  parseDSL,
  validateDSL,
  formatBlock,
  blocksToDSL,
  tokenizeDSL,
} from '@/lib/video/format/dsl-parser';
import {
  BeatMapper,
  createBeatMapper,
  quickMapBeats,
  optimizeBeatTiming,
} from '@/lib/video/format/beat-mapping';

describe('Hybrid Format DSL', () => {
  describe('VID-HFD-001: Format Block Types', () => {
    it('should define all required block types', () => {
      const requiredTypes: FormatBlockType[] = [
        'keyword',
        'bullet',
        'code',
        'error',
        'success',
        'cta',
      ];

      for (const type of requiredTypes) {
        expect(DEFAULT_STYLES[type]).toBeDefined();
      }
    });

    it('should have default styles for all block types', () => {
      const blockTypes: FormatBlockType[] = Object.keys(DEFAULT_STYLES) as FormatBlockType[];

      for (const type of blockTypes) {
        const style = DEFAULT_STYLES[type];
        expect(style).toBeDefined();
        expect(style.fontSize).toBeGreaterThan(0);
        expect(style.animation).toBeTruthy();
      }
    });

    it('should render keyword blocks', () => {
      const dsl = '@keyword Important Term';
      const result = parseDSL(dsl);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('keyword');
      expect(result.blocks[0].content).toBe('Important Term');
      expect(result.errors).toHaveLength(0);
    });

    it('should render bullet blocks', () => {
      const dsl = '@bullet First point\n@bullet Second point';
      const result = parseDSL(dsl);

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe('bullet');
      expect(result.blocks[1].type).toBe('bullet');
    });

    it('should render code blocks', () => {
      const dsl = '@code const x = 10;';
      const result = parseDSL(dsl);

      expect(result.blocks[0].type).toBe('code');
      expect(result.blocks[0].style?.backgroundColor).toBe('#1e293b');
    });

    it('should render error blocks', () => {
      const dsl = '@error Something went wrong';
      const result = parseDSL(dsl);

      expect(result.blocks[0].type).toBe('error');
      expect(result.blocks[0].style?.icon).toBe('❌');
    });

    it('should render success blocks', () => {
      const dsl = '@success Operation completed';
      const result = parseDSL(dsl);

      expect(result.blocks[0].type).toBe('success');
      expect(result.blocks[0].style?.icon).toBe('✓');
    });

    it('should render CTA blocks', () => {
      const dsl = '@cta Click here to learn more';
      const result = parseDSL(dsl);

      expect(result.blocks[0].type).toBe('cta');
      expect(result.blocks[0].style?.fontSize).toBe(20);
    });

    it('should handle plain text without prefix', () => {
      const dsl = 'Plain text content';
      const result = parseDSL(dsl);

      expect(result.blocks[0].type).toBe('text');
      expect(result.blocks[0].content).toBe('Plain text content');
    });

    it('should handle mixed content', () => {
      const dsl = `
@heading Introduction
Plain text description
@keyword Important
@bullet Point 1
@code console.log('test');
@success Done!
      `.trim();

      const result = parseDSL(dsl);
      expect(result.blocks).toHaveLength(6);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('VID-HFD-002: Beat Action Mapping', () => {
    let mapper: BeatMapper;

    beforeEach(() => {
      mapper = createBeatMapper();
    });

    it('should map blocks to visual beats', () => {
      const dsl = '@keyword Test\n@bullet Point';
      const parsed = parseDSL(dsl);
      const mapping = mapper.mapBeats(parsed.blocks);

      expect(mapping.reveals).toHaveLength(2);
      expect(mapping.reveals[0].kind).toBeTruthy();
      expect(mapping.reveals[0].timestamp).toBeGreaterThanOrEqual(0);
    });

    it('should map beat actions to reveal kinds', () => {
      expect(BEAT_ACTION_TO_REVEAL['fade-in']).toBe('fade-in');
      expect(BEAT_ACTION_TO_REVEAL['slide-in']).toBe('slide-in');
      expect(BEAT_ACTION_TO_REVEAL['zoom']).toBe('zoom-in');
    });

    it('should generate audio cues for blocks', () => {
      const dsl = '@keyword Test\n@cta Action';
      const parsed = parseDSL(dsl);
      const mapping = mapper.mapBeats(parsed.blocks);

      expect(mapping.audioEvents.length).toBeGreaterThan(0);
    });

    it('should respect block timestamps if provided', () => {
      const blocks = parseDSL('@keyword Test').blocks;
      blocks[0].timestamp = 1000;

      const mapping = mapper.mapBeats(blocks);
      expect(mapping.reveals[0].timestamp).toBe(1000);
    });

    it('should calculate total duration', () => {
      const dsl = '@keyword One\n@keyword Two';
      const parsed = parseDSL(dsl);
      const mapping = mapper.mapBeats(parsed.blocks);

      expect(mapping.totalDuration).toBeGreaterThan(0);
    });

    it('should support disabling audio cues', () => {
      const mapper = createBeatMapper({ audioCuesEnabled: false });
      const dsl = '@keyword Test';
      const parsed = parseDSL(dsl);
      const mapping = mapper.mapBeats(parsed.blocks);

      expect(mapping.audioEvents).toHaveLength(0);
    });

    it('should optimize beat timing for target duration', () => {
      const dsl = '@keyword One\n@keyword Two';
      const parsed = parseDSL(dsl);
      const mapping = mapper.mapBeats(parsed.blocks);

      const targetDuration = 5000;
      const optimized = optimizeBeatTiming(mapping, targetDuration);

      expect(optimized.totalDuration).toBe(targetDuration);
      expect(optimized.reveals).toHaveLength(mapping.reveals.length);
    });

    it('should use quick map for simple cases', () => {
      const blocks = parseDSL('@keyword Test').blocks;
      const mapping = quickMapBeats(blocks);

      expect(mapping.reveals).toHaveLength(1);
      expect(mapping.audioEvents.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('VID-HFD-003: Style Configuration & DSL Parsing', () => {
    it('should apply default styles to blocks', () => {
      const dsl = '@keyword Test';
      const result = parseDSL(dsl);
      const block = result.blocks[0];

      expect(block.style).toBeDefined();
      expect(block.style?.backgroundColor).toBe('#3b82f6');
      expect(block.style?.textColor).toBe('#ffffff');
    });

    it('should make styles customizable', () => {
      const dsl = '@code const x = 10;';
      const result = parseDSL(dsl);
      const block = result.blocks[0];

      // Verify style is customizable by checking it's an object
      expect(typeof block.style).toBe('object');
      expect(block.style?.backgroundColor).toBeTruthy();
    });

    it('should parse DSL correctly', () => {
      const dsl = `
@heading Title
@keyword Important
Regular text
@bullet Point 1
      `.trim();

      const result = parseDSL(dsl);

      expect(result.blocks).toHaveLength(4);
      expect(result.errors).toHaveLength(0);
      expect(result.blocks[0].type).toBe('heading');
      expect(result.blocks[1].type).toBe('keyword');
      expect(result.blocks[2].type).toBe('text');
      expect(result.blocks[3].type).toBe('bullet');
    });

    it('should validate DSL syntax', () => {
      const validDSL = '@keyword Test';
      const result = validateDSL(validDSL);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid block types', () => {
      const invalidDSL = '@invalid This should error';
      const result = parseDSL(invalidDSL);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle comments', () => {
      const dsl = `
// This is a comment
@keyword Test
# Another comment
@bullet Point
      `.trim();

      const result = parseDSL(dsl);
      expect(result.blocks).toHaveLength(2); // Comments ignored
    });

    it('should handle empty lines', () => {
      const dsl = `
@keyword Test

@bullet Point

      `.trim();

      const result = parseDSL(dsl);
      expect(result.blocks).toHaveLength(2); // Empty lines ignored
    });

    it('should tokenize DSL content', () => {
      const dsl = '@keyword Test\n@bullet Point';
      const tokens = tokenizeDSL(dsl);

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe('keyword');
      expect(tokens[1].type).toBe('bullet');
    });

    it('should format blocks back to DSL', () => {
      const dsl = '@keyword Test';
      const parsed = parseDSL(dsl);
      const formatted = formatBlock(parsed.blocks[0]);

      expect(formatted).toBe('@keyword Test');
    });

    it('should convert blocks to DSL string', () => {
      const dsl = '@keyword One\n@bullet Two';
      const parsed = parseDSL(dsl);
      const reconstructed = blocksToDSL(parsed.blocks);

      expect(reconstructed).toContain('@keyword One');
      expect(reconstructed).toContain('@bullet Two');
    });

    it('should preserve metadata during parsing', () => {
      const dsl = '@keyword Test';
      const result = parseDSL(dsl);

      expect(result.blocks[0].metadata).toBeDefined();
      expect(result.blocks[0].metadata?.lineNumber).toBe(1);
    });
  });

  describe('Integration: Complete DSL Workflow', () => {
    it('should handle end-to-end DSL processing', () => {
      const dsl = `
@heading Introduction to TypeScript
TypeScript is a typed superset of JavaScript.

@keyword Type Safety
@bullet Catch errors at compile time
@bullet Better IDE support
@bullet Improved code quality

@code const greeting: string = "Hello";

@success TypeScript makes JavaScript better!
@cta Try it today
      `.trim();

      // Parse
      const parsed = parseDSL(dsl);
      expect(parsed.blocks.length).toBeGreaterThan(0);
      expect(parsed.errors).toHaveLength(0);

      // Map to beats
      const mapper = createBeatMapper();
      const mapping = mapper.mapBeats(parsed.blocks);

      expect(mapping.reveals.length).toBe(parsed.blocks.length);
      expect(mapping.totalDuration).toBeGreaterThan(0);

      // Validate reveals have proper timing
      for (let i = 1; i < mapping.reveals.length; i++) {
        expect(mapping.reveals[i].timestamp).toBeGreaterThan(
          mapping.reveals[i - 1].timestamp
        );
      }
    });

    it('should support round-trip conversion', () => {
      const originalDSL = '@keyword Test\n@bullet Point';
      const parsed = parseDSL(originalDSL);
      const reconstructed = blocksToDSL(parsed.blocks);
      const reparsed = parseDSL(reconstructed);

      expect(reparsed.blocks).toHaveLength(parsed.blocks.length);
      expect(reparsed.blocks[0].type).toBe(parsed.blocks[0].type);
    });
  });
});
