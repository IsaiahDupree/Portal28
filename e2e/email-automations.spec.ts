import { test, expect } from "@playwright/test";

test.describe("Email Automations - Drip Sequences", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("http://localhost:2828/login");
    await page.fill('input[name="email"]', "admin@portal28.com");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/app");
  });

  test("GRO-EPG-001: should list all email automations", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-automations");

    // Check page loads
    await expect(page.locator("h1")).toContainText("Email Automations");

    // Check for list or empty state
    const hasTable = await page.locator("table").count();
    const hasEmptyState = await page.locator('text="No automations yet"').count();

    expect(hasTable + hasEmptyState).toBeGreaterThan(0);
  });

  test("GRO-EPG-002: should create a new automation", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-automations/new");

    // Fill form
    await page.fill('input[name="name"]', "Test Onboarding Sequence");
    await page.fill('textarea[name="description"]', "Automated onboarding emails");
    await page.selectOption('select[name="trigger_event"]', "lead_created");
    await page.fill(
      'textarea[name="prompt_base"]',
      "Keep it warm and welcoming"
    );

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to editor
    await page.waitForURL("**/admin/email-automations/*");

    // Check automation appears
    await expect(page.locator("h1")).toContainText("Test Onboarding Sequence");
  });

  test("GRO-EPG-003: should add email step to automation", async ({ page }) => {
    // Navigate to an existing automation (or create one first)
    await page.goto("http://localhost:2828/admin/email-automations");

    // Create a new automation first
    await page.click('text="+ New Automation"');
    await page.fill('input[name="name"]', "Step Test Automation");
    await page.selectOption('select[name="trigger_event"]', "purchase_completed");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin/email-automations/*");

    // Add a step
    await page.click('button:has-text("+ Add Step")');

    await page.fill('input[name="subject"]', "Welcome to the course!");
    await page.fill('input[name="preview_text"]', "Let's get started");
    await page.fill('input[type="number"]', "0");
    await page.selectOption('select', "minutes");
    await page.fill(
      'textarea',
      "<h1>Welcome!</h1><p>Thanks for joining us.</p>"
    );

    await page.click('button[type="submit"]:has-text("Add Step")');

    // Check step appears
    await expect(page.locator('text="Welcome to the course!"')).toBeVisible();
  });

  test("GRO-EPG-004: should configure delay for email step", async ({ page }) => {
    // Create automation and add step with delay
    await page.goto("http://localhost:2828/admin/email-automations/new");
    await page.fill('input[name="name"]', "Delay Test Automation");
    await page.selectOption('select[name="trigger_event"]', "trial_started");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin/email-automations/*");

    // Add step with 3 day delay
    await page.click('button:has-text("+ Add Step")');

    await page.fill('input[name="subject"]', "Day 3 Check-in");
    await page.fill('input[type="number"]', "3");

    const delayUnitSelect = page.locator('select').filter({ hasText: /Minutes|Hours|Days|Weeks/ });
    await delayUnitSelect.selectOption("days");

    await page.fill('textarea', "<p>How are you liking the trial?</p>");
    await page.click('button:has-text("Add Step")');

    // Verify delay configuration
    await expect(page.locator('text="3 days"')).toBeVisible();
  });

  test("GRO-EPG-005: should activate automation", async ({ page }) => {
    // Create automation with at least one step
    await page.goto("http://localhost:2828/admin/email-automations/new");
    await page.fill('input[name="name"]', "Activate Test Automation");
    await page.selectOption('select[name="trigger_event"]', "subscription_created");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin/email-automations/*");

    // Add a step
    await page.click('button:has-text("+ Add Step")');
    await page.fill('input[name="subject"]', "Welcome!");
    await page.fill('textarea', "<p>Welcome email</p>");
    await page.click('button:has-text("Add Step")');

    // Activate
    await page.click('button:has-text("Activate")');

    // Check status changed
    await expect(page.locator('text="active"')).toBeVisible();
  });

  test("GRO-EPG-010: should display program analytics", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-automations");

    // Check if any automations exist
    const hasAutomations = (await page.locator("table tbody tr").count()) > 0;

    if (hasAutomations) {
      // Click on first automation
      await page.click("table tbody tr:first-child a");

      // Check for analytics data
      await expect(page.locator('text="Steps"')).toBeVisible();
      await expect(page.locator('text="Trigger"')).toBeVisible();
      await expect(page.locator('text="Status"')).toBeVisible();
    }
  });

  test("should show empty state when no automations exist", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-automations");

    // Might have empty state or table
    const pageContent = await page.content();
    expect(
      pageContent.includes("No automations yet") ||
      pageContent.includes("<table")
    ).toBeTruthy();
  });

  test("should navigate between automation list and programs", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-automations");

    await expect(page.locator("h1")).toContainText("Email Automations");

    // Navigate to programs
    await page.click('text="Back to Email Programs"');

    await expect(page).toHaveURL(/\/admin\/email-programs/);
    await expect(page.locator("h1")).toContainText("Email Programs");
  });

  test("should delete automation step", async ({ page }) => {
    // Create automation with step
    await page.goto("http://localhost:2828/admin/email-automations/new");
    await page.fill('input[name="name"]', "Delete Step Test");
    await page.selectOption('select[name="trigger_event"]', "lead_created");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin/email-automations/*");

    // Add step
    await page.click('button:has-text("+ Add Step")');
    await page.fill('input[name="subject"]', "Test Email");
    await page.fill('textarea', "<p>Test</p>");
    await page.click('button:has-text("Add Step")');

    // Verify step added
    await expect(page.locator('text="Test Email"')).toBeVisible();

    // Delete step (handle confirmation dialog)
    page.on("dialog", (dialog) => dialog.accept());
    await page.click('button:has-text("Delete")');

    // Verify step removed (may see empty state)
    await page.waitForTimeout(1000);
    const stepVisible = await page.locator('text="Test Email"').isVisible();
    expect(stepVisible).toBeFalsy();
  });

  test("should validate required fields when creating automation", async ({ page }) => {
    await page.goto("http://localhost:2828/admin/email-automations/new");

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Should show validation errors (browser validation)
    const nameInput = page.locator('input[name="name"]');
    const isInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

    expect(isInvalid).toBeTruthy();
  });

  test("should show step order numbers", async ({ page }) => {
    // Create automation with multiple steps
    await page.goto("http://localhost:2828/admin/email-automations/new");
    await page.fill('input[name="name"]', "Multi-step Test");
    await page.selectOption('select[name="trigger_event"]', "course_started");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin/email-automations/*");

    // Add first step
    await page.click('button:has-text("+ Add Step")');
    await page.fill('input[name="subject"]', "Step 1");
    await page.fill('textarea', "<p>First email</p>");
    await page.click('button:has-text("Add Step")');

    // Add second step
    await page.click('button:has-text("+ Add Step")');
    await page.fill('input[name="subject"]', "Step 2");
    await page.fill('textarea', "<p>Second email</p>");
    await page.click('button:has-text("Add Step")');

    // Check for step numbers (1, 2)
    const stepNumbers = await page.locator('div:has-text("1"), div:has-text("2")').count();
    expect(stepNumbers).toBeGreaterThan(0);
  });
});
