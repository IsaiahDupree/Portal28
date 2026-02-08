/**
 * Tests for Macro Cues System
 * Test IDs: VID-MAC-001, VID-MAC-002, VID-MAC-003, VID-MAC-004
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  MacroCuesManager,
  MACRO_CUES,
  getCueConfig,
  getAvailableCues,
  MacroCue,
} from '@/lib/video/sfx/macro-cues';
import {
  PolicyEngine,
  POLICY_RULES,
  createPlacementContext,
} from '@/lib/video/sfx/policy-engine';

describe('Macro Cues System', () => {
  describe('VID-MAC-001: Macro → SFX Mappings', () => {
    it('should have all required macro cues defined', () => {
      const requiredCues: MacroCue[] = [
        'reveal_riser',
        'impact_soft',
        'text_ping',
        'whoosh_fast',
      ];

      for (const cue of requiredCues) {
        expect(MACRO_CUES[cue]).toBeDefined();
        expect(MACRO_CUES[cue].sfxFile).toBeTruthy();
        expect(MACRO_CUES[cue].duration).toBeGreaterThan(0);
      }
    });

    it('should map macros to correct SFX files', () => {
      const config = getCueConfig('reveal_riser');
      expect(config.sfxFile).toBe('reveal-riser.mp3');

      const impactConfig = getCueConfig('impact_soft');
      expect(impactConfig.sfxFile).toBe('impact-soft.mp3');
    });

    it('should provide all available cues', () => {
      const cues = getAvailableCues();
      expect(cues).toContain('reveal_riser');
      expect(cues).toContain('impact_soft');
      expect(cues).toContain('text_ping');
      expect(cues).toContain('whoosh_fast');
    });

    it('should have priority values for all cues', () => {
      const cues = getAvailableCues();
      for (const cue of cues) {
        const config = getCueConfig(cue);
        expect(config.priority).toBeGreaterThanOrEqual(1);
        expect(config.priority).toBeLessThanOrEqual(10);
      }
    });

    it('should have cooldown values for all cues', () => {
      const cues = getAvailableCues();
      for (const cue of cues) {
        const config = getCueConfig(cue);
        expect(config.cooldown).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('VID-MAC-002: Policy Rules for Placement', () => {
    let policyEngine: PolicyEngine;

    beforeEach(() => {
      policyEngine = new PolicyEngine();
    });

    it('should have all required policy rules', () => {
      expect(POLICY_RULES.maxCuesPerWindow).toBeDefined();
      expect(POLICY_RULES.minIntervalSameCue).toBeDefined();
      expect(POLICY_RULES.maxAudioDensity).toBeDefined();
      expect(POLICY_RULES.priorityRespect).toBeDefined();
    });

    it('should prevent audio spam with max cues per window rule', () => {
      const context = createPlacementContext(
        'text_ping',
        5000,
        [
          { cue: 'reveal_riser', timestamp: 4000 },
          { cue: 'impact_soft', timestamp: 4500 },
          { cue: 'whoosh_fast', timestamp: 4800 },
        ],
        10000
      );

      const result = policyEngine.evaluate(context);
      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should allow placement when rules are satisfied', () => {
      const context = createPlacementContext(
        'reveal_riser',
        5000,
        [{ cue: 'impact_soft', timestamp: 1000 }],
        10000
      );

      const result = policyEngine.evaluate(context);
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should enforce minimum interval for same cue', () => {
      const context = createPlacementContext(
        'reveal_riser',
        1500,
        [{ cue: 'reveal_riser', timestamp: 1000 }],
        10000
      );

      const result = policyEngine.evaluate(context);
      expect(result.allowed).toBe(false);
    });

    it('should respect priority in conflict resolution', () => {
      const context = createPlacementContext(
        'text_ping', // Low priority
        2000,
        [{ cue: 'reveal_riser', timestamp: 1800 }], // High priority, recently placed
        10000
      );

      const result = policyEngine.evaluate(context);
      expect(result.allowed).toBe(false);
    });

    it('should prevent cues from extending past video end', () => {
      const context = createPlacementContext(
        'reveal_riser',
        9800, // Near end of 10s video
        [],
        10000
      );

      const result = policyEngine.evaluate(context);
      expect(result.allowed).toBe(false);
    });

    it('should allow disabling policy enforcement', () => {
      policyEngine.disable();

      const context = createPlacementContext(
        'text_ping',
        5000,
        [
          { cue: 'reveal_riser', timestamp: 4000 },
          { cue: 'impact_soft', timestamp: 4500 },
          { cue: 'whoosh_fast', timestamp: 4800 },
        ],
        10000
      );

      const result = policyEngine.evaluate(context);
      expect(result.allowed).toBe(true);

      policyEngine.enable();
    });
  });

  describe('VID-MAC-003: Cooldown Enforcement', () => {
    let manager: MacroCuesManager;

    beforeEach(() => {
      manager = new MacroCuesManager();
    });

    it('should enforce cooldown between same cue placements', () => {
      const cue: MacroCue = 'reveal_riser';
      const config = getCueConfig(cue);

      // Place first cue
      const result1 = manager.placeCue(cue, 0);
      expect(result1.success).toBe(true);

      // Try to place same cue immediately (should fail)
      const result2 = manager.placeCue(cue, 100);
      expect(result2.success).toBe(false);
      expect(result2.reason).toContain('Cooldown');

      // Place after cooldown (should succeed)
      const result3 = manager.placeCue(cue, config.cooldown + 100);
      expect(result3.success).toBe(true);
    });

    it('should allow different cues without cooldown interference', () => {
      const result1 = manager.placeCue('reveal_riser', 0);
      expect(result1.success).toBe(true);

      const result2 = manager.placeCue('impact_soft', 1000);
      expect(result2.success).toBe(true);

      const result3 = manager.placeCue('text_ping', 2500);
      expect(result3.success).toBe(true);
    });

    it('should track cooldown per cue type', () => {
      manager.placeCue('reveal_riser', 0);
      manager.placeCue('impact_soft', 100);

      // reveal_riser cooldown still active
      const check1 = manager.canPlaceCue('reveal_riser', 500);
      expect(check1.allowed).toBe(false);

      // impact_soft cooldown expired (shorter cooldown)
      const check2 = manager.canPlaceCue('impact_soft', 800);
      expect(check2.allowed).toBe(true);
    });

    it('should allow force placement to override cooldown', () => {
      manager.placeCue('reveal_riser', 0);

      // Force placement should succeed despite cooldown
      const result = manager.placeCue('reveal_riser', 100, { forcePlace: true });
      expect(result.success).toBe(true);
    });
  });

  describe('VID-MAC-004: Priority System', () => {
    let manager: MacroCuesManager;

    beforeEach(() => {
      manager = new MacroCuesManager();
    });

    it('should respect priority in conflict resolution', () => {
      // Place high-priority cue
      const highPriority = manager.placeCue('transition_sweep', 1000);
      expect(highPriority.success).toBe(true);

      // Try to place low-priority cue at conflicting time
      const lowPriority = manager.placeCue('text_ping', 1200);
      expect(lowPriority.success).toBe(false);
      expect(lowPriority.reason).toContain('priority');
    });

    it('should allow lower priority cues when not conflicting', () => {
      manager.placeCue('transition_sweep', 1000);

      // Place after the high-priority cue ends
      const result = manager.placeCue('text_ping', 2000);
      expect(result.success).toBe(true);
    });

    it('should track priority in usage statistics', () => {
      manager.placeCue('transition_sweep', 0);
      manager.placeCue('reveal_riser', 2000);
      manager.placeCue('text_ping', 4000);

      const stats = manager.getStats();
      expect(stats.totalUsages).toBe(3);
    });

    it('should order cues by priority in config', () => {
      const cues = getAvailableCues();
      const priorities = cues.map((cue) => getCueConfig(cue).priority);

      // Check that priorities are reasonable (1-10 range)
      for (const priority of priorities) {
        expect(priority).toBeGreaterThanOrEqual(1);
        expect(priority).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Integration: Complete Macro Cues Workflow', () => {
    let manager: MacroCuesManager;

    beforeEach(() => {
      manager = new MacroCuesManager();
    });

    it('should handle batch placement with policy enforcement', () => {
      const placements = [
        { cue: 'reveal_riser' as MacroCue, timestamp: 0 },
        { cue: 'whoosh_fast' as MacroCue, timestamp: 1500 },
        { cue: 'impact_soft' as MacroCue, timestamp: 3000 },
        { cue: 'text_ping' as MacroCue, timestamp: 4500 },
      ];

      const result = manager.placeCues(placements);

      expect(result.placed.length).toBeGreaterThan(0);
      expect(result.placed.length + result.rejected.length).toBe(placements.length);
    });

    it('should generate usage statistics', () => {
      manager.placeCue('reveal_riser', 0);
      manager.placeCue('reveal_riser', 2000);
      manager.placeCue('impact_soft', 4000);

      const stats = manager.getStats();

      expect(stats.totalUsages).toBe(3);
      expect(stats.cueBreakdown['reveal_riser']).toBe(2);
      expect(stats.cueBreakdown['impact_soft']).toBe(1);
      expect(stats.averageInterval).toBeGreaterThan(0);
    });

    it('should clear history when needed', () => {
      manager.placeCue('reveal_riser', 0);
      manager.placeCue('impact_soft', 1000);

      manager.clearHistory();

      const stats = manager.getStats();
      expect(stats.totalUsages).toBe(0);
    });
  });
});
