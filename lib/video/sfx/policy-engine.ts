/**
 * SFX Policy Engine
 * Enforces intelligent placement rules to prevent audio spam
 */

import { MacroCue, MACRO_CUES } from './macro-cues';

/**
 * Policy rule definition
 */
export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  check: (context: PlacementContext) => { allowed: boolean; reason?: string };
  priority: number; // Higher priority rules checked first
}

/**
 * Placement context for policy evaluation
 */
export interface PlacementContext {
  cue: MacroCue;
  timestamp: number;
  recentCues: Array<{ cue: MacroCue; timestamp: number }>;
  totalDuration: number;
}

/**
 * Built-in policy rules
 */
export const POLICY_RULES: Record<string, PolicyRule> = {
  // Prevent too many cues in short time window
  maxCuesPerWindow: {
    id: 'max-cues-per-window',
    name: 'Maximum Cues Per Window',
    description: 'Limits number of cues within a time window',
    priority: 10,
    check: (context) => {
      const windowSize = 2000; // 2 seconds
      const maxCues = 3;

      const windowStart = Math.max(0, context.timestamp - windowSize);
      const cuesInWindow = context.recentCues.filter(
        (c) => c.timestamp >= windowStart && c.timestamp < context.timestamp
      );

      if (cuesInWindow.length >= maxCues) {
        return {
          allowed: false,
          reason: `Too many cues in ${windowSize}ms window (max: ${maxCues})`,
        };
      }

      return { allowed: true };
    },
  },

  // Prevent same cue from repeating too quickly
  minIntervalSameCue: {
    id: 'min-interval-same-cue',
    name: 'Minimum Interval Same Cue',
    description: 'Enforces minimum time between same cue',
    priority: 9,
    check: (context) => {
      const config = MACRO_CUES[context.cue];
      const lastSameCue = context.recentCues
        .filter((c) => c.cue === context.cue)
        .pop();

      if (lastSameCue) {
        const interval = context.timestamp - lastSameCue.timestamp;
        if (interval < config.cooldown) {
          return {
            allowed: false,
            reason: `Same cue used ${interval}ms ago (cooldown: ${config.cooldown}ms)`,
          };
        }
      }

      return { allowed: true };
    },
  },

  // Prevent audio density from becoming overwhelming
  maxAudioDensity: {
    id: 'max-audio-density',
    name: 'Maximum Audio Density',
    description: 'Prevents too many audio events relative to total duration',
    priority: 8,
    check: (context) => {
      const maxDensity = 0.1; // 10% of total time can have audio cues
      const totalCueDuration = context.recentCues.reduce((sum, c) => {
        return sum + MACRO_CUES[c.cue].duration;
      }, 0);

      const density = totalCueDuration / context.totalDuration;

      if (density > maxDensity) {
        return {
          allowed: false,
          reason: `Audio density too high (${(density * 100).toFixed(1)}%, max: ${maxDensity * 100}%)`,
        };
      }

      return { allowed: true };
    },
  },

  // Prevent low-priority cues from interfering with high-priority ones
  priorityRespect: {
    id: 'priority-respect',
    name: 'Priority Respect',
    description: 'Low-priority cues must not interfere with high-priority ones',
    priority: 7,
    check: (context) => {
      const config = MACRO_CUES[context.cue];
      const conflictWindow = 500; // 500ms before and after

      const conflictingCues = context.recentCues.filter((c) => {
        const timeDiff = Math.abs(c.timestamp - context.timestamp);
        return timeDiff < conflictWindow;
      });

      const higherPriorityCue = conflictingCues.find(
        (c) => MACRO_CUES[c.cue].priority > config.priority
      );

      if (higherPriorityCue) {
        return {
          allowed: false,
          reason: `Would interfere with higher priority cue: ${higherPriorityCue.cue}`,
        };
      }

      return { allowed: true };
    },
  },

  // Ensure cues don't start too close to end of video
  minTimeFromEnd: {
    id: 'min-time-from-end',
    name: 'Minimum Time From End',
    description: 'Cues must finish before video ends',
    priority: 6,
    check: (context) => {
      const config = MACRO_CUES[context.cue];
      const cueEndTime = context.timestamp + config.duration;
      const buffer = 100; // 100ms buffer

      if (cueEndTime + buffer > context.totalDuration) {
        return {
          allowed: false,
          reason: 'Cue would extend past video end',
        };
      }

      return { allowed: true };
    },
  },
};

/**
 * Policy engine for enforcing placement rules
 */
export class PolicyEngine {
  private rules: PolicyRule[] = [];
  private enabled = true;

  constructor(rules?: PolicyRule[]) {
    this.rules = rules || Object.values(POLICY_RULES);
    // Sort rules by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Evaluate if placement is allowed
   */
  evaluate(context: PlacementContext): {
    allowed: boolean;
    violations: Array<{ rule: string; reason: string }>;
  } {
    if (!this.enabled) {
      return { allowed: true, violations: [] };
    }

    const violations: Array<{ rule: string; reason: string }> = [];

    for (const rule of this.rules) {
      const result = rule.check(context);
      if (!result.allowed) {
        violations.push({
          rule: rule.name,
          reason: result.reason || 'Rule violated',
        });
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
    };
  }

  /**
   * Add a custom rule
   */
  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a rule by ID
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  /**
   * Enable policy enforcement
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable policy enforcement (allow all placements)
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Get all active rules
   */
  getRules(): PolicyRule[] {
    return [...this.rules];
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): PolicyRule | undefined {
    return this.rules.find((r) => r.id === ruleId);
  }
}

/**
 * Create a policy engine with default rules
 */
export function createPolicyEngine(): PolicyEngine {
  return new PolicyEngine();
}

/**
 * Create a policy engine with custom rules
 */
export function createCustomPolicyEngine(rules: PolicyRule[]): PolicyEngine {
  return new PolicyEngine(rules);
}

/**
 * Helper to create a placement context
 */
export function createPlacementContext(
  cue: MacroCue,
  timestamp: number,
  recentCues: Array<{ cue: MacroCue; timestamp: number }>,
  totalDuration: number
): PlacementContext {
  return {
    cue,
    timestamp,
    recentCues,
    totalDuration,
  };
}
