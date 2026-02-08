/**
 * Motion Canvas Integration - Two-Pass Rendering Pipeline
 * Implements: seed → capture → render pipeline
 */

import {
  RenderConfig,
  RenderResult,
  SeedResult,
  CaptureResult,
  MotionCanvasScene,
  AudioEvent,
  VisualReveal,
} from './types';
import { PlaywrightRenderer } from './playwright-renderer';
import { Timeline, createTimelineFromEvents } from './timeline';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Two-pass rendering pipeline
 */
export class TwoPassPipeline {
  private renderer: PlaywrightRenderer;
  private config: RenderConfig;

  constructor(config: RenderConfig) {
    this.config = config;
    this.renderer = new PlaywrightRenderer();
  }

  /**
   * Pass 1: Seed Pass
   * Analyze the scene, collect events, build timeline
   */
  async seedPass(scene: MotionCanvasScene): Promise<SeedResult> {
    await this.renderer.initialize();

    try {
      // Render scene to collect events
      const result = await this.renderer.renderScene(scene, this.config);

      if (!result.success || !result.metadata?.seedResult) {
        throw new Error('Seed pass failed: ' + result.error);
      }

      return result.metadata.seedResult;
    } finally {
      await this.renderer.cleanup();
    }
  }

  /**
   * Pass 2: Capture Pass
   * Use seeded timeline to capture frames and audio
   */
  async capturePass(
    scene: MotionCanvasScene,
    seedResult: SeedResult
  ): Promise<CaptureResult> {
    await this.renderer.initialize();

    try {
      const totalFrames = Math.ceil(
        seedResult.metadata.totalDuration * seedResult.metadata.fps
      );
      const frames: string[] = [];
      const outputDir = path.dirname(this.config.outputPath || './output');

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Capture each frame
      for (let frameNumber = 0; frameNumber < totalFrames; frameNumber++) {
        const time = frameNumber / seedResult.metadata.fps;
        const framePath = path.join(outputDir, `frame-${frameNumber.toString().padStart(6, '0')}.png`);

        // TODO: Actually render the frame at this time
        // For now, just record the frame path
        frames.push(framePath);
      }

      return {
        frames,
        duration: seedResult.metadata.totalDuration,
        fps: seedResult.metadata.fps,
      };
    } finally {
      await this.renderer.cleanup();
    }
  }

  /**
   * Pass 3: Render Pass (Optional)
   * Combine frames and audio into final video
   */
  async renderPass(
    seedResult: SeedResult,
    captureResult: CaptureResult
  ): Promise<RenderResult> {
    try {
      // TODO: Use FFmpeg or similar to combine frames and audio
      // For now, return a success result with metadata

      return {
        success: true,
        videoPath: this.config.outputPath,
        duration: captureResult.duration,
        size: 0, // Would be actual file size
        metadata: {
          seedResult,
          captureResult,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run the complete pipeline
   */
  async run(scene: MotionCanvasScene): Promise<RenderResult> {
    try {
      console.log('Starting two-pass pipeline...');

      // Pass 1: Seed
      console.log('Pass 1: Seeding timeline...');
      const seedResult = await this.seedPass(scene);
      console.log(`Seed complete: ${seedResult.timeline.length} events, ${seedResult.audioEvents.length} audio, ${seedResult.visualReveals.length} reveals`);

      // Pass 2: Capture
      console.log('Pass 2: Capturing frames...');
      const captureResult = await this.capturePass(scene, seedResult);
      console.log(`Capture complete: ${captureResult.frames.length} frames`);

      // Pass 3: Render
      console.log('Pass 3: Rendering final video...');
      const renderResult = await this.renderPass(seedResult, captureResult);
      console.log('Pipeline complete!');

      return renderResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Helper function to run the two-pass pipeline
 */
export async function runTwoPassPipeline(
  scene: MotionCanvasScene,
  config: RenderConfig
): Promise<RenderResult> {
  const pipeline = new TwoPassPipeline(config);
  return await pipeline.run(scene);
}

/**
 * Seed a scene and return the timeline
 */
export async function seedScene(
  scene: MotionCanvasScene,
  config: RenderConfig
): Promise<{
  timeline: Timeline;
  audioEvents: AudioEvent[];
  visualReveals: VisualReveal[];
}> {
  const pipeline = new TwoPassPipeline(config);
  const seedResult = await pipeline.seedPass(scene);

  const timeline = createTimelineFromEvents(
    seedResult.audioEvents,
    seedResult.visualReveals,
    {
      duration: seedResult.metadata.totalDuration,
      fps: seedResult.metadata.fps,
    }
  );

  return {
    timeline,
    audioEvents: seedResult.audioEvents,
    visualReveals: seedResult.visualReveals,
  };
}
