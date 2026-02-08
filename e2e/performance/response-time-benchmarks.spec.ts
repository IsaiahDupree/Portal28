// Response Time Benchmarks - Overall page load and API performance
import { test, expect } from '@playwright/test';

test.describe('Response Time Benchmarks', () => {
  test('Homepage should load under 1 second', async ({ page }) => {
    const start = Date.now();
    const response = await page.goto('/');
    const loadTime = Date.now() - start;

    expect(response?.status()).toBe(200);
    expect(loadTime).toBeLessThan(1000);

    console.log(`✓ Homepage loaded in ${loadTime}ms`);
  });

  test('Course listing page should load under 1.5 seconds', async ({ page }) => {
    const start = Date.now();
    const response = await page.goto('/app/courses');
    const loadTime = Date.now() - start;

    expect(response?.status()).toBe(200);
    expect(loadTime).toBeLessThan(1500);

    await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();

    console.log(`✓ Course listing loaded in ${loadTime}ms`);
  });

  test('Course detail page should load under 2 seconds', async ({ page }) => {
    // First get a course ID
    await page.goto('/app/courses');
    const firstCourse = page.locator('[data-testid="course-card"]').first();
    await firstCourse.click();

    const start = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(2000);

    console.log(`✓ Course detail page loaded in ${loadTime}ms`);
  });

  test('API: Course checkout should respond under 3 seconds', async ({ request }) => {
    const start = Date.now();
    const response = await request.post('/api/stripe/course-checkout', {
      data: { courseId: 1 },
    });
    const responseTime = Date.now() - start;

    expect([200, 401, 303]).toContain(response.status()); // 401 if not logged in
    expect(responseTime).toBeLessThan(3000);

    console.log(`✓ Checkout API responded in ${responseTime}ms`);
  });

  test('API: Search endpoint should respond under 500ms', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/api/search?q=course');
    const responseTime = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(500);

    const data = await response.json();
    expect(Array.isArray(data.results) || Array.isArray(data)).toBe(true);

    console.log(`✓ Search API responded in ${responseTime}ms`);
  });

  test('API: Admin analytics should respond under 1 second', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/api/admin/analytics');
    const responseTime = Date.now() - start;

    expect([200, 401]).toContain(response.status()); // 401 if not logged in
    expect(responseTime).toBeLessThan(1000);

    console.log(`✓ Analytics API responded in ${responseTime}ms`);
  });

  test('Performance degradation test: Sequential requests', async ({ request }) => {
    const endpoints = [
      '/api/search?q=course',
      '/api/admin/analytics',
      '/app/courses',
    ];

    const times: number[] = [];

    for (const endpoint of endpoints) {
      const start = Date.now();
      await request.get(endpoint);
      const time = Date.now() - start;
      times.push(time);
    }

    // Check that later requests aren't significantly slower (no >2x degradation)
    const firstTime = times[0];
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;

    expect(avgTime).toBeLessThan(firstTime * 2);

    console.log(`✓ Sequential requests: ${times.join('ms, ')}ms (avg: ${avgTime.toFixed(0)}ms)`);
  });

  test('Large payload handling: Course with many lessons', async ({ page }) => {
    // This test assumes there's a course with many lessons
    await page.goto('/app/courses');

    const start = Date.now();
    await page.locator('[data-testid="course-card"]').first().click();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    // Should still load reasonably fast even with many lessons
    expect(loadTime).toBeLessThan(3000);

    console.log(`✓ Large course loaded in ${loadTime}ms`);
  });
});
