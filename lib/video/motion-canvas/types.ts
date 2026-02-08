/**
 * Motion Canvas Integration - Type Definitions
 * Defines interfaces for the Motion Canvas rendering system
 */

/**
 * Audio event that can be synced with visual elements
 */
export interface AudioEvent {
  id: string;
  timestamp: number; // milliseconds from start
  type: 'reveal' | 'transition' | 'emphasis' | 'background';
  soundFile?: string;
  volume?: number;
  metadata?: Record<string, any>;
}

/**
 * Visual reveal event captured during rendering
 */
export interface VisualReveal {
  id: string;
  timestamp: number; // milliseconds from start
  element: string;
  kind: 'fade-in' | 'slide-in' | 'scale-up' | 'custom';
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * Timeline event (engine-agnostic)
 */
export interface TimelineEvent {
  id: string;
  timestamp: number;
  duration: number;
  type: 'audio' | 'visual' | 'transition';
  data: AudioEvent | VisualReveal | any;
}

/**
 * Rendering pipeline configuration
 */
export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  duration: number; // total duration in seconds
  audioEvents?: AudioEvent[];
  outputPath?: string;
  format?: 'mp4' | 'webm';
}

/**
 * Result from the seed pass
 */
export interface SeedResult {
  timeline: TimelineEvent[];
  audioEvents: AudioEvent[];
  visualReveals: VisualReveal[];
  metadata: {
    totalDuration: number;
    fps: number;
    resolution: { width: number; height: number };
  };
}

/**
 * Result from the capture pass
 */
export interface CaptureResult {
  frames: string[]; // paths to captured frame images
  audioTrack?: string; // path to audio file
  duration: number;
  fps: number;
}

/**
 * Final render result
 */
export interface RenderResult {
  success: boolean;
  videoPath?: string;
  duration?: number;
  size?: number; // file size in bytes
  error?: string;
  metadata?: {
    seedResult: SeedResult;
    captureResult: CaptureResult;
  };
}

/**
 * Motion Canvas scene definition
 */
export interface MotionCanvasScene {
  id: string;
  name: string;
  duration: number;
  audioEvents: AudioEvent[];
  onRender: (context: RenderContext) => Promise<void>;
}

/**
 * Render context provided to scenes
 */
export interface RenderContext {
  frame: number;
  time: number; // current time in seconds
  fps: number;
  timeline: TimelineEvent[];
  triggerAudioEvent: (event: AudioEvent) => void;
  recordVisualReveal: (reveal: VisualReveal) => void;
}
