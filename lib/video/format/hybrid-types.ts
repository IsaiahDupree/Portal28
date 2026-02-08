/**
 * Hybrid Format DSL - Type Definitions
 * Defines format block types for educational video content
 */

/**
 * Format block types
 */
export type FormatBlockType =
  | 'keyword'
  | 'bullet'
  | 'code'
  | 'error'
  | 'success'
  | 'cta'
  | 'heading'
  | 'text'
  | 'quote'
  | 'warning';

/**
 * Beat action types (visual/audio cues)
 */
export type BeatAction =
  | 'fade-in'
  | 'slide-in'
  | 'highlight'
  | 'pulse'
  | 'shake'
  | 'zoom'
  | 'none';

/**
 * Style configuration for format blocks
 */
export interface BlockStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'lighter';
  padding?: number;
  borderRadius?: number;
  shadow?: boolean;
  icon?: string;
  animation?: BeatAction;
  duration?: number; // animation duration in ms
}

/**
 * Format block definition
 */
export interface FormatBlock {
  id: string;
  type: FormatBlockType;
  content: string;
  style?: BlockStyle;
  beatAction?: BeatAction;
  timestamp?: number; // When this block should appear (ms)
  metadata?: Record<string, any>;
}

/**
 * DSL token for parsing
 */
export interface DSLToken {
  type: FormatBlockType | 'text';
  content: string;
  line: number;
  column: number;
}

/**
 * Parsed DSL result
 */
export interface ParsedDSL {
  blocks: FormatBlock[];
  errors: Array<{ line: number; message: string }>;
  warnings: Array<{ line: number; message: string }>;
}

/**
 * Default styles for each block type
 */
export const DEFAULT_STYLES: Record<FormatBlockType, BlockStyle> = {
  keyword: {
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    borderColor: '#2563eb',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 8,
    borderRadius: 4,
    shadow: true,
    animation: 'highlight',
    duration: 300,
  },
  bullet: {
    backgroundColor: 'transparent',
    textColor: '#1f2937',
    fontSize: 16,
    fontWeight: 'normal',
    padding: 4,
    icon: '•',
    animation: 'slide-in',
    duration: 400,
  },
  code: {
    backgroundColor: '#1e293b',
    textColor: '#e2e8f0',
    borderColor: '#334155',
    fontSize: 14,
    fontWeight: 'normal',
    padding: 12,
    borderRadius: 6,
    shadow: true,
    animation: 'fade-in',
    duration: 500,
  },
  error: {
    backgroundColor: '#fee2e2',
    textColor: '#dc2626',
    borderColor: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 12,
    borderRadius: 4,
    shadow: true,
    icon: '❌',
    animation: 'shake',
    duration: 400,
  },
  success: {
    backgroundColor: '#dcfce7',
    textColor: '#16a34a',
    borderColor: '#22c55e',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 12,
    borderRadius: 4,
    shadow: true,
    icon: '✓',
    animation: 'pulse',
    duration: 500,
  },
  cta: {
    backgroundColor: '#a855f7',
    textColor: '#ffffff',
    borderColor: '#9333ea',
    fontSize: 20,
    fontWeight: 'bold',
    padding: 16,
    borderRadius: 8,
    shadow: true,
    animation: 'zoom',
    duration: 600,
  },
  heading: {
    backgroundColor: 'transparent',
    textColor: '#111827',
    fontSize: 24,
    fontWeight: 'bold',
    padding: 8,
    animation: 'slide-in',
    duration: 400,
  },
  text: {
    backgroundColor: 'transparent',
    textColor: '#374151',
    fontSize: 16,
    fontWeight: 'normal',
    padding: 4,
    animation: 'fade-in',
    duration: 300,
  },
  quote: {
    backgroundColor: '#f3f4f6',
    textColor: '#4b5563',
    borderColor: '#9ca3af',
    fontSize: 18,
    fontWeight: 'normal',
    padding: 16,
    borderRadius: 4,
    icon: '"',
    animation: 'fade-in',
    duration: 400,
  },
  warning: {
    backgroundColor: '#fef3c7',
    textColor: '#d97706',
    borderColor: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 12,
    borderRadius: 4,
    shadow: true,
    icon: '⚠',
    animation: 'pulse',
    duration: 400,
  },
};

/**
 * Beat action to reveal kind mapping
 */
export const BEAT_ACTION_TO_REVEAL: Record<BeatAction, string> = {
  'fade-in': 'fade-in',
  'slide-in': 'slide-in',
  'highlight': 'scale-up',
  'pulse': 'bounce-in',
  'shake': 'custom',
  'zoom': 'zoom-in',
  'none': 'fade-in',
};
