// Database Performance Tests (PERF-DB-001 to PERF-DB-004)
import { test, expect } from '@playwright/test';

test.describe('Database Performance Tests', () => {
  // PERF-DB-001: Course catalog query < 100ms
  test('PERF-DB-001: Course catalog query should be under 100ms', async ({ page }) => {
    const start = Date.now();
    const response = await page.goto('/app/courses');
    const loadTime = Date.now() - start;

    expect(response?.status()).toBe(200);
    expect(loadTime).toBeLessThan(100);

    // Verify catalog loads
    await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();

    console.log(`✓ Course catalog loaded in ${loadTime}ms`);
  });

  // PERF-DB-002: Search query < 200ms
  test('PERF-DB-002: Search query should be under 200ms', async ({ page }) => {
    await page.goto('/app/courses');

    // Measure search API call
    const searchPromise = page.waitForResponse(
      (response) => response.url().includes('/api/search'),
      { timeout: 5000 }
    );

    const start = Date.now();
    await page.fill('[data-testid="search-input"]', 'course');
    const response = await searchPromise;
    const queryTime = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(queryTime).toBeLessThan(200);

    console.log(`✓ Search query completed in ${queryTime}ms`);
  });

  // PERF-DB-003: Analytics aggregation < 500ms
  test('PERF-DB-003: Analytics aggregation should be under 500ms', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@portal28.test');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/analytics', { timeout: 10000 });

    // Measure analytics load time
    const analyticsPromise = page.waitForResponse(
      (response) => response.url().includes('/api/admin/analytics'),
      { timeout: 5000 }
    );

    const start = Date.now();
    await page.reload();
    const response = await analyticsPromise;
    const aggregationTime = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(aggregationTime).toBeLessThan(500);

    console.log(`✓ Analytics aggregation completed in ${aggregationTime}ms`);
  });

  // PERF-DB-004: MRR calculation < 300ms
  test('PERF-DB-004: MRR calculation should be under 300ms', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@portal28.test');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/analytics', { timeout: 10000 });

    // Measure MRR calculation
    const mrrPromise = page.waitForResponse(
      (response) => response.url().includes('/api/admin/analytics/mrr'),
      { timeout: 5000 }
    );

    const start = Date.now();
    await page.click('[data-testid="mrr-tab"]');
    const response = await mrrPromise;
    const calculationTime = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(calculationTime).toBeLessThan(300);

    const data = await response.json();
    expect(data).toHaveProperty('mrr');
    expect(typeof data.mrr).toBe('number');

    console.log(`✓ MRR calculation completed in ${calculationTime}ms (MRR: $${data.mrr})`);
  });

  test('Performance baseline: Multiple concurrent queries', async ({ page }) => {
    // Test that multiple queries can run concurrently without significant degradation
    const start = Date.now();

    const promises = [
      page.request.get('/app/courses'),
      page.request.get('/api/search?q=course'),
      page.request.get('/api/admin/analytics'),
    ];

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - start;

    responses.forEach((response) => {
      expect(response.status()).toBe(200);
    });

    // All three should complete in under 1 second total
    expect(totalTime).toBeLessThan(1000);

    console.log(`✓ 3 concurrent queries completed in ${totalTime}ms`);
  });
});
