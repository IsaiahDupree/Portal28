# Visual Regression Testing Guide

## Overview

Visual regression testing automatically detects unintended visual changes in the Portal28 Academy application by comparing screenshots across code changes.

## Quick Start

### Run Visual Regression Tests

```bash
# Run all visual regression tests
npm run test:visual

# Run on specific browser
npm run test:visual:chromium
npm run test:visual:firefox
npm run test:visual:webkit

# Run on all browsers
npm run test:visual:all-browsers
```

### Update Baseline Screenshots

When visual changes are intentional (e.g., design updates):

```bash
# Update all baselines
npm run test:visual:update

# Update for specific browser
npm run test:visual:update -- --project=chromium
```

## What's Tested

### Public Pages
- Homepage (full page + hero section)
- Courses catalog page
- Login page
- 404 error page

### Navigation Components
- Desktop navigation
- Mobile navigation (closed state)
- Footer

### Responsive Design
- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1920x1080)

### Component States
- Button states (normal, hover)
- Form input states (empty, focused, filled)
- Course cards (normal, hover)

### Theme Support
- Light mode
- Dark mode

### Cross-Browser Compatibility
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

## Configuration

### Screenshot Settings

Located in `playwright.config.ts`:

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,        // Max pixel differences allowed
    maxDiffPixelRatio: 0.01,   // Max 1% different pixels
    threshold: 0.2,            // Pixel comparison sensitivity
    animations: "disabled",    // Disable animations
    scale: "css",              // Use CSS pixels
  },
}
```

### Screenshot Storage

- **Location:** `e2e/__screenshots__/`
- **Structure:** `{testFilePath}/{screenshotName}.png`
- **Version Control:** Baselines are committed to git

## CI/CD Integration

### GitHub Actions Workflow

The visual regression tests run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

**Workflow File:** `.github/workflows/visual-regression.yml`

### CI Behavior

1. **On Pull Request:**
   - Runs tests against PR branch
   - Compares with baseline screenshots
   - Comments on PR if differences detected
   - Uploads diff images as artifacts

2. **On Main Branch:**
   - Runs multi-browser tests
   - Validates visual consistency
   - Uploads screenshots for all browsers

3. **Manual Baseline Update:**
   - Trigger via GitHub Actions UI
   - Updates baselines automatically
   - Commits changes back to repo

## Writing Visual Regression Tests

### Basic Screenshot Test

```typescript
test("component renders correctly", async ({ page }) => {
  await page.goto("/your-page");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot("page-name.png", {
    fullPage: true,
    animations: "disabled",
  });
});
```

### Component-Level Screenshot

```typescript
test("specific component", async ({ page }) => {
  await page.goto("/page");

  const component = page.locator('[data-testid="component"]');
  await expect(component).toHaveScreenshot("component-name.png", {
    animations: "disabled",
  });
});
```

### Responsive Screenshots

```typescript
test("responsive design", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/page");

  await expect(page).toHaveScreenshot("page-mobile.png");
});
```

### State-Based Screenshots

```typescript
test("hover state", async ({ page }) => {
  await page.goto("/page");

  const button = page.locator("button").first();

  // Normal state
  await expect(button).toHaveScreenshot("button-normal.png");

  // Hover state
  await button.hover();
  await page.waitForTimeout(100); // Wait for transition
  await expect(button).toHaveScreenshot("button-hover.png");
});
```

## Best Practices

### 1. Disable Animations

Always disable animations to ensure consistent screenshots:

```typescript
await expect(page).toHaveScreenshot("name.png", {
  animations: "disabled",
});
```

### 2. Wait for Network Idle

Ensure page is fully loaded:

```typescript
await page.goto("/page");
await page.waitForLoadState("networkidle");
```

### 3. Use Stable Selectors

Prefer data-testid over CSS classes:

```typescript
const element = page.locator('[data-testid="stable-id"]');
```

### 4. Handle Dynamic Content

Mask or stabilize dynamic content:

```typescript
await expect(page).toHaveScreenshot("page.png", {
  mask: [page.locator('[data-testid="timestamp"]')],
});
```

### 5. Set Appropriate Thresholds

Adjust thresholds based on component:

```typescript
await expect(page).toHaveScreenshot("page.png", {
  maxDiffPixels: 50,  // Lower for pixel-perfect components
  threshold: 0.1,     // Higher for more strict comparison
});
```

## Troubleshooting

### Test Fails with Small Differences

**Cause:** Minor rendering differences (fonts, antialiasing)

**Solution:**
```bash
# Increase tolerance
maxDiffPixels: 200
maxDiffPixelRatio: 0.02
```

### Flaky Tests

**Cause:** Dynamic content, animations, or loading states

**Solutions:**
1. Wait for network idle
2. Disable animations
3. Mask dynamic elements
4. Add wait for specific elements

### Cross-Browser Differences

**Cause:** Different rendering engines

**Solution:**
```typescript
await expect(page).toHaveScreenshot(`page-${browserName}.png`, {
  maxDiffPixels: 100, // Allow minor differences
});
```

### Screenshots Not Updating

**Cause:** Cached baselines

**Solution:**
```bash
# Delete old screenshots
rm -rf e2e/__screenshots__/

# Generate new baselines
npm run test:visual:update
```

## Reviewing Visual Changes

### Local Development

1. Run tests: `npm run test:visual`
2. Check `test-results/` folder for diffs
3. Review diff images
4. Update baselines if intentional: `npm run test:visual:update`

### In CI (Pull Requests)

1. Check PR comments for visual regression failures
2. Download artifacts from GitHub Actions
3. Review diff images in `visual-regression-screenshots/`
4. If intentional:
   - Update baselines locally
   - Commit updated screenshots
   - Push to PR branch

### Diff Image Structure

```
test-results/
├── visual-regression-spec-ts-homepage-full-png/
│   ├── homepage-full-actual.png    # Current screenshot
│   ├── homepage-full-expected.png  # Baseline
│   └── homepage-full-diff.png      # Visual diff
```

## Maintenance

### Update Baselines After Design Changes

```bash
# 1. Make design changes
# 2. Review changes visually
# 3. Update baselines
npm run test:visual:update

# 4. Commit updated screenshots
git add e2e/__screenshots__/
git commit -m "chore: update visual regression baselines"
```

### Add New Tests

1. Create test in `e2e/visual-regression.spec.ts`
2. Run test to generate baseline
3. Review screenshot
4. Commit baseline

### Performance Optimization

**Reduce Test Time:**
- Run only chromium in CI PRs
- Run all browsers only on main branch
- Use `fullyParallel: true` in config

**Reduce Storage:**
- Compress screenshots (already done by Playwright)
- Archive old baselines periodically
- Use git LFS for large screenshot sets

## Integration with Feature Development

### Feature Development Workflow

1. **Before Changes:**
   ```bash
   npm run test:visual
   ```

2. **Make Changes:**
   - Implement feature
   - Update components

3. **After Changes:**
   ```bash
   npm run test:visual
   ```

4. **Review Diffs:**
   - Check `test-results/` folder
   - Confirm changes are intentional

5. **Update if Intentional:**
   ```bash
   npm run test:visual:update
   git add e2e/__screenshots__/
   git commit -m "feat: update visuals for [feature]"
   ```

### Pre-Commit Hook (Optional)

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run test:visual -- --project=chromium
```

## Related Documentation

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [E2E Testing Guide](./E2E_TESTING.md)
- [TDD Test Suite](./TDD_TEST_SUITE.md)

## Acceptance Criteria (feat-218)

- ✅ Screenshot comparisons implemented
- ✅ Component snapshots for key UI elements
- ✅ CI integration with GitHub Actions
- ✅ Baselines can be updated via npm scripts
- ✅ Visual regressions detected automatically
- ✅ Multi-browser support (Chromium, Firefox, WebKit)
- ✅ Responsive design testing
- ✅ Dark mode support

## Test Coverage

| Category | Test Count | Status |
|----------|------------|--------|
| Public Pages | 4 | ✅ |
| Navigation | 3 | ✅ |
| Responsive Design | 6 | ✅ |
| Component States | 6 | ✅ |
| Dark Mode | 3 | ✅ |
| Cross-Browser | 1 | ✅ |
| Error States | 1 | ✅ |
| **Total** | **24** | ✅ |

---

*Last Updated: February 7, 2026*
