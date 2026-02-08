/**
 * Motion Canvas Integration
 *
 * This module provides a Playwright-based headless renderer for Motion Canvas scenes
 * with a two-pass pipeline (seed → capture → render) and engine-agnostic timeline.
 *
 * Features:
 * - Playwright headless rendering
 * - Two-pass pipeline for efficient rendering
 * - Shared audio events schema for synchronization
 * - Engine-agnostic timeline management
 * - Visual reveal capture system
 */

// Types
export * from './types';

// Audio schema and utilities
export * from './audio-schema';

// Timeline management
export * from './timeline';

// Playwright renderer
export * from './playwright-renderer';

// Two-pass pipeline
export * from './pipeline';
