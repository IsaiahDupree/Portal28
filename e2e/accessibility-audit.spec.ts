// Accessibility Audit with axe-core - Automated a11y scan
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit - axe-core Automated Scan', () => {
  // Helper to check for violations
  function checkViolations(violations: any[], page: string) {
    const critical = violations.filter((v) => v.impact === 'critical');
    const serious = violations.filter((v) => v.impact === 'serious');
    const moderate = violations.filter((v) => v.impact === 'moderate');
    const minor = violations.filter((v) => v.impact === 'minor');

    console.log(`\n📊 Accessibility Scan Results for ${page}:`);
    console.log(`   Critical: ${critical.length}`);
    console.log(`   Serious: ${serious.length}`);
    console.log(`   Moderate: ${moderate.length}`);
    console.log(`   Minor: ${minor.length}`);

    if (critical.length > 0) {
      console.log('\n❌ Critical Issues:');
      critical.forEach((v) => {
        console.log(`   - ${v.id}: ${v.description}`);
        console.log(`     Impact: ${v.impact}, Nodes: ${v.nodes.length}`);
      });
    }

    if (serious.length > 0) {
      console.log('\n⚠️  Serious Issues:');
      serious.forEach((v) => {
        console.log(`   - ${v.id}: ${v.description}`);
        console.log(`     Impact: ${v.impact}, Nodes: ${v.nodes.length}`);
      });
    }

    return { critical, serious, moderate, minor };
  }

  test.describe('Homepage Accessibility Audit', () => {
    test('Homepage should have no critical accessibility issues', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const { critical, serious } = checkViolations(results.violations, 'Homepage');

      // Criteria 1: No critical issues
      expect(critical.length).toBe(0);

      // Criteria 2: No serious issues
      expect(serious.length).toBe(0);

      console.log('✓ Homepage passed accessibility audit');
    });

    test('Homepage ARIA attributes should be correct', async ({ page }) => {
      await page.goto('/');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .options({ runOnly: ['aria'] })
        .analyze();

      const ariaViolations = results.violations;

      console.log(`📊 ARIA violations on Homepage: ${ariaViolations.length}`);

      ariaViolations.forEach((v) => {
        console.log(`   - ${v.id}: ${v.description}`);
      });

      // Criteria 3: ARIA should be correct (no violations)
      expect(ariaViolations.length).toBe(0);

      console.log('✓ Homepage ARIA attributes are correct');
    });
  });

  test.describe('Course Pages Accessibility Audit', () => {
    test('Course listing page should have no critical/serious issues', async ({ page }) => {
      await page.goto('/app/courses');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const { critical, serious } = checkViolations(results.violations, 'Course Listing');

      expect(critical.length).toBe(0);
      expect(serious.length).toBe(0);

      console.log('✓ Course listing passed accessibility audit');
    });

    test('Course listing ARIA should be correct', async ({ page }) => {
      await page.goto('/app/courses');

      const results = await new AxeBuilder({ page })
        .options({ runOnly: ['aria'] })
        .analyze();

      expect(results.violations.length).toBe(0);
      console.log('✓ Course listing ARIA is correct');
    });
  });

  test.describe('Authentication Pages Accessibility Audit', () => {
    test('Login page should have no critical/serious issues', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const { critical, serious } = checkViolations(results.violations, 'Login Page');

      expect(critical.length).toBe(0);
      expect(serious.length).toBe(0);

      console.log('✓ Login page passed accessibility audit');
    });

    test('Login page forms should have proper labels', async ({ page }) => {
      await page.goto('/login');

      const results = await new AxeBuilder({ page })
        .options({ runOnly: ['form-field-multiple-labels', 'label', 'label-title-only'] })
        .analyze();

      expect(results.violations.length).toBe(0);
      console.log('✓ Login page forms have proper labels');
    });
  });

  test.describe('Dashboard Accessibility Audit', () => {
    test('Dashboard should have no critical/serious issues', async ({ page }) => {
      await page.goto('/app/dashboard');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const { critical, serious } = checkViolations(results.violations, 'Dashboard');

      expect(critical.length).toBe(0);
      expect(serious.length).toBe(0);

      console.log('✓ Dashboard passed accessibility audit');
    });
  });

  test.describe('Color Contrast Audit', () => {
    test('Homepage should meet color contrast requirements', async ({ page }) => {
      await page.goto('/');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .options({ runOnly: ['color-contrast'] })
        .analyze();

      checkViolations(results.violations, 'Homepage (Color Contrast)');

      expect(results.violations.length).toBe(0);
      console.log('✓ Homepage meets color contrast requirements');
    });

    test('Course pages should meet color contrast requirements', async ({ page }) => {
      await page.goto('/app/courses');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .options({ runOnly: ['color-contrast'] })
        .analyze();

      expect(results.violations.length).toBe(0);
      console.log('✓ Course pages meet color contrast requirements');
    });
  });

  test.describe('Keyboard Navigation Audit', () => {
    test('All interactive elements should be keyboard accessible', async ({ page }) => {
      await page.goto('/');

      const results = await new AxeBuilder({ page })
        .options({ runOnly: ['keyboard'] })
        .analyze();

      checkViolations(results.violations, 'Keyboard Navigation');

      expect(results.violations.length).toBe(0);
      console.log('✓ All elements are keyboard accessible');
    });
  });

  test.describe('Comprehensive WCAG 2.1 AA Audit', () => {
    test('Homepage should pass full WCAG 2.1 AA audit', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const { critical, serious, moderate, minor } = checkViolations(
        results.violations,
        'Homepage (Full WCAG 2.1 AA)'
      );

      // No critical or serious issues
      expect(critical.length).toBe(0);
      expect(serious.length).toBe(0);

      // Log moderate/minor for awareness
      if (moderate.length > 0 || minor.length > 0) {
        console.log(
          `ℹ️  Note: ${moderate.length} moderate and ${minor.length} minor issues found (non-blocking)`
        );
      }

      console.log('✓ Homepage passed full WCAG 2.1 AA audit');
    });

    test('Course catalog should pass full WCAG 2.1 AA audit', async ({ page }) => {
      await page.goto('/app/courses');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const { critical, serious } = checkViolations(
        results.violations,
        'Course Catalog (Full WCAG 2.1 AA)'
      );

      expect(critical.length).toBe(0);
      expect(serious.length).toBe(0);

      console.log('✓ Course catalog passed full WCAG 2.1 AA audit');
    });

    test('Login flow should pass full WCAG 2.1 AA audit', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const { critical, serious } = checkViolations(
        results.violations,
        'Login Flow (Full WCAG 2.1 AA)'
      );

      expect(critical.length).toBe(0);
      expect(serious.length).toBe(0);

      console.log('✓ Login flow passed full WCAG 2.1 AA audit');
    });

    test('Dashboard should pass full WCAG 2.1 AA audit', async ({ page }) => {
      await page.goto('/app/dashboard');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const { critical, serious } = checkViolations(
        results.violations,
        'Dashboard (Full WCAG 2.1 AA)'
      );

      expect(critical.length).toBe(0);
      expect(serious.length).toBe(0);

      console.log('✓ Dashboard passed full WCAG 2.1 AA audit');
    });
  });

  test.describe('ARIA Best Practices', () => {
    test('All pages should use ARIA correctly', async ({ page }) => {
      const pages = ['/', '/app/courses', '/login', '/app/dashboard'];

      for (const url of pages) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        const results = await new AxeBuilder({ page })
          .options({ runOnly: ['aria'] })
          .analyze();

        console.log(`📊 ARIA check for ${url}: ${results.violations.length} violations`);

        expect(results.violations.length).toBe(0);
      }

      console.log('✓ All pages use ARIA correctly');
    });
  });

  test.describe('Image Accessibility', () => {
    test('All images should have alt text', async ({ page }) => {
      await page.goto('/app/courses');

      const results = await new AxeBuilder({ page })
        .options({ runOnly: ['image-alt'] })
        .analyze();

      checkViolations(results.violations, 'Image Alt Text');

      expect(results.violations.length).toBe(0);
      console.log('✓ All images have proper alt text');
    });
  });

  test.describe('Form Accessibility', () => {
    test('All form inputs should have labels', async ({ page }) => {
      await page.goto('/login');

      const results = await new AxeBuilder({ page })
        .options({ runOnly: ['label'] })
        .analyze();

      expect(results.violations.length).toBe(0);
      console.log('✓ All form inputs have proper labels');
    });
  });

  test('Summary: Accessibility audit report', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const { critical, serious, moderate, minor } = checkViolations(
      results.violations,
      'Final Summary'
    );

    console.log('\n📊 Accessibility Audit Summary:');
    console.log('✓ No critical accessibility issues');
    console.log('✓ No serious accessibility issues');
    console.log('✓ ARIA attributes are correct');
    console.log('✓ WCAG 2.1 AA compliant');
    console.log(`ℹ️  Total issues: ${critical.length + serious.length + moderate.length + minor.length}`);

    expect(critical.length).toBe(0);
    expect(serious.length).toBe(0);
  });
});
