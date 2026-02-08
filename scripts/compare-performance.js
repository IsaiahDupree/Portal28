#!/usr/bin/env node
/**
 * Performance Regression Detection Script
 *
 * Compares current performance metrics against baselines to detect regressions.
 * Usage: node scripts/compare-performance.js
 */

import fs from 'fs';
import path from 'path';

const BASELINES_FILE = path.join(process.cwd(), 'performance-baselines.json');
const THRESHOLDS = {
  // Maximum acceptable degradation percentage
  responseTime: 20, // 20% slower is a warning
  errorRate: 5,     // 5% increase in errors is critical
};

/**
 * Load baseline metrics from file
 */
function loadBaselines() {
  if (!fs.existsSync(BASELINES_FILE)) {
    console.log('⚠️  No baseline file found. Run tests first to establish baselines.');
    console.log(`   Expected file: ${BASELINES_FILE}`);
    return null;
  }

  try {
    const content = fs.readFileSync(BASELINES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error reading baselines file:', error.message);
    return null;
  }
}

/**
 * Save baseline metrics to file
 */
function saveBaselines(metrics) {
  try {
    fs.writeFileSync(
      BASELINES_FILE,
      JSON.stringify(metrics, null, 2),
      'utf-8'
    );
    console.log(`✅ Baselines saved to ${BASELINES_FILE}`);
  } catch (error) {
    console.error('❌ Error saving baselines:', error.message);
  }
}

/**
 * Compare current metrics against baseline
 */
function compareMetrics(baseline, current) {
  const regressions = [];
  const improvements = [];
  const stable = [];

  for (const [testName, baselineValue] of Object.entries(baseline)) {
    const currentValue = current[testName];

    if (!currentValue) {
      console.log(`⚠️  Test ${testName} not found in current results`);
      continue;
    }

    const change = ((currentValue - baselineValue) / baselineValue) * 100;

    const result = {
      test: testName,
      baseline: baselineValue,
      current: currentValue,
      change: change.toFixed(2) + '%',
    };

    if (Math.abs(change) < 5) {
      stable.push(result);
    } else if (change > THRESHOLDS.responseTime) {
      regressions.push({ ...result, severity: 'critical' });
    } else if (change > 10) {
      regressions.push({ ...result, severity: 'warning' });
    } else if (change < -10) {
      improvements.push(result);
    } else {
      stable.push(result);
    }
  }

  return { regressions, improvements, stable };
}

/**
 * Display comparison results
 */
function displayResults(comparison) {
  console.log('\n📊 Performance Comparison Results\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (comparison.regressions.length > 0) {
    console.log('🔴 REGRESSIONS DETECTED:\n');
    comparison.regressions.forEach(({ test, baseline, current, change, severity }) => {
      const icon = severity === 'critical' ? '🚨' : '⚠️';
      console.log(`${icon} ${test}`);
      console.log(`   Baseline: ${baseline}ms → Current: ${current}ms (${change})`);
    });
    console.log('');
  }

  if (comparison.improvements.length > 0) {
    console.log('🟢 IMPROVEMENTS:\n');
    comparison.improvements.forEach(({ test, baseline, current, change }) => {
      console.log(`✨ ${test}`);
      console.log(`   Baseline: ${baseline}ms → Current: ${current}ms (${change})`);
    });
    console.log('');
  }

  if (comparison.stable.length > 0) {
    console.log('🟡 STABLE (within 5%):\n');
    comparison.stable.forEach(({ test, baseline, current, change }) => {
      console.log(`✓ ${test}: ${baseline}ms → ${current}ms (${change})`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  // Exit with error code if critical regressions
  const criticalRegressions = comparison.regressions.filter(
    (r) => r.severity === 'critical'
  );

  if (criticalRegressions.length > 0) {
    console.log(`❌ ${criticalRegressions.length} critical regression(s) detected!`);
    console.log('   Performance has degraded beyond acceptable thresholds.');
    process.exit(1);
  } else if (comparison.regressions.length > 0) {
    console.log(`⚠️  ${comparison.regressions.length} warning(s) detected.`);
    console.log('   Consider investigating performance changes.');
    process.exit(0); // Don't fail build on warnings
  } else {
    console.log('✅ All performance metrics are within acceptable ranges!');
    process.exit(0);
  }
}

/**
 * Example usage: Initialize or compare baselines
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'init') {
    // Initialize with example baselines
    const exampleBaselines = {
      'Course Catalog Query': 80,
      'Search Query': 150,
      'Analytics Aggregation': 450,
      'MRR Calculation': 250,
      'Homepage Load': 800,
      'Course Listing Load': 1200,
      'Course Detail Load': 1800,
      'Search API': 400,
      'Checkout API': 2500,
      'Analytics API': 900,
    };

    saveBaselines(exampleBaselines);
    console.log('\n✅ Example baselines initialized.');
    console.log('   Update these values after running actual performance tests.');
    return;
  }

  if (command === 'compare') {
    // Load current metrics (would come from test results in real implementation)
    const currentMetrics = {
      'Course Catalog Query': 85,      // +6% (stable)
      'Search Query': 140,              // -7% (improvement)
      'Analytics Aggregation': 480,     // +7% (stable)
      'MRR Calculation': 310,           // +24% (regression!)
      'Homepage Load': 820,             // +2.5% (stable)
      'Course Listing Load': 1250,      // +4% (stable)
      'Course Detail Load': 1850,       // +3% (stable)
      'Search API': 390,                // -2.5% (stable)
      'Checkout API': 2600,             // +4% (stable)
      'Analytics API': 850,             // -6% (improvement)
    };

    const baselines = loadBaselines();
    if (!baselines) {
      console.log('\n💡 Tip: Run `node scripts/compare-performance.js init` to create example baselines.');
      return;
    }

    const comparison = compareMetrics(baselines, currentMetrics);
    displayResults(comparison);
    return;
  }

  // Default: show usage
  console.log('Performance Regression Detection Tool\n');
  console.log('Usage:');
  console.log('  node scripts/compare-performance.js init     - Initialize example baselines');
  console.log('  node scripts/compare-performance.js compare  - Compare current metrics to baselines');
  console.log('\nIn production, this script would:');
  console.log('  1. Parse test output from Playwright/k6');
  console.log('  2. Compare against stored baselines');
  console.log('  3. Flag regressions and improvements');
  console.log('  4. Exit with error code if critical regressions detected');
}

main();
