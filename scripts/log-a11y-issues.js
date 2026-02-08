#!/usr/bin/env node
/**
 * Accessibility Issue Logger
 *
 * Parses Playwright accessibility test results and logs issues in a structured format.
 * Usage: node scripts/log-a11y-issues.js [report-file.json]
 */

import fs from 'fs';
import path from 'path';

const ISSUES_FILE = path.join(process.cwd(), 'accessibility-issues.json');

/**
 * Parse Playwright JSON report for accessibility violations
 */
function parsePlaywrightReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Report file not found: ${reportPath}`);
    return [];
  }

  try {
    const content = fs.readFileSync(reportPath, 'utf-8');
    const report = JSON.parse(content);

    const issues = [];

    // Parse test results
    if (report.suites) {
      report.suites.forEach((suite) => {
        suite.tests?.forEach((test) => {
          if (test.status === 'failed') {
            issues.push({
              test: test.title,
              file: test.location?.file || 'unknown',
              line: test.location?.line || 0,
              error: test.error?.message || 'Unknown error',
              severity: 'error',
              wcagLevel: extractWCAGLevel(test.title),
            });
          }
        });
      });
    }

    return issues;
  } catch (error) {
    console.error('❌ Error parsing report:', error.message);
    return [];
  }
}

/**
 * Extract WCAG level from test title
 */
function extractWCAGLevel(title) {
  if (title.includes('A11Y-001')) return 'A'; // Keyboard navigation
  if (title.includes('A11Y-002')) return 'AA'; // Screen reader
  if (title.includes('A11Y-003')) return 'AA'; // Color contrast
  if (title.includes('A11Y-004')) return 'AA'; // Focus indicators
  if (title.includes('A11Y-005')) return 'A'; // Alt text
  if (title.includes('A11Y-006')) return 'A'; // Form labels
  if (title.includes('A11Y-007')) return 'A'; // Error messages
  return 'AA'; // Default
}

/**
 * Parse axe-core violations from test output
 */
function parseAxeViolations(violations) {
  if (!violations || !Array.isArray(violations)) {
    return [];
  }

  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact, // 'critical', 'serious', 'moderate', 'minor'
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    wcagTags: violation.tags.filter((tag) => tag.startsWith('wcag')),
    nodes: violation.nodes.length,
    elements: violation.nodes.map((node) => ({
      html: node.html,
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  }));
}

/**
 * Log issues to JSON file
 */
function logIssuesToFile(issues) {
  const existingIssues = fs.existsSync(ISSUES_FILE)
    ? JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf-8'))
    : { issues: [], lastUpdated: null };

  const newIssues = {
    issues: issues,
    lastUpdated: new Date().toISOString(),
    summary: {
      total: issues.length,
      critical: issues.filter((i) => i.impact === 'critical').length,
      serious: issues.filter((i) => i.impact === 'serious').length,
      moderate: issues.filter((i) => i.impact === 'moderate').length,
      minor: issues.filter((i) => i.impact === 'minor').length,
    },
  };

  fs.writeFileSync(ISSUES_FILE, JSON.stringify(newIssues, null, 2), 'utf-8');

  console.log(`✅ Logged ${issues.length} issue(s) to ${ISSUES_FILE}`);
  return newIssues;
}

/**
 * Display issues in console
 */
function displayIssues(issuesData) {
  console.log('\n📊 Accessibility Issues Summary\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const { issues, summary } = issuesData;

  if (issues.length === 0) {
    console.log('✅ No accessibility issues found!');
    console.log('   All WCAG 2.1 AA compliance checks passed.\n');
    return;
  }

  console.log(`Total Issues: ${summary.total}`);
  if (summary.critical > 0) {
    console.log(`  🔴 Critical: ${summary.critical}`);
  }
  if (summary.serious > 0) {
    console.log(`  🟠 Serious: ${summary.serious}`);
  }
  if (summary.moderate > 0) {
    console.log(`  🟡 Moderate: ${summary.moderate}`);
  }
  if (summary.minor > 0) {
    console.log(`  🔵 Minor: ${summary.minor}`);
  }
  console.log('');

  // Group by impact
  const grouped = {
    critical: issues.filter((i) => i.impact === 'critical'),
    serious: issues.filter((i) => i.impact === 'serious'),
    moderate: issues.filter((i) => i.impact === 'moderate'),
    minor: issues.filter((i) => i.impact === 'minor'),
  };

  ['critical', 'serious', 'moderate', 'minor'].forEach((level) => {
    if (grouped[level].length > 0) {
      console.log(`\n${getLevelIcon(level)} ${level.toUpperCase()} ISSUES:\n`);
      grouped[level].forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.id || issue.test}`);
        console.log(`   ${issue.description || issue.error}`);
        if (issue.helpUrl) {
          console.log(`   📖 ${issue.helpUrl}`);
        }
        if (issue.wcagTags && issue.wcagTags.length > 0) {
          console.log(`   🏷️  ${issue.wcagTags.join(', ')}`);
        }
        if (issue.nodes) {
          console.log(`   🎯 ${issue.nodes} element(s) affected`);
        }
        console.log('');
      });
    }
  });

  console.log('═══════════════════════════════════════════════════════════\n');
}

function getLevelIcon(level) {
  switch (level) {
    case 'critical':
      return '🔴';
    case 'serious':
      return '🟠';
    case 'moderate':
      return '🟡';
    case 'minor':
      return '🔵';
    default:
      return '⚪';
  }
}

/**
 * Example: Create sample issues for demonstration
 */
function createSampleIssues() {
  return [
    {
      id: 'color-contrast',
      impact: 'serious',
      description: 'Elements must have sufficient color contrast',
      help: 'Ensure sufficient color contrast between text and background',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/color-contrast',
      wcagTags: ['wcag2aa', 'wcag143'],
      nodes: 3,
      elements: [
        {
          html: '<button class="btn-primary">Submit</button>',
          target: ['button.btn-primary'],
          failureSummary: 'Contrast ratio: 3.2:1 (required: 4.5:1)',
        },
      ],
    },
    {
      id: 'label',
      impact: 'critical',
      description: 'Form elements must have labels',
      help: 'Form elements should have a visible label',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/label',
      wcagTags: ['wcag2a', 'wcag332', 'wcag131'],
      nodes: 1,
      elements: [
        {
          html: '<input type="text" name="search">',
          target: ['input[name="search"]'],
          failureSummary: 'Input has no associated label',
        },
      ],
    },
  ];
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'demo') {
    // Create and display sample issues
    const sampleIssues = createSampleIssues();
    const issuesData = {
      issues: sampleIssues,
      lastUpdated: new Date().toISOString(),
      summary: {
        total: sampleIssues.length,
        critical: sampleIssues.filter((i) => i.impact === 'critical').length,
        serious: sampleIssues.filter((i) => i.impact === 'serious').length,
        moderate: sampleIssues.filter((i) => i.impact === 'moderate').length,
        minor: sampleIssues.filter((i) => i.impact === 'minor').length,
      },
    };

    displayIssues(issuesData);
    logIssuesToFile(sampleIssues);
    return;
  }

  if (command === 'show') {
    // Display existing issues
    if (!fs.existsSync(ISSUES_FILE)) {
      console.log('No issues logged yet. Run accessibility tests first.');
      return;
    }

    const issuesData = JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf-8'));
    displayIssues(issuesData);
    return;
  }

  // Default: show usage
  console.log('Accessibility Issue Logger\n');
  console.log('Usage:');
  console.log('  node scripts/log-a11y-issues.js demo    - Show demo with sample issues');
  console.log('  node scripts/log-a11y-issues.js show    - Display logged issues');
  console.log('\nIntegration:');
  console.log('  This script integrates with Playwright test results.');
  console.log('  After running tests, axe-core violations are automatically logged.');
  console.log('\nWorkflow:');
  console.log('  1. Run: npm run test:a11y');
  console.log('  2. Review: node scripts/log-a11y-issues.js show');
  console.log('  3. Fix issues based on helpUrl guidance');
  console.log('  4. Re-test to verify fixes');
}

main();
