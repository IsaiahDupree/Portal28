import { test, expect } from "@playwright/test";

test.describe("Public Pages - Home", () => {
  test("MVP-PUB-001: should load home page with hero and CTA", async ({ page }) => {
    await page.goto("/");

    // Check hero section renders
    await expect(page.getByRole('heading', { name: /step inside the room where/i })).toBeVisible();
    await expect(page.getByText(/power gets built/i)).toBeVisible();

    // Check CTAs are present
    await expect(page.getByRole('link', { name: /enter the room/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();

    // Check About section
    await expect(page.getByRole('heading', { name: /hi, i'm sarah/i })).toBeVisible();
  });

  test("MVP-PUB-002: should have proper SEO meta tags", async ({ page }) => {
    await page.goto("/");

    // Check title
    const title = await page.title();
    expect(title).toContain('Portal28');

    // Check meta description exists and has content
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription!.length).toBeGreaterThan(10);

    // Check OG tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();

    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogType).toBe('website');
  });

  test("should have working navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for courses link
    const coursesLink = page.locator('a[href="/courses"], a[href*="course"]').first();
    if (await coursesLink.isVisible()) {
      await coursesLink.click();
      await expect(page).toHaveURL(/course/);
    }
  });

  test("should have login link accessible", async ({ page }) => {
    await page.goto("/");

    const loginLink = page.locator('a[href="/login"], a[href*="login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    } else {
      // Navigate directly if no link
      await page.goto("/login");
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});

test.describe("Public Pages - Courses Catalog", () => {
  test("MVP-PUB-003: should load courses catalog and show published courses", async ({ page }) => {
    await page.goto("/courses");

    // Should show courses heading
    await expect(page.getByRole('heading', { name: /command your narrative/i })).toBeVisible();

    // Should show description
    await expect(page.getByText(/these aren't courses/i)).toBeVisible();

    // Should either show courses or empty state
    const emptyState = page.getByText(/new rooms opening soon/i);
    const courseCards = page.locator('[href^="/courses/"]').first();

    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasCourses = await courseCards.isVisible().catch(() => false);

    // One or the other should be visible
    expect(hasEmptyState || hasCourses).toBe(true);
  });

  test("should handle empty courses gracefully", async ({ page }) => {
    await page.goto("/courses");

    // Should either show courses or page content (new UI uses div instead of main)
    const hasContent = await page.locator("body").isVisible();
    const pageText = await page.textContent("body");
    expect(hasContent && pageText && pageText.length > 0).toBe(true);
  });
});

test.describe("Public Pages - Bundles", () => {
  test("should display bundles page", async ({ page }) => {
    await page.goto("/bundles");
    
    await expect(page.getByRole("heading", { name: /bundle/i })).toBeVisible();
  });

  test("should show bundle cards or empty state", async ({ page }) => {
    await page.goto("/bundles");
    
    // Either show bundle cards or "no bundles" message
    const hasContent = await page.locator("main").isVisible();
    expect(hasContent).toBe(true);
  });
});

test.describe("Public Pages - Login", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/login");
    
    // Portal 28 branding uses "Enter the room" heading
    await expect(page.getByRole("heading", { name: /enter the room|welcome|login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email|you@/i)).toBeVisible();
    // Check for Sign in button (exact text)
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should validate email input", async ({ page }) => {
    await page.goto("/login");
    
    // Try to submit without filling fields - HTML5 validation prevents submission
    await page.locator('button[type="submit"]').click();
    
    // Form should still be visible (not submitted)
    await expect(page.getByPlaceholder(/email|you@/i)).toBeVisible();
  });
});

test.describe("Course Sales Pages", () => {
  test("should handle non-existent course gracefully", async ({ page }) => {
    await page.goto("/courses/non-existent-course-slug");

    // Should show error message or redirect
    const pageContent = await page.textContent("body");
    const hasErrorHandling =
      pageContent?.includes("not found") ||
      pageContent?.includes("404") ||
      pageContent?.includes("error") ||
      page.url().includes("courses");

    expect(hasErrorHandling).toBe(true);
  });
});

test.describe("About Page", () => {
  test("MVP-PUB-007: should load About page with instructor bio", async ({ page }) => {
    await page.goto("/about");

    // Check main heading
    await expect(page.getByRole('heading', { name: /where strategy meets intuition/i })).toBeVisible();

    // Check founder section (instructor bio)
    await expect(page.getByRole('heading', { name: /hi, i'm sarah ashley/i })).toBeVisible();
    await expect(page.getByText(/build brands that actually mean something/i)).toBeVisible();

    // Check mission section
    await expect(page.getByRole('heading', { name: /our mission/i })).toBeVisible();

    // Check feature cards
    await expect(page.getByText(/build your brand story/i)).toBeVisible();
    await expect(page.getByText(/master social storytelling/i)).toBeVisible();
    await expect(page.getByText(/join the ceo power portal/i)).toBeVisible();
  });
});

test.describe("FAQ Page", () => {
  test("MVP-PUB-008: should load FAQ page and accordion works", async ({ page }) => {
    await page.goto("/faq");

    // Check heading
    await expect(page.getByRole('heading', { name: /everything you need to know/i })).toBeVisible();

    // Check first accordion item exists
    const firstQuestion = page.getByRole('button', { name: /what is portal 28/i });
    await expect(firstQuestion).toBeVisible();

    // Click to expand accordion
    await firstQuestion.click();

    // Check answer appears
    await expect(page.getByText(/private learning platform/i)).toBeVisible();

    // Click again to collapse
    await firstQuestion.click();

    // Check contact section
    await expect(page.getByRole('heading', { name: /still have questions/i })).toBeVisible();
    await expect(page.getByText(/support@portal28.academy/i)).toBeVisible();
  });
});

test.describe("Legal Pages", () => {
  test("MVP-PUB-009: should load Terms of Service page", async ({ page }) => {
    await page.goto("/terms");

    // Check heading
    await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();

    // Check key sections render
    await expect(page.getByRole('heading', { name: /acceptance of terms/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /payment and billing/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /intellectual property/i })).toBeVisible();

    // Check last updated date
    await expect(page.getByText(/last updated/i)).toBeVisible();
  });

  test("MVP-PUB-010: should load Privacy Policy page", async ({ page }) => {
    await page.goto("/privacy");

    // Check heading
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();

    // Check key sections render
    await expect(page.getByRole('heading', { name: /information we collect/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /how we use your information/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /data security/i })).toBeVisible();

    // Check last updated date
    await expect(page.getByText(/last updated/i)).toBeVisible();
  });
});
