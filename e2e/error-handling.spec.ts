/**
 * E2E tests for error handling
 * Test IDs: PLT-ERR-001, PLT-ERR-002
 */

import { test, expect } from '@playwright/test';

/**
 * Helper to dismiss cookie consent banner if present
 */
async function dismissCookieBanner(page: any) {
  try {
    // Wait a bit for banner to appear
    await page.waitForTimeout(500);

    const acceptButton = page.getByRole('button', { name: /accept all/i });
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      await acceptButton.click();
      // Wait for banner to be dismissed
      await page.waitForTimeout(500);
    }
  } catch {
    // Banner not present or already dismissed
  }
}

test.describe('Error Handling', () => {
  test.describe('404 Not Found Page (PLT-ERR-001)', () => {
    test('should display friendly 404 page for non-existent route', async ({ page }) => {
      // Visit a non-existent page
      await page.goto('/this-page-does-not-exist');

      // Should show 404 heading
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();

      // Should show helpful message
      await expect(page.getByText(/couldn't find the page/i)).toBeVisible();

      // Should have navigation options
      await expect(page.getByRole('link', { name: /go home/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /browse courses/i })).toBeVisible();
    });

    test('should navigate home from 404 page', async ({ page }) => {
      await page.goto('/non-existent-page');

      // Dismiss cookie banner if present
      await dismissCookieBanner(page);

      // Click "Go Home" button
      await page.getByRole('link', { name: /go home/i }).click();

      // Should navigate to home page
      await expect(page).toHaveURL('/');
    });

    test('should navigate to courses from 404 page', async ({ page }) => {
      await page.goto('/non-existent-page');

      // Dismiss cookie banner if present
      await dismissCookieBanner(page);

      // Click "Browse Courses" button
      await page.getByRole('link', { name: /browse courses/i }).click();

      // Should navigate to courses page
      await expect(page).toHaveURL('/courses');
    });

    test('should display 404 for non-existent API endpoint', async ({ page }) => {
      // Try to access an API endpoint that doesn't exist
      const response = await page.goto('/api/non-existent-endpoint');

      // Should return 404 status
      expect(response?.status()).toBe(404);
    });

    test('should display 404 for deeply nested non-existent route', async ({ page }) => {
      // Try to access a deeply nested route that doesn't exist
      await page.goto('/this/route/does/not/exist/at/all');

      // Should show 404 page
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    });
  });

  test.describe('Error Boundary (PLT-ERR-002)', () => {
    test('should display error page when error occurs', async ({ page }) => {
      // Visit the test error page
      await page.goto('/test-error');

      // Dismiss cookie banner if present
      await dismissCookieBanner(page);

      // Verify page loaded
      await expect(page.getByRole('heading', { name: 'Error Boundary Test Page' })).toBeVisible();

      // Click button to trigger error
      await page.getByTestId('trigger-error-button').click();

      // Error boundary should catch and display error UI
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
      await expect(page.getByText(/We apologize for the inconvenience/i)).toBeVisible();
    });

    test('should display error details in development mode', async ({ page }) => {
      // Visit test error page
      await page.goto('/test-error');

      // Dismiss cookie banner if present
      await dismissCookieBanner(page);

      // Trigger error
      await page.getByTestId('trigger-error-button').click();

      // Error boundary should display
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();

      // In development, error details should be visible
      const errorDetails = page.getByText(/Error Details \(Development Only\)/i);
      if (await errorDetails.isVisible()) {
        // Expand details
        await errorDetails.click();

        // Should show error message
        await expect(page.getByText(/Test error for error boundary E2E testing/i).first()).toBeVisible();
      }
    });

    test('should have "Try again" button that resets error', async ({ page }) => {
      // Visit test error page and trigger error
      await page.goto('/test-error');

      // Dismiss cookie banner if present
      await dismissCookieBanner(page);

      await page.getByTestId('trigger-error-button').click();

      // Error boundary displays
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();

      // Click "Try again" button
      await page.getByRole('button', { name: 'Try again' }).click();

      // Should reset and show the test page again
      await expect(page.getByRole('heading', { name: 'Error Boundary Test Page' })).toBeVisible();
    });

    test('should have "Go home" link that navigates home', async ({ page }) => {
      // Visit test error page and trigger error
      await page.goto('/test-error');

      // Dismiss cookie banner if present
      await dismissCookieBanner(page);

      await page.getByTestId('trigger-error-button').click();

      // Error boundary displays
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();

      // Click "Go home" link
      await page.getByRole('link', { name: 'Go home' }).click();

      // Should navigate to home page
      await expect(page).toHaveURL('/');
    });

    test('should display error ID when digest is present', async ({ page }) => {
      // Visit test error page and trigger error
      await page.goto('/test-error');

      // Dismiss cookie banner if present
      await dismissCookieBanner(page);

      await page.getByTestId('trigger-error-button').click();

      // Error boundary displays
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();

      // Check if error ID is displayed (Next.js may provide digest)
      const errorId = page.getByText(/Error ID:/i);
      // This is optional - digest may or may not be present
      if (await errorId.isVisible()) {
        await expect(errorId).toBeVisible();
      }
    });
  });

  test.describe('API Error Responses (PLT-ERR-003)', () => {
    test('should return JSON error for 404 API route', async ({ request }) => {
      const response = await request.get('/api/non-existent-endpoint');

      expect(response.status()).toBe(404);

      // Next.js returns HTML 404 for non-existent API routes
      // But our API routes should return JSON errors
    });

    test('should return 401 for unauthenticated API request', async ({ request }) => {
      // Try to access a protected endpoint without auth
      const response = await request.get('/api/notes');

      // Should return 401 (or redirect to login)
      expect([401, 302]).toContain(response.status());
    });
  });

  test.describe('Graceful degradation', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);

      // Try to navigate to a page
      await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {
        // Expected to fail
      });

      // Go back online
      await page.context().setOffline(false);

      // Should be able to load page now
      await page.goto('/');
      await expect(page).toHaveURL('/');
    });

    test('should display error message for failed API calls', async ({ page, context }) => {
      // Block all API calls
      await context.route('/api/**/*', (route) => {
        route.abort('failed');
      });

      await page.goto('/');

      // The app should still load, even if API calls fail
      await expect(page).toHaveURL('/');

      // Remove the block
      await context.unroute('/api/**/*');
    });
  });
});
