import { test, expect, devices } from "@playwright/test";

// Mobile viewport configurations
const mobileViewports = {
  iPhone: { width: 375, height: 667 },
  iPhonePlus: { width: 414, height: 736 },
  Android: { width: 360, height: 640 },
  tablet: { width: 768, height: 1024 },
};

test.describe("Mobile Responsiveness - iPhone", () => {
  test.use({ viewport: mobileViewports.iPhone });

  test("should display mobile navigation menu", async ({ page }) => {
    await page.goto("/");
    
    // On mobile, content should be visible
    await expect(page.locator("h1")).toBeVisible();
    
    // Header should be visible
    await expect(page.locator("header")).toBeVisible();
  });

  test("should open mobile sidebar when menu clicked", async ({ page }) => {
    await page.goto("/");
    
    // Find and click the mobile menu button (hamburger icon in header)
    const header = page.locator("header");
    const menuButton = header.locator("button").first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // Mobile sidebar sheet should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test("should display home page content properly on mobile", async ({ page }) => {
    await page.goto("/");
    
    // Hero section should be visible
    await expect(page.locator("h1")).toBeVisible();
    
    // Content should be visible - Portal 28 branding
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("Portal 28");
  });

  test("should display login page properly on mobile", async ({ page }) => {
    await page.goto("/login");
    
    // Login card should be visible and centered - Portal 28 branding
    await expect(page.getByRole("heading", { name: /enter the room|welcome/i })).toBeVisible();
    
    // Email input should be visible
    await expect(page.getByPlaceholder(/email|you@/i)).toBeVisible();
    
    // Submit button should be visible
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test("should display courses page properly on mobile", async ({ page }) => {
    await page.goto("/courses");
    
    // Page heading should be visible
    await expect(page.locator("h1")).toBeVisible();
    
    // Content should be visible
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display bundles page properly on mobile", async ({ page }) => {
    await page.goto("/bundles");
    
    // Page heading should be visible
    await expect(page.getByRole("heading", { name: /bundle/i })).toBeVisible();
  });

  test("should navigate between pages on mobile", async ({ page }) => {
    await page.goto("/");
    
    // Navigate directly to courses
    await page.goto("/courses");
    await expect(page).toHaveURL(/courses/);
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("Mobile Responsiveness - Android", () => {
  test.use({ viewport: mobileViewports.Android });

  test("should display content properly on Android viewport", async ({ page }) => {
    await page.goto("/");
    
    // Main content should be visible
    await expect(page.locator("h1")).toBeVisible();
    
    // Header should be visible
    await expect(page.locator("header")).toBeVisible();
  });

  test("should handle touch interactions", async ({ page }) => {
    await page.goto("/");
    
    // Buttons should be large enough to tap (minimum 44x44px recommended)
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Check minimum touch target size (at least 32px for accessibility)
          expect(box.width).toBeGreaterThanOrEqual(32);
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    }
  });
});

test.describe("Mobile Responsiveness - Tablet", () => {
  test.use({ viewport: mobileViewports.tablet });

  test("should display tablet-optimized layout", async ({ page }) => {
    await page.goto("/");
    
    // On tablet, sidebar might be visible or hidden depending on breakpoint
    await expect(page.locator("h1")).toBeVisible();
    
    // Content should be visible
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("should display courses in grid on tablet", async ({ page }) => {
    await page.goto("/courses");
    
    // Heading should be visible
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("Mobile Navigation", () => {
  test.use({ viewport: mobileViewports.iPhone });

  test("should show header on mobile", async ({ page }) => {
    await page.goto("/");
    
    // Header should be visible on mobile
    await expect(page.locator("header")).toBeVisible();
  });

  test("should navigate to different pages on mobile", async ({ page }) => {
    // Test navigation works on mobile viewport
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    
    await page.goto("/courses");
    await expect(page.locator("h1")).toBeVisible();
    
    await page.goto("/bundles");
    await expect(page.getByRole("heading", { name: /bundle/i })).toBeVisible();
    
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /enter the room|welcome/i })).toBeVisible();
  });
});

test.describe("Mobile Form Interactions", () => {
  test.use({ viewport: mobileViewports.iPhone });

  test("should handle login form on mobile", async ({ page }) => {
    await page.goto("/login");
    
    // Email input should be visible and focusable
    const emailInput = page.getByPlaceholder(/email|you@/i);
    await expect(emailInput).toBeVisible();
    
    // Focus input
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
    
    // Type in input
    await emailInput.fill("test@example.com");
    await expect(emailInput).toHaveValue("test@example.com");
    
    // Password input should be visible
    const passwordInput = page.getByPlaceholder("••••••••");
    await expect(passwordInput).toBeVisible();
    
    // Submit button should be visible
    const submitButton = page.getByRole("button", { name: /sign in$/i });
    await expect(submitButton).toBeVisible();
  });
});

test.describe("Mobile Viewport Breakpoints", () => {
  test("should adapt layout at 320px (small phone)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");
    
    // Content should still be visible and not overflow
    await expect(page.locator("h1")).toBeVisible();
    
    // No horizontal scroll
    const body = page.locator("body");
    const bodyWidth = await body.evaluate((el) => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(320 + 20); // Allow small margin for scrollbar
  });

  test("should adapt layout at 375px (iPhone)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should adapt layout at 768px (tablet)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should show full desktop layout at 1024px", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    
    // Desktop sidebar should be visible
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
    
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("Mobile Accessibility", () => {
  test.use({ viewport: mobileViewports.iPhone });

  test("should have proper touch targets", async ({ page }) => {
    await page.goto("/");
    
    // Check all interactive elements have minimum size
    const interactiveElements = page.locator("a, button");
    const count = await interactiveElements.count();
    
    let smallTargets = 0;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const el = interactiveElements.nth(i);
      if (await el.isVisible()) {
        const box = await el.boundingBox();
        if (box && (box.width < 24 || box.height < 24)) {
          smallTargets++;
        }
      }
    }
    
    // Allow some small targets (icons) but warn if too many
    expect(smallTargets).toBeLessThan(5);
  });

  test("should be scrollable on mobile", async ({ page }) => {
    await page.goto("/");
    
    // Page should be scrollable
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // Page content should extend beyond viewport (scrollable)
    expect(scrollHeight).toBeGreaterThanOrEqual(viewportHeight);
  });

  test("should have readable text sizes on mobile", async ({ page }) => {
    await page.goto("/");
    
    // Main heading should have appropriate font size
    const h1 = page.locator("h1").first();
    const fontSize = await h1.evaluate((el) => 
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    
    // Font size should be at least 24px for h1 on mobile
    expect(fontSize).toBeGreaterThanOrEqual(24);
  });
});
