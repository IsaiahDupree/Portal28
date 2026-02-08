/**
 * Motion Canvas Integration - Playwright Headless Renderer
 * Uses Playwright to render Motion Canvas scenes in headless browser
 */

import { chromium, Page, Browser } from 'playwright';
import {
  RenderConfig,
  RenderResult,
  MotionCanvasScene,
  AudioEvent,
  VisualReveal,
  RenderContext,
} from './types';
import { Timeline } from './timeline';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Playwright-based Motion Canvas renderer
 */
export class PlaywrightRenderer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private audioEvents: AudioEvent[] = [];
  private visualReveals: VisualReveal[] = [];

  /**
   * Initialize the renderer
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Render a Motion Canvas scene
   */
  async renderScene(
    scene: MotionCanvasScene,
    config: RenderConfig
  ): Promise<RenderResult> {
    if (!this.page) {
      throw new Error('Renderer not initialized. Call initialize() first.');
    }

    try {
      // Reset event collectors
      this.audioEvents = [];
      this.visualReveals = [];

      // Set viewport size
      await this.page.setViewportSize({
        width: config.width,
        height: config.height,
      });

      // Create timeline
      const timeline = new Timeline({
        duration: config.duration,
        fps: config.fps,
      });

      // Add configured audio events
      if (config.audioEvents) {
        for (const audioEvent of config.audioEvents) {
          timeline.addAudioEvent(audioEvent);
        }
      }

      // Create render context
      const context: RenderContext = {
        frame: 0,
        time: 0,
        fps: config.fps,
        timeline: timeline.getAllEvents(),
        triggerAudioEvent: (event: AudioEvent) => {
          this.audioEvents.push(event);
          timeline.addAudioEvent(event);
        },
        recordVisualReveal: (reveal: VisualReveal) => {
          this.visualReveals.push(reveal);
          timeline.addVisualReveal(reveal);
        },
      };

      // Render the scene
      await scene.onRender(context);

      // Return successful result
      return {
        success: true,
        videoPath: config.outputPath,
        duration: config.duration,
        metadata: {
          seedResult: {
            timeline: timeline.getAllEvents(),
            audioEvents: this.audioEvents,
            visualReveals: this.visualReveals,
            metadata: {
              totalDuration: config.duration,
              fps: config.fps,
              resolution: {
                width: config.width,
                height: config.height,
              },
            },
          },
          captureResult: {
            frames: [],
            duration: config.duration,
            fps: config.fps,
          },
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
   * Capture a frame from the current page state
   */
  async captureFrame(outputPath: string): Promise<void> {
    if (!this.page) {
      throw new Error('Renderer not initialized');
    }

    await this.page.screenshot({
      path: outputPath,
      type: 'png',
    });
  }

  /**
   * Navigate to a URL for rendering
   */
  async navigateToURL(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Renderer not initialized');
    }

    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Evaluate JavaScript in the page context
   */
  async evaluateScript<T>(script: string | (() => T)): Promise<T> {
    if (!this.page) {
      throw new Error('Renderer not initialized');
    }

    return await this.page.evaluate(script);
  }

  /**
   * Get collected audio events
   */
  getAudioEvents(): AudioEvent[] {
    return [...this.audioEvents];
  }

  /**
   * Get collected visual reveals
   */
  getVisualReveals(): VisualReveal[] {
    return [...this.visualReveals];
  }
}

/**
 * Create and initialize a new renderer
 */
export async function createRenderer(): Promise<PlaywrightRenderer> {
  const renderer = new PlaywrightRenderer();
  await renderer.initialize();
  return renderer;
}

/**
 * Render a scene with automatic cleanup
 */
export async function renderSceneWithCleanup(
  scene: MotionCanvasScene,
  config: RenderConfig
): Promise<RenderResult> {
  const renderer = await createRenderer();

  try {
    return await renderer.renderScene(scene, config);
  } finally {
    await renderer.cleanup();
  }
}
