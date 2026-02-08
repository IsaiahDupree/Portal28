/**
 * E2E tests for Acquisition Event Tracking (TRACK-002)
 * Tests landing_view, cta_click, and pricing_view events with UTM parameters
 */

import { test, expect } from '@playwright/test';

test.describe('Acquisition Event Tracking (TRACK-002)', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept tracking API calls
    await page.route('**/api/tracking/events', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test('should track landing_view with UTM parameters on homepage', async ({ page }) => {
    let landingViewTracked = false;
    let landingViewData: any = null;

    page.on('request', (request) => {
      if (
        request.url().includes('/api/tracking/events') &&
        request.method() === 'POST'
      ) {
        const body = request.postDataJSON();
        if (body?.event === 'landing_view') {
          landingViewTracked = true;
          landingViewData = body;
        }
      }
    });

    // Visit homepage with UTM parameters
    await page.goto('/?utm_source=facebook&utm_medium=cpc&utm_campaign=summer_sale&utm_content=ad_a&utm_term=brand_strategy');

    // Wait a bit for tracking to fire
    await page.waitForTimeout(1000);

    // Verify landing_view event was tracked
    expect(landingViewTracked).toBe(true);
    expect(landingViewData.properties.utm_source).toBe('facebook');
    expect(landingViewData.properties.utm_medium).toBe('cpc');
    expect(landingViewData.properties.utm_campaign).toBe('summer_sale');
    expect(landingViewData.properties.utm_content).toBe('ad_a');
    expect(landingViewData.properties.utm_term).toBe('brand_strategy');
    expect(landingViewData.properties.landing_page).toBe('/');
  });

  test('should track landing_view with fbclid parameter', async ({ page }) => {
    let landingViewTracked = false;
    let landingViewData: any = null;

    page.on('request', (request) => {
      if (
        request.url().includes('/api/tracking/events') &&
        request.method() === 'POST'
      ) {
        const body = request.postDataJSON();
        if (body?.event === 'landing_view') {
          landingViewTracked = true;
          landingViewData = body;
        }
      }
    });

    // Visit homepage with fbclid
    await page.goto('/?fbclid=IwAR123456789');

    // Wait for tracking to fire
    await page.waitForTimeout(1000);

    expect(landingViewTracked).toBe(true);
    expect(landingViewData.properties.fbclid).toBe('IwAR123456789');
  });

  test('should track pricing_view when visiting courses page', async ({ page }) => {
    let pricingViewTracked = false;
    let pricingViewData: any = null;

    page.on('request', (request) => {
      if (
        request.url().includes('/api/tracking/events') &&
        request.method() === 'POST'
      ) {
        const body = request.postDataJSON();
        if (body?.event === 'pricing_view') {
          pricingViewTracked = true;
          pricingViewData = body;
        }
      }
    });

    // Visit courses page (pricing page)
    await page.goto('/courses');

    // Wait for tracking to fire
    await page.waitForTimeout(1000);

    expect(pricingViewTracked).toBe(true);
    expect(pricingViewData.properties.page).toBe('/courses');
  });

  test('should track cta_click when clicking "Enter the Room" button', async ({ page }) => {
    let ctaClickTracked = false;
    let ctaClickData: any = null;

    page.on('request', (request) => {
      if (
        request.url().includes('/api/tracking/events') &&
        request.method() === 'POST'
      ) {
        const body = request.postDataJSON();
        if (body?.event === 'cta_click' && body?.properties?.cta_name === 'hero_enter_the_room') {
          ctaClickTracked = true;
          ctaClickData = body;
        }
      }
    });

    await page.goto('/');

    // Click the "Enter the Room" CTA in hero section
    await page.getByRole('main').getByRole('link', { name: /enter the room/i }).click();

    // Wait a bit for navigation
    await page.waitForTimeout(500);

    expect(ctaClickTracked).toBe(true);
    expect(ctaClickData.properties.cta_name).toBe('hero_enter_the_room');
    expect(ctaClickData.properties.location).toBe('hero');
  });

  test('should track cta_click when clicking "Sign In" button', async ({ page }) => {
    let ctaClickTracked = false;
    let ctaClickData: any = null;

    page.on('request', (request) => {
      if (
        request.url().includes('/api/tracking/events') &&
        request.method() === 'POST'
      ) {
        const body = request.postDataJSON();
        if (body?.event === 'cta_click' && body?.properties?.cta_name === 'hero_sign_in') {
          ctaClickTracked = true;
          ctaClickData = body;
        }
      }
    });

    await page.goto('/');

    // Click the "Sign In" button in hero section (outline variant)
    await page.getByRole('main').getByRole('link', { name: /^sign in$/i }).click();

    // Wait a bit for navigation
    await page.waitForTimeout(500);

    expect(ctaClickTracked).toBe(true);
    expect(ctaClickData.properties.cta_name).toBe('hero_sign_in');
    expect(ctaClickData.properties.location).toBe('hero');
  });

  test('should track cta_click when clicking footer "Step Inside" button', async ({ page }) => {
    let ctaClickTracked = false;
    let ctaClickData: any = null;

    page.on('request', (request) => {
      if (
        request.url().includes('/api/tracking/events') &&
        request.method() === 'POST'
      ) {
        const body = request.postDataJSON();
        if (body?.event === 'cta_click' && body?.properties?.cta_name === 'footer_step_inside') {
          ctaClickTracked = true;
          ctaClickData = body;
        }
      }
    });

    await page.goto('/');

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // Click the footer "Step Inside" CTA
    await page.getByRole('link', { name: /step inside/i }).last().click();

    // Wait a bit for navigation
    await page.waitForTimeout(500);

    expect(ctaClickTracked).toBe(true);
    expect(ctaClickData.properties.cta_name).toBe('footer_step_inside');
    expect(ctaClickData.properties.location).toBe('footer_cta');
  });

  test('should persist UTM parameters across pages', async ({ page }) => {
    // Visit homepage with UTM parameters
    await page.goto('/?utm_source=google&utm_campaign=test');

    // Navigate to courses page
    await page.goto('/courses');

    // Check that attribution cookie was set
    const cookies = await page.context().cookies();
    const attribCookie = cookies.find((c) => c.name === 'p28_attrib');

    expect(attribCookie).toBeDefined();
    expect(attribCookie?.value).toContain('google');
    expect(attribCookie?.value).toContain('test');
  });

  test('should track landing_view only once per page load', async ({ page }) => {
    let landingViewCount = 0;

    page.on('request', (request) => {
      if (
        request.url().includes('/api/tracking/events') &&
        request.method() === 'POST'
      ) {
        const body = request.postDataJSON();
        if (body?.event === 'landing_view') {
          landingViewCount++;
        }
      }
    });

    await page.goto('/?utm_source=test');

    // Wait a bit to ensure no duplicate events
    await page.waitForTimeout(1000);

    expect(landingViewCount).toBe(1);
  });
});
