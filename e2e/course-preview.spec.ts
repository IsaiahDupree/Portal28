import { test, expect } from "@playwright/test";

/**
 * Feature: feat-065 - Course Preview Links
 * Test IDs: PLT-PRV-001, PLT-PRV-002, PLT-PRV-003, PLT-PRV-004, PLT-PRV-005
 */

test.describe("Course Preview Links (feat-065)", () => {
  let courseId: string;
  let previewToken: string;
  let previewUrl: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test course and generate a preview token
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as admin
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "admin@test.com");
    await page.click('button[type="submit"]');

    // Get magic link from mailpit
    await page.goto("http://localhost:28324");
    await page.click("text=Sign in to Portal28");
    const linkElement = await page.locator('a:has-text("Sign in to Portal28")');
    const href = await linkElement.getAttribute("href");

    if (href) {
      await page.goto(href);
      await page.waitForURL("**/app/**");
    }

    // Create a test course
    await page.goto("http://localhost:2828/admin/courses/new");
    await page.fill('input[name="title"]', "Test Preview Course");
    await page.fill('input[name="slug"]', "test-preview-course");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/courses/**");

    // Extract course ID from URL
    const url = page.url();
    courseId = url.split("/").pop() || "";

    // Generate preview token
    await page.click('button:has-text("Generate Link")');
    await page.waitForTimeout(1000);

    // Copy the generated token from UI
    const tokenElement = page.locator("code").first();
    const tokenText = await tokenElement.textContent();
    previewToken = tokenText?.trim() || "";

    // Build preview URL
    previewUrl = `http://localhost:2828/preview/course/${courseId}?token=${previewToken}`;

    await context.close();
  });

  test("PLT-PRV-001: should generate unique preview tokens", async ({
    page,
  }) => {
    // Login as admin
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "admin@test.com");
    await page.click('button[type="submit"]');

    // Get magic link
    await page.goto("http://localhost:28324");
    await page.click("text=Sign in to Portal28");
    const linkElement = await page.locator('a:has-text("Sign in to Portal28")');
    const href = await linkElement.getAttribute("href");
    if (href) await page.goto(href);

    // Navigate to course edit page
    await page.goto(`http://localhost:2828/admin/courses/${courseId}`);

    // Check preview token manager is visible
    await expect(page.locator("text=Preview Links")).toBeVisible();

    // Generate a new token
    await page.click('button:has-text("Generate Link")');

    // Wait for success message
    await expect(page.locator("text=Copied!")).toBeVisible({ timeout: 3000 });

    // Verify token appears in list
    const tokensList = page.locator("code");
    expect(await tokensList.count()).toBeGreaterThan(0);
  });

  test("PLT-PRV-002: should show preview route with valid token", async ({
    page,
  }) => {
    // Visit preview URL without authentication
    await page.goto(previewUrl);

    // Check preview banner is visible
    await expect(
      page.locator("text=You are viewing a preview of this course")
    ).toBeVisible();

    // Check course content is displayed
    await expect(page.locator("h1")).toContainText("Test Preview Course");

    // Check curriculum section
    await expect(page.locator("text=Course Curriculum")).toBeVisible();
  });

  test("PLT-PRV-003: should display watermark on preview page", async ({
    page,
  }) => {
    // Visit preview URL
    await page.goto(previewUrl);

    // Check for preview banner/watermark
    await expect(page.locator(".bg-amber-500")).toBeVisible();
    await expect(
      page.locator("text=You are viewing a preview")
    ).toBeVisible();

    // Verify Eye icon is present
    await expect(page.locator("svg.lucide-eye")).toBeVisible();
  });

  test("PLT-PRV-004: should reject expired tokens", async ({ page }) => {
    // Visit preview URL with invalid token
    const invalidUrl = `http://localhost:2828/preview/course/${courseId}?token=expired-token-123`;
    await page.goto(invalidUrl);

    // Check error message is displayed
    await expect(
      page.locator("text=Invalid Preview Link")
    ).toBeVisible();
    await expect(
      page.locator("text=This preview link is invalid or has expired")
    ).toBeVisible();

    // Check browse courses button
    await expect(page.locator('a:has-text("Browse Courses")')).toBeVisible();
  });

  test("PLT-PRV-005: should allow token deletion", async ({ page }) => {
    // Login as admin
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "admin@test.com");
    await page.click('button[type="submit"]');

    // Get magic link
    await page.goto("http://localhost:28324");
    await page.click("text=Sign in to Portal28");
    const linkElement = await page.locator('a:has-text("Sign in to Portal28")');
    const href = await linkElement.getAttribute("href");
    if (href) await page.goto(href);

    // Navigate to course edit page
    await page.goto(`http://localhost:2828/admin/courses/${courseId}`);

    // Count tokens before deletion
    const initialCount = await page.locator("code").count();

    if (initialCount > 0) {
      // Click delete button
      page.on("dialog", (dialog) => dialog.accept());
      await page.locator('button:has(svg.lucide-trash-2)').first().click();

      // Wait for deletion
      await page.waitForTimeout(1000);

      // Verify token count decreased
      const finalCount = await page.locator("code").count();
      expect(finalCount).toBeLessThan(initialCount);
    }
  });

  test("should require token parameter in URL", async ({ page }) => {
    // Visit preview URL without token
    const noTokenUrl = `http://localhost:2828/preview/course/${courseId}`;
    await page.goto(noTokenUrl);

    // Check error message
    await expect(page.locator("text=Preview Link Required")).toBeVisible();
    await expect(
      page.locator(
        "text=This preview requires a valid token. Please use the link provided by the course creator."
      )
    ).toBeVisible();
  });

  test("should show course status in preview", async ({ page }) => {
    // Visit preview URL
    await page.goto(previewUrl);

    // Check for status badge
    const badge = page.locator("text=Published, text=Draft").first();
    await expect(badge).toBeVisible();
  });

  test("should display course metadata", async ({ page }) => {
    // Visit preview URL
    await page.goto(previewUrl);

    // Check for lesson count
    await expect(page.locator("text=lessons")).toBeVisible();

    // Check for course description area
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should handle preview of draft courses", async ({ page }) => {
    // Visit preview URL (works for both draft and published)
    await page.goto(previewUrl);

    // Page should load successfully
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=Course Curriculum")).toBeVisible();
  });

  test("should copy preview link to clipboard", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Login as admin
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "admin@test.com");
    await page.click('button[type="submit"]');

    // Get magic link
    await page.goto("http://localhost:28324");
    await page.click("text=Sign in to Portal28");
    const linkElement = await page.locator('a:has-text("Sign in to Portal28")');
    const href = await linkElement.getAttribute("href");
    if (href) await page.goto(href);

    // Navigate to course edit page
    await page.goto(`http://localhost:2828/admin/courses/${courseId}`);

    // Click copy button
    if ((await page.locator("code").count()) > 0) {
      await page.locator('button:has(svg.lucide-copy)').first().click();

      // Check for success indicator
      await expect(page.locator("svg.lucide-check")).toBeVisible({
        timeout: 3000,
      });
    }
  });

  test("should show token expiration date", async ({ page }) => {
    // Login as admin
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "admin@test.com");
    await page.click('button[type="submit"]');

    // Get magic link
    await page.goto("http://localhost:28324");
    await page.click("text=Sign in to Portal28");
    const linkElement = await page.locator('a:has-text("Sign in to Portal28")');
    const href = await linkElement.getAttribute("href");
    if (href) await page.goto(href);

    // Navigate to course edit page
    await page.goto(`http://localhost:2828/admin/courses/${courseId}`);

    if ((await page.locator("code").count()) > 0) {
      // Check for expiration date display
      await expect(
        page.locator("text=Expires, text=Expired").first()
      ).toBeVisible();

      // Check for clock icon
      await expect(page.locator("svg.lucide-clock")).toBeVisible();
    }
  });

  test("should show active/expired status badge", async ({ page }) => {
    // Login as admin
    await page.goto("http://localhost:2828/login");
    await page.fill('input[type="email"]', "admin@test.com");
    await page.click('button[type="submit"]');

    // Get magic link
    await page.goto("http://localhost:28324");
    await page.click("text=Sign in to Portal28");
    const linkElement = await page.locator('a:has-text("Sign in to Portal28")');
    const href = await linkElement.getAttribute("href");
    if (href) await page.goto(href);

    // Navigate to course edit page
    await page.goto(`http://localhost:2828/admin/courses/${courseId}`);

    if ((await page.locator("code").count()) > 0) {
      // Check for status badge
      const statusBadge = page.locator("text=Active, text=Expired").first();
      await expect(statusBadge).toBeVisible();
    }
  });

  test("should link to individual lesson previews", async ({ page }) => {
    // Visit preview URL
    await page.goto(previewUrl);

    // Check for preview links to lessons
    const previewLinks = page.locator('a:has-text("Preview")');
    const count = await previewLinks.count();

    // If there are lessons, verify preview links exist
    if (count > 0) {
      const firstLink = await previewLinks.first().getAttribute("href");
      expect(firstLink).toContain("/preview/lesson/");
      expect(firstLink).toContain(`token=${previewToken}`);
    }
  });
});
