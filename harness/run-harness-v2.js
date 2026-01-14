#!/usr/bin/env node

/**
 * Agent Harness Runner v2
 * =======================
 * 
 * Enhanced harness with:
 * - Intelligent error classification (auth vs rate limit vs transient)
 * - Exponential backoff with jitter
 * - Rate limit awareness
 * - Proper handling of authentication errors (stops retrying)
 * - Session metrics and reporting
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============================================
// Configuration
// ============================================

const CONFIG = {
  progressFile: path.join(PROJECT_ROOT, 'claude-progress.txt'),
  featureList: path.join(PROJECT_ROOT, 'feature_list.json'),
  initScript: path.join(PROJECT_ROOT, 'init.sh'),
  initializerPrompt: path.join(__dirname, 'prompts/initializer.md'),
  codingPrompt: path.join(__dirname, 'prompts/coding.md'),
  statusFile: path.join(PROJECT_ROOT, 'harness-status.json'),
  metricsFile: path.join(PROJECT_ROOT, 'harness-metrics.json'),
  
  // Session settings
  maxSessions: 100,
  
  // Rate limiting & backoff
  initialBackoffMs: 5000,        // Start with 5 second delay
  maxBackoffMs: 300000,          // Max 5 minute delay
  backoffMultiplier: 2,          // Double each failure
  jitterFactor: 0.2,             // 20% random jitter
  minSessionGapMs: 10000,        // Minimum 10s between sessions
  
  // Error handling
  maxConsecutiveErrors: 5,       // Stop after 5 consecutive errors
  authErrorPauseMinutes: 60,     // Pause 1 hour on auth errors
  rateLimitPauseMinutes: 5,      // Pause 5 minutes on rate limits
};

// ============================================
// Error Classification
// ============================================

const ErrorTypes = {
  AUTH_ERROR: 'auth_error',
  RATE_LIMIT: 'rate_limit',
  SERVER_ERROR: 'server_error',
  TRANSIENT: 'transient',
  CONFIG_ERROR: 'config_error',
  UNKNOWN: 'unknown',
};

function classifyError(output, exitCode) {
  const lowerOutput = output.toLowerCase();
  
  // Authentication errors - DO NOT RETRY
  if (
    lowerOutput.includes('invalid api key') ||
    lowerOutput.includes('authentication_failed') ||
    lowerOutput.includes('unauthorized') ||
    lowerOutput.includes('"error":"authentication_failed"')
  ) {
    return ErrorTypes.AUTH_ERROR;
  }
  
  // Rate limiting - back off and retry
  if (
    lowerOutput.includes('rate limit') ||
    lowerOutput.includes('429') ||
    lowerOutput.includes('too many requests') ||
    lowerOutput.includes('overloaded')
  ) {
    return ErrorTypes.RATE_LIMIT;
  }
  
  // Server errors - retry with backoff
  if (
    lowerOutput.includes('500') ||
    lowerOutput.includes('502') ||
    lowerOutput.includes('503') ||
    lowerOutput.includes('504') ||
    lowerOutput.includes('internal server error')
  ) {
    return ErrorTypes.SERVER_ERROR;
  }
  
  // Config errors - don't retry
  if (
    lowerOutput.includes('file not found') ||
    lowerOutput.includes('enoent') ||
    lowerOutput.includes('prompt file not found')
  ) {
    return ErrorTypes.CONFIG_ERROR;
  }
  
  // Network/transient - retry quickly
  if (
    lowerOutput.includes('econnrefused') ||
    lowerOutput.includes('econnreset') ||
    lowerOutput.includes('timeout') ||
    lowerOutput.includes('network')
  ) {
    return ErrorTypes.TRANSIENT;
  }
  
  return ErrorTypes.UNKNOWN;
}

// ============================================
// Backoff Calculation
// ============================================

function calculateBackoff(attempts, errorType) {
  // Auth and config errors should not retry
  if (errorType === ErrorTypes.AUTH_ERROR) {
    return CONFIG.authErrorPauseMinutes * 60 * 1000;
  }
  
  if (errorType === ErrorTypes.CONFIG_ERROR) {
    return Infinity; // Don't retry
  }
  
  // Rate limits get longer pause
  if (errorType === ErrorTypes.RATE_LIMIT) {
    const base = CONFIG.rateLimitPauseMinutes * 60 * 1000;
    return base * Math.pow(1.5, attempts - 1);
  }
  
  // Exponential backoff for other errors
  const baseBackoff = CONFIG.initialBackoffMs * 
    Math.pow(CONFIG.backoffMultiplier, attempts - 1);
  
  const backoff = Math.min(baseBackoff, CONFIG.maxBackoffMs);
  
  // Add jitter to prevent thundering herd
  const jitter = backoff * CONFIG.jitterFactor * Math.random();
  
  return Math.floor(backoff + jitter);
}

// ============================================
// Logging & Status
// ============================================

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    start: '🚀',
    end: '🏁',
    pause: '⏸️',
    rate: '🚦',
    auth: '🔐',
  }[level] || '•';
  
  console.log(`${timestamp} ${prefix} ${message}`);
}

function isFirstRun() {
  const hasProgress = fs.existsSync(CONFIG.progressFile);
  const hasFeatures = fs.existsSync(CONFIG.featureList);
  
  if (!hasProgress || !hasFeatures) {
    log('First run detected - no progress or feature files found');
    return true;
  }
  
  try {
    const features = JSON.parse(fs.readFileSync(CONFIG.featureList, 'utf-8'));
    if (!features.features || features.features.length === 0) {
      log('Feature list is empty - treating as first run');
      return true;
    }
  } catch (e) {
    log('Could not parse feature list - treating as first run', 'warning');
    return true;
  }
  
  return false;
}

function getProgressStats() {
  if (!fs.existsSync(CONFIG.featureList)) {
    return { total: 0, passing: 0, pending: 0, percentComplete: 0 };
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.featureList, 'utf-8'));
    const features = data.features || [];
    const total = features.length;
    const passing = features.filter(f => f.passes).length;
    
    return {
      total,
      passing,
      pending: total - passing,
      percentComplete: total > 0 ? ((passing / total) * 100).toFixed(1) : 0
    };
  } catch (e) {
    return { total: 0, passing: 0, pending: 0, percentComplete: 0 };
  }
}

function updateStatus(sessionType, status, stats = null, extra = {}) {
  const statusData = {
    lastUpdated: new Date().toISOString(),
    sessionType,
    status,
    stats: stats || getProgressStats(),
    pid: process.pid,
    ...extra,
  };
  
  fs.writeFileSync(CONFIG.statusFile, JSON.stringify(statusData, null, 2));
}

function loadMetrics() {
  if (!fs.existsSync(CONFIG.metricsFile)) {
    return {
      totalSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      totalTokens: 0,
      rateLimitHits: 0,
      authErrors: 0,
      consecutiveErrors: 0,
      lastSessionTime: null,
    };
  }
  
  try {
    return JSON.parse(fs.readFileSync(CONFIG.metricsFile, 'utf-8'));
  } catch (e) {
    return loadMetrics(); // Return defaults
  }
}

function saveMetrics(metrics) {
  fs.writeFileSync(CONFIG.metricsFile, JSON.stringify(metrics, null, 2));
}

// ============================================
// Session Execution
// ============================================

function getPrompt() {
  const promptFile = isFirstRun() ? CONFIG.initializerPrompt : CONFIG.codingPrompt;
  
  if (!fs.existsSync(promptFile)) {
    throw new Error(`Prompt file not found: ${promptFile}`);
  }
  
  return fs.readFileSync(promptFile, 'utf-8');
}

function parseSessionOutput(output) {
  // Extract token usage from JSON output
  const metrics = {
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
  };
  
  try {
    // Look for result JSON lines
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('"type":"result"')) {
        const data = JSON.parse(line);
        if (data.usage) {
          metrics.inputTokens = (data.usage.input_tokens || 0) + 
            (data.usage.cache_creation_input_tokens || 0);
          metrics.outputTokens = data.usage.output_tokens || 0;
        }
        if (data.total_cost_usd) {
          metrics.cost = data.total_cost_usd;
        }
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return metrics;
}

function runSession(sessionNumber) {
  return new Promise((resolve, reject) => {
    const sessionType = isFirstRun() ? 'INITIALIZER' : 'CODING';
    const stats = getProgressStats();
    
    log(`Starting session #${sessionNumber} (${sessionType})`, 'start');
    log(`Progress: ${stats.passing}/${stats.total} features (${stats.percentComplete}%)`);
    
    updateStatus(sessionType, 'running', stats);
    
    let prompt;
    try {
      prompt = getPrompt();
    } catch (e) {
      reject(e);
      return;
    }
    
    const args = [
      '-p', prompt,
      '--allowedTools', 'Edit', 'Bash', 'Read', 'Write', 'mcp__puppeteer',
      '--output-format', 'stream-json',
      '--verbose'
    ];
    
    const startTime = Date.now();
    let output = '';
    
    const claude = spawn('claude', args, {
      cwd: PROJECT_ROOT,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    claude.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    claude.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(data);
    });
    
    claude.on('error', (error) => {
      log(`Failed to start Claude: ${error.message}`, 'error');
      updateStatus(sessionType, 'error', stats);
      reject(error);
    });
    
    claude.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const newStats = getProgressStats();
      const sessionMetrics = parseSessionOutput(output);
      
      if (code === 0) {
        log(`Session #${sessionNumber} completed in ${duration} minutes`, 'success');
        log(`Progress: ${newStats.passing}/${newStats.total} features (${newStats.percentComplete}%)`);
        updateStatus(sessionType, 'completed', newStats);
        resolve({ 
          code, 
          output, 
          stats: newStats, 
          duration,
          metrics: sessionMetrics,
          success: true,
        });
      } else {
        const errorType = classifyError(output, code);
        log(`Session #${sessionNumber} exited with code ${code} (${errorType})`, 'error');
        updateStatus(sessionType, 'failed', newStats, { errorType });
        resolve({ 
          code, 
          output, 
          stats: newStats, 
          duration,
          metrics: sessionMetrics,
          success: false,
          errorType,
        });
      }
    });
  });
}

function isProjectComplete() {
  const stats = getProgressStats();
  return stats.total > 0 && stats.passing === stats.total;
}

// ============================================
// Main Harness Loop
// ============================================

async function runHarness(options = {}) {
  const { maxSessions = CONFIG.maxSessions, continuous = false } = options;
  
  log('Agent Harness v2 Starting', 'start');
  log(`Project root: ${PROJECT_ROOT}`);
  log(`Max sessions: ${maxSessions}`);
  log(`Mode: ${continuous ? 'Continuous' : 'Single session'}`);
  log(`Backoff: ${CONFIG.initialBackoffMs}ms - ${CONFIG.maxBackoffMs}ms`);
  
  let metrics = loadMetrics();
  let sessionNumber = 1;
  let consecutiveErrors = 0;
  
  while (sessionNumber <= maxSessions) {
    // Check if already complete
    if (isProjectComplete()) {
      log('All features implemented! Project complete.', 'success');
      break;
    }
    
    try {
      const result = await runSession(sessionNumber);
      
      // Update metrics
      metrics.totalSessions++;
      metrics.lastSessionTime = new Date().toISOString();
      
      if (result.success) {
        metrics.successfulSessions++;
        consecutiveErrors = 0;
        metrics.consecutiveErrors = 0;
        
        if (result.metrics) {
          metrics.totalTokens += (result.metrics.inputTokens + result.metrics.outputTokens);
        }
      } else {
        metrics.failedSessions++;
        consecutiveErrors++;
        metrics.consecutiveErrors = consecutiveErrors;
        
        // Handle different error types
        switch (result.errorType) {
          case ErrorTypes.AUTH_ERROR:
            metrics.authErrors++;
            log('Authentication failed - stopping harness. Please check your API key.', 'auth');
            log('Set ANTHROPIC_API_KEY environment variable with a valid key.', 'info');
            updateStatus('error', 'auth_failed', null, { 
              message: 'Invalid API key - harness stopped',
              errorType: result.errorType,
            });
            saveMetrics(metrics);
            process.exit(1);
            break;
            
          case ErrorTypes.CONFIG_ERROR:
            log('Configuration error - stopping harness.', 'error');
            updateStatus('error', 'config_failed', null, { 
              message: 'Configuration error',
              errorType: result.errorType,
            });
            saveMetrics(metrics);
            process.exit(1);
            break;
            
          case ErrorTypes.RATE_LIMIT:
            metrics.rateLimitHits++;
            log('Rate limit hit - will back off', 'rate');
            break;
            
          default:
            // Continue with backoff
            break;
        }
        
        // Check consecutive error limit
        if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
          log(`Max consecutive errors (${CONFIG.maxConsecutiveErrors}) reached - stopping`, 'error');
          updateStatus('error', 'max_errors', null, { 
            message: `Stopped after ${consecutiveErrors} consecutive errors`,
            lastError: result.errorType,
          });
          saveMetrics(metrics);
          process.exit(1);
        }
      }
      
      saveMetrics(metrics);
      
      // If not continuous mode, exit after one session
      if (!continuous) {
        log('Single session mode - exiting', 'end');
        break;
      }
      
      // Check completion after session
      if (isProjectComplete()) {
        log('All features implemented! Project complete.', 'success');
        break;
      }
      
      // Calculate delay before next session
      let delay;
      if (result.success) {
        delay = CONFIG.minSessionGapMs;
      } else {
        delay = calculateBackoff(consecutiveErrors, result.errorType);
        
        if (delay === Infinity) {
          log('Unrecoverable error - stopping harness', 'error');
          break;
        }
      }
      
      const delaySeconds = (delay / 1000).toFixed(1);
      log(`Waiting ${delaySeconds}s before next session...`, 'pause');
      await new Promise(r => setTimeout(r, delay));
      
      sessionNumber++;
      
    } catch (error) {
      log(`Session failed: ${error.message}`, 'error');
      consecutiveErrors++;
      
      if (!continuous) {
        process.exit(1);
      }
      
      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
        log(`Max consecutive errors reached - stopping`, 'error');
        break;
      }
      
      const delay = calculateBackoff(consecutiveErrors, ErrorTypes.UNKNOWN);
      log(`Waiting ${(delay / 1000).toFixed(1)}s before retry...`, 'pause');
      await new Promise(r => setTimeout(r, delay));
      sessionNumber++;
    }
  }
  
  const finalStats = getProgressStats();
  log(`Harness finished. Final progress: ${finalStats.passing}/${finalStats.total} (${finalStats.percentComplete}%)`, 'end');
  log(`Sessions: ${metrics.successfulSessions}/${metrics.totalSessions} successful`, 'info');
  
  saveMetrics(metrics);
}

// ============================================
// CLI
// ============================================

const args = process.argv.slice(2);
const options = {
  continuous: args.includes('--continuous') || args.includes('-c'),
  maxSessions: parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1]) || CONFIG.maxSessions
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Agent Harness Runner v2
=======================

Enhanced harness with intelligent error handling and rate limiting.

Usage: node run-harness-v2.js [options]

Options:
  --continuous, -c    Run continuously until all features are complete
  --max=N             Maximum number of sessions to run (default: 100)
  --help, -h          Show this help message

Features:
  • Exponential backoff with jitter for failures
  • Auth error detection (stops immediately, doesn't waste retries)
  • Rate limit handling with extended pauses
  • Session metrics tracking
  • Consecutive error limit protection

Examples:
  node run-harness-v2.js                  # Run single session
  node run-harness-v2.js -c               # Run continuously
  node run-harness-v2.js -c --max=50      # Run up to 50 sessions
`);
  process.exit(0);
}

// Check for Claude CLI
try {
  execSync('which claude', { stdio: 'ignore' });
} catch (e) {
  log('Claude CLI not found. Please install Claude Code first.', 'error');
  log('Visit: https://docs.anthropic.com/en/docs/agents-and-tools/claude-code', 'info');
  process.exit(1);
}

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  log('Warning: ANTHROPIC_API_KEY not set. Claude may fail to authenticate.', 'warning');
  log('Set with: export ANTHROPIC_API_KEY=your-key-here', 'info');
}

runHarness(options).catch(e => {
  log(`Fatal error: ${e.message}`, 'error');
  process.exit(1);
});
