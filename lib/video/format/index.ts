/**
 * Video Format System
 *
 * Provides tools for visual reveal tracking, pacing, and synchronization:
 * - RevealRecorder: Captures visual element appearances with timestamps
 * - PacingSeeder: Generates reveal timing based on WPM reading model
 * - SFX Synchronization: Aligns sound effects with visual reveals
 * - Hybrid Format DSL: Domain-specific language for content blocks
 * - Beat Mapping: Maps format blocks to visual and audio beats
 */

export * from './reveal-recorder';
export * from './pacing-seeder';
export * from './hybrid-types';
export * from './dsl-parser';
export * from './beat-mapping';
