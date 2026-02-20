# Testing Coverage Guide

> **Portal28 Academy** - Comprehensive testing and coverage documentation

## Overview

Portal28 uses a multi-layered testing strategy with comprehensive coverage reporting:

1. **Jest** - Unit and integration tests
2. **Playwright** - End-to-end tests
3. **Coverage Reports** - HTML, LCOV, JSON, Cobertura formats

## Coverage Thresholds

### Jest Unit Test Coverage

Minimum thresholds enforced in CI/CD:

| Metric     | Threshold | Description                              |
|------------|-----------|------------------------------------------|
| Branches   | 50%       | Conditional logic paths covered          |
| Functions  | 50%       | Function/method execution coverage       |
| Lines      | 50%       | Source code lines executed               |
| Statements | 50%       | JavaScript statements executed           |

**Configuration:** `jest.config.js` (lines 22-29)

### What's Covered

```javascript
// Included in coverage analysis
collectCoverageFrom: [
  "lib/**/*.{js,ts}",          // Business logic
  "components/**/*.{js,ts,tsx}", // React components
  "app/**/*.{js,ts,tsx}",        // Next.js app routes
]

// Excluded from coverage
"!**/*.d.ts",                   // TypeScript definitions
"!**/node_modules/**",          // Dependencies
"!**/.next/**",                 // Build artifacts
"!**/coverage/**",              // Coverage reports
"!**/e2e/**",                   // E2E test files
```

## Running Coverage Reports

### Quick Commands

```bash
# Jest unit tests with coverage
npm run test:coverage

# Jest coverage + open HTML report (macOS)
npm run test:coverage:open

# Jest coverage with summary report
npm run test:coverage:report

# Playwright E2E tests with HTML report
npm run test:e2e:report

# Comprehensive coverage report (both Jest + Playwright)
./scripts/coverage-report.sh
```

### Comprehensive Coverage Script

The `scripts/coverage-report.sh` script:

1. ✅ Cleans previous coverage reports
2. ✅ Runs Jest tests with coverage
3. ✅ Runs Playwright E2E tests
4. ✅ Generates HTML reports for both
5. ✅ Creates combined coverage summary
6. ✅ Validates thresholds

**Usage:**

```bash
./scripts/coverage-report.sh
```

**Output:**
- `coverage/jest/index.html` - Jest HTML report
- `coverage/jest/lcov.info` - LCOV format (for CI)
- `coverage/jest/coverage-summary.json` - JSON summary
- `playwright-report/index.html` - Playwright HTML report
- `coverage/COVERAGE_REPORT.md` - Combined summary

## Coverage Report Formats

### Jest Coverage Formats

| Format        | File                              | Use Case                     |
|---------------|-----------------------------------|------------------------------|
| **HTML**      | `coverage/jest/index.html`        | Human-readable, visual       |
| **LCOV**      | `coverage/jest/lcov.info`         | CI integration (Codecov)     |
| **JSON**      | `coverage/jest/coverage-summary.json` | Programmatic analysis   |
| **Cobertura** | `coverage/jest/cobertura-coverage.xml` | CI tools (Jenkins)     |
| **Text**      | Terminal output                   | Quick summary                |

### Viewing HTML Reports

**macOS:**
```bash
open coverage/jest/index.html
open playwright-report/index.html
```

**Linux:**
```bash
xdg-open coverage/jest/index.html
xdg-open playwright-report/index.html
```

**Windows:**
```bash
start coverage/jest/index.html
start playwright-report/index.html
```

## Coverage Report Features

### Jest HTML Report

- **File-by-file breakdown** - Click any file to see line-by-line coverage
- **Color-coded lines:**
  - 🟢 Green - Covered
  - 🔴 Red - Uncovered
  - 🟡 Yellow - Partially covered (branches)
- **Coverage percentages** - Statements, branches, functions, lines
- **Source code view** - Syntax highlighted with coverage overlay

### Playwright HTML Report

- **Test results** - Pass/fail status for all E2E tests
- **Screenshots** - Failure screenshots attached
- **Traces** - Step-by-step execution traces
- **Performance metrics** - Test duration and timing
- **Browser matrix** - Results across Chromium, Firefox, WebKit

## Directory Structure

```
Portal28/
├── coverage/
│   ├── jest/
│   │   ├── index.html          # Main HTML report
│   │   ├── lcov.info           # LCOV format
│   │   ├── coverage-summary.json
│   │   └── cobertura-coverage.xml
│   ├── playwright/
│   │   └── test-results.json   # E2E test results
│   └── COVERAGE_REPORT.md      # Combined summary
├── playwright-report/
│   └── index.html              # Playwright HTML report
├── test-results/                # Playwright artifacts
└── scripts/
    └── coverage-report.sh      # Coverage generator
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/jest/lcov.info
    fail_ci_if_error: true

- name: Run E2E tests
  run: npx playwright test

- name: Upload Playwright report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

### Coverage Badges

Add to README.md:

```markdown
![Coverage](https://codecov.io/gh/your-org/portal28/branch/main/graph/badge.svg)
```

## Coverage Best Practices

### What to Test

✅ **High Priority:**
- API routes (`app/api/**/*.ts`)
- Business logic (`lib/**/*.ts`)
- Access control (`lib/entitlements/**/*.ts`)
- Payment processing (`lib/stripe.ts`)
- Database queries (`lib/db/**/*.ts`)

✅ **Medium Priority:**
- React components (`components/**/*.tsx`)
- Server components (`app/**/page.tsx`)
- Server actions
- Form validation

⚠️ **Lower Priority:**
- UI layouts (test E2E instead)
- Simple utility functions
- Type definitions

### What NOT to Test

❌ Don't waste time on:
- Third-party library code
- Configuration files (`*.config.js`)
- TypeScript type definitions (`*.d.ts`)
- Build artifacts (`/.next/`)
- Database migrations (SQL files)

## Improving Coverage

### Finding Uncovered Code

1. **Run coverage report:**
   ```bash
   npm run test:coverage
   ```

2. **Open HTML report:**
   ```bash
   open coverage/jest/index.html
   ```

3. **Navigate to uncovered files** (red indicators)

4. **Review uncovered lines** (red background)

5. **Write tests** for critical uncovered code

### Coverage Patterns

**Example: Testing an API route**

```typescript
// __tests__/api/courses/route.test.ts
import { GET } from '@/app/api/courses/route';

describe('/api/courses', () => {
  it('returns courses list', async () => {
    const request = new Request('http://localhost/api/courses');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

**Example: Testing a utility function**

```typescript
// __tests__/lib/entitlements/hasAccess.test.ts
import { hasAccess } from '@/lib/entitlements/hasAccess';

describe('hasAccess', () => {
  it('returns true for valid entitlement', () => {
    const result = hasAccess('user-123', 'course-456');
    expect(result).toBe(true);
  });

  it('returns false for missing entitlement', () => {
    const result = hasAccess('user-123', 'course-999');
    expect(result).toBe(false);
  });
});
```

## Coverage vs E2E Testing

| Aspect           | Jest (Coverage)           | Playwright (E2E)          |
|------------------|---------------------------|---------------------------|
| **Focus**        | Code execution paths      | User workflows            |
| **Speed**        | Fast (milliseconds)       | Slow (seconds)            |
| **Scope**        | Unit/integration          | Full application          |
| **When to use**  | Every commit              | Before deployment         |
| **Feedback**     | Line-by-line coverage     | User experience           |
| **Mocking**      | Heavy mocking             | Real integrations         |

**Strategy:** Use both! High Jest coverage + critical E2E flows = robust testing.

## Troubleshooting

### Coverage Threshold Failures

**Error:**
```
Jest: "global" coverage threshold for branches (50%) not met: 45.2%
```

**Solutions:**
1. Write tests for uncovered branches
2. Remove unreachable code
3. Adjust thresholds (if justified)

### Missing Coverage Files

**Error:**
```
Coverage file not found: coverage/jest/lcov.info
```

**Solution:**
```bash
# Clean and regenerate
rm -rf coverage/
npm run test:coverage
```

### Playwright Report Not Generated

**Error:**
```
playwright-report/index.html not found
```

**Solution:**
```bash
# Run with explicit reporter
npx playwright test --reporter=html
```

## Advanced Coverage Analysis

### Per-Directory Thresholds

Add to `jest.config.js`:

```javascript
coverageThreshold: {
  global: { branches: 50, functions: 50, lines: 50, statements: 50 },
  './lib/': { branches: 80, functions: 80, lines: 80, statements: 80 },
  './app/api/': { branches: 70, functions: 70, lines: 70, statements: 70 },
}
```

### Coverage Trends

Track coverage over time:

```bash
# Save current coverage
cp coverage/jest/coverage-summary.json coverage/history/$(date +%Y-%m-%d).json

# Compare with baseline
diff coverage/baseline.json coverage/jest/coverage-summary.json
```

### Identifying Flaky Tests

Monitor Playwright report for:
- Tests with inconsistent pass/fail
- Tests that only pass on retries
- Browser-specific failures

## Resources

- **Jest Coverage Docs:** https://jestjs.io/docs/configuration#collectcoveragefrom-array
- **Playwright Reporters:** https://playwright.dev/docs/test-reporters
- **Coverage Best Practices:** https://martinfowler.com/bliki/TestCoverage.html

## Feature Completion

**Feature ID:** feat-WC-025
**Status:** ✅ Implemented
**Date:** 2026-02-19

**Acceptance Criteria:**
- ✅ Config: Coverage configured in `jest.config.js` and `playwright.config.ts`
- ✅ HTML report: Generated at `coverage/jest/index.html`
- ✅ Thresholds: 50% enforced for all metrics (branches, functions, lines, statements)

---

*Last Updated: 2026-02-19*
