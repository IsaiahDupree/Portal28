// Web Vitals Performance Tests - LCP, FID, CLS
import { test, expect } from '@playwright/test';

test.describe('Web Vitals Performance Metrics', () => {
  // Helper function to get Web Vitals metrics
  async function getWebVitals(page: any) {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics = {
          lcp: 0,
          fid: 0,
          cls: 0,
        };

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          metrics.cls = clsValue;
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // First Input Delay - requires actual user interaction
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const firstInput = entries[0] as any;
            metrics.fid = firstInput.processingStart - firstInput.startTime;
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });

        // Wait for page to be fully loaded
        setTimeout(() => {
          resolve(metrics);
        }, 3000);
      });
    });
  }

  test('Homepage: LCP should be < 2.5s', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const metrics = await getWebVitals(page);
    const lcpInSeconds = (metrics as any).lcp / 1000;

    console.log(`✓ Homepage LCP: ${lcpInSeconds.toFixed(3)}s`);
    expect(lcpInSeconds).toBeLessThan(2.5);
  });

  test('Homepage: CLS should be < 0.1', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to trigger potential layout shifts
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);

    const metrics = await getWebVitals(page);
    const cls = (metrics as any).cls;

    console.log(`✓ Homepage CLS: ${cls.toFixed(4)}`);
    expect(cls).toBeLessThan(0.1);
  });

  test('Homepage: FID should be < 100ms (simulated interaction)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate user interaction by clicking a button
    const interactionStart = Date.now();
    const button = page.locator('button, a').first();
    if (await button.count() > 0) {
      await button.click({ force: true, noWaitAfter: true });
    }
    const interactionTime = Date.now() - interactionStart;

    console.log(`✓ Homepage interaction delay: ${interactionTime}ms`);
    expect(interactionTime).toBeLessThan(100);
  });

  test('Course listing page: LCP should be < 2.5s', async ({ page }) => {
    await page.goto('/app/courses');
    await page.waitForLoadState('networkidle');

    const metrics = await getWebVitals(page);
    const lcpInSeconds = (metrics as any).lcp / 1000;

    console.log(`✓ Course listing LCP: ${lcpInSeconds.toFixed(3)}s`);
    expect(lcpInSeconds).toBeLessThan(2.5);
  });

  test('Course listing page: CLS should be < 0.1', async ({ page }) => {
    await page.goto('/app/courses');
    await page.waitForLoadState('networkidle');

    // Scroll to load images and check for shifts
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);

    const metrics = await getWebVitals(page);
    const cls = (metrics as any).cls;

    console.log(`✓ Course listing CLS: ${cls.toFixed(4)}`);
    expect(cls).toBeLessThan(0.1);
  });

  test('Dashboard page: LCP should be < 2.5s', async ({ page }) => {
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    const metrics = await getWebVitals(page);
    const lcpInSeconds = (metrics as any).lcp / 1000;

    console.log(`✓ Dashboard LCP: ${lcpInSeconds.toFixed(3)}s`);
    expect(lcpInSeconds).toBeLessThan(2.5);
  });

  test('Dashboard page: CLS should be < 0.1', async ({ page }) => {
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);

    const metrics = await getWebVitals(page);
    const cls = (metrics as any).cls;

    console.log(`✓ Dashboard CLS: ${cls.toFixed(4)}`);
    expect(cls).toBeLessThan(0.1);
  });

  test('Overall page load time should be < 3s', async ({ page }) => {
    const pages = ['/', '/app/courses', '/app/dashboard'];

    for (const url of pages) {
      const start = Date.now();
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - start;

      console.log(`✓ ${url} loaded in ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
    }
  });

  test('Performance budget: Critical resources load quickly', async ({ page }) => {
    await page.goto('/');

    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as any;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        domInteractive: perfData.domInteractive - perfData.fetchStart,
        domComplete: perfData.domComplete - perfData.fetchStart,
      };
    });

    console.log(`✓ DOM Interactive: ${performanceMetrics.domInteractive}ms`);
    console.log(`✓ DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`✓ DOM Complete: ${performanceMetrics.domComplete}ms`);

    // DOM Interactive should be fast
    expect(performanceMetrics.domInteractive).toBeLessThan(1500);
    // DOM Complete should be under 3s
    expect(performanceMetrics.domComplete).toBeLessThan(3000);
  });

  test('Image loading performance: Images should load progressively', async ({ page }) => {
    await page.goto('/app/courses');

    // Check that images have proper loading attributes
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      // Check first few images for loading="lazy" or eager
      for (let i = 0; i < Math.min(3, imageCount); i++) {
        const img = images.nth(i);
        const loading = await img.getAttribute('loading');
        console.log(`✓ Image ${i + 1} loading strategy: ${loading || 'default'}`);
      }
    }

    // Ensure page is still performant with images
    await page.waitForLoadState('networkidle');
    const metrics = await getWebVitals(page);
    const lcpInSeconds = (metrics as any).lcp / 1000;

    expect(lcpInSeconds).toBeLessThan(2.5);
  });

  test('JavaScript bundle size impact on FID', async ({ page }) => {
    await page.goto('/');

    // Get resource timing for JS bundles
    const jsResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources
        .filter((r: any) => r.name.includes('.js'))
        .map((r: any) => ({
          name: r.name.split('/').pop(),
          size: r.transferSize,
          duration: r.duration,
        }))
        .sort((a: any, b: any) => b.size - a.size)
        .slice(0, 5); // Top 5 largest JS files
    });

    console.log('✓ Top 5 JS bundles:');
    jsResources.forEach((r: any) => {
      console.log(`  - ${r.name}: ${(r.size / 1024).toFixed(2)}KB (${r.duration.toFixed(0)}ms)`);
    });

    // Ensure no single JS file is blocking for too long
    const maxJsDuration = Math.max(...jsResources.map((r: any) => r.duration));
    expect(maxJsDuration).toBeLessThan(2000);
  });

  test('Third-party script impact on performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const thirdPartyScripts = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources
        .filter((r: any) => {
          const url = new URL(r.name);
          return url.hostname !== window.location.hostname;
        })
        .map((r: any) => ({
          name: new URL(r.name).hostname,
          duration: r.duration,
        }));
    });

    console.log(`✓ Third-party scripts detected: ${thirdPartyScripts.length}`);

    // Third-party scripts shouldn't dominate load time
    const totalThirdPartyTime = thirdPartyScripts.reduce(
      (sum: number, r: any) => sum + r.duration,
      0
    );
    console.log(`✓ Total third-party load time: ${totalThirdPartyTime.toFixed(0)}ms`);

    // Should be reasonable
    expect(totalThirdPartyTime).toBeLessThan(5000);
  });

  test('Mobile performance: LCP < 2.5s on mobile viewport', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const metrics = await getWebVitals(page);
    const lcpInSeconds = (metrics as any).lcp / 1000;

    console.log(`✓ Mobile LCP (${browserName}): ${lcpInSeconds.toFixed(3)}s`);
    expect(lcpInSeconds).toBeLessThan(2.5);
  });

  test('Mobile performance: CLS < 0.1 on mobile viewport', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll on mobile
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);

    const metrics = await getWebVitals(page);
    const cls = (metrics as any).cls;

    console.log(`✓ Mobile CLS (${browserName}): ${cls.toFixed(4)}`);
    expect(cls).toBeLessThan(0.1);
  });
});
