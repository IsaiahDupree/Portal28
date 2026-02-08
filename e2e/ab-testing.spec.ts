import { test, expect } from "@playwright/test";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2828";
const ADMIN_EMAIL = "admin@portal28.test";
const ADMIN_PASSWORD = "testpassword123";

test.describe("A/B Testing Framework", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/app**`);
  });

  test("VID-ABT-001: Admin can create A/B test with multiple variants", async ({ page }) => {
    // Navigate to A/B tests admin
    await page.goto(`${BASE_URL}/admin/ab-tests`);

    // Click New Test button
    await page.click('text=New Test');

    // Fill in test details
    await page.fill('input[name="name"]', 'Pricing Test - $99 vs $149');
    await page.fill('textarea[name="description"]', 'Test different price points for Course A');
    await page.fill('textarea[name="hypothesis"]', 'Higher price will maintain conversion rate');
    await page.selectOption('select[name="test_type"]', 'pricing');

    // Add control variant
    await page.fill('input[name="variants[0].name"]', 'Control - $99');
    await page.check('input[name="variants[0].is_control"]');
    await page.fill('input[name="variants[0].traffic_weight"]', '50');

    // Add treatment variant
    await page.click('text=Add Variant');
    await page.fill('input[name="variants[1].name"]', 'Treatment - $149');
    await page.fill('input[name="variants[1].traffic_weight"]', '50');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=Pricing Test - $99 vs $149')).toBeVisible();
    await expect(page.locator('text=Draft')).toBeVisible();
  });

  test("VID-ABT-002: Users are randomly assigned to variants", async ({ page, context }) => {
    // Create a test via API first
    const testId = await createTestViaAPI(page);

    // Activate the test
    await page.goto(`${BASE_URL}/admin/ab-tests/${testId}`);
    await page.click('button:has-text("Activate")');
    await expect(page.locator('text=Active')).toBeVisible();

    // Test variant assignment with multiple users
    const assignments: string[] = [];

    for (let i = 0; i < 10; i++) {
      // Create new incognito context for each "user"
      const userContext = await context.browser()!.newContext();
      const userPage = await userContext.newPage();

      // Request variant assignment
      const response = await userPage.request.post(`${BASE_URL}/api/ab-tests/assign`, {
        data: {
          test_id: testId,
          anon_id: `anon-user-${i}`,
        },
      });

      const data = await response.json();
      expect(response.status()).toBe(201);
      expect(data.included).toBe(true);
      expect(data.variant).toBeDefined();

      assignments.push(data.variant.id);

      await userContext.close();
    }

    // Verify random distribution (not all same variant)
    const uniqueVariants = new Set(assignments);
    expect(uniqueVariants.size).toBeGreaterThan(1);
  });

  test("VID-ABT-003: System tracks conversions per variant and calculates metrics", async ({ page }) => {
    // Create and activate test
    const testId = await createTestViaAPI(page);
    await page.goto(`${BASE_URL}/admin/ab-tests/${testId}`);
    await page.click('button:has-text("Activate")');

    // Get variants
    const variantsResponse = await page.request.get(
      `${BASE_URL}/api/admin/ab-tests/${testId}`
    );
    const { test } = await variantsResponse.json();
    const controlVariant = test.variants.find((v: any) => v.is_control);
    const treatmentVariant = test.variants.find((v: any) => !v.is_control);

    // Simulate user assignments and conversions
    const testData = [
      { variantId: controlVariant.id, conversions: 10, impressions: 100 },
      { variantId: treatmentVariant.id, conversions: 15, impressions: 100 },
    ];

    for (const data of testData) {
      // Create assignments
      for (let i = 0; i < data.impressions; i++) {
        await page.request.post(`${BASE_URL}/api/ab-tests/assign`, {
          data: {
            test_id: testId,
            anon_id: `user-${data.variantId}-${i}`,
          },
        });
      }

      // Track conversions
      for (let i = 0; i < data.conversions; i++) {
        await page.request.post(`${BASE_URL}/api/ab-tests/track`, {
          data: {
            test_id: testId,
            variant_id: data.variantId,
            event_type: "purchase",
            event_value: 99.99,
            anon_id: `user-${data.variantId}-${i}`,
          },
        });
      }
    }

    // Calculate metrics
    await page.request.post(`${BASE_URL}/api/admin/ab-tests/${testId}/metrics`);

    // View metrics in admin
    await page.reload();

    // Verify metrics displayed
    await expect(page.locator('text=Conversion Rate')).toBeVisible();
    await expect(page.locator('text=10%')).toBeVisible(); // Control: 10/100
    await expect(page.locator('text=15%')).toBeVisible(); // Treatment: 15/100
  });

  test("Admin can pause and complete tests", async ({ page }) => {
    const testId = await createTestViaAPI(page);

    await page.goto(`${BASE_URL}/admin/ab-tests/${testId}`);

    // Activate test
    await page.click('button:has-text("Activate")');
    await expect(page.locator('text=Active')).toBeVisible();

    // Pause test
    await page.click('button:has-text("Pause")');
    await expect(page.locator('text=Paused')).toBeVisible();

    // Complete test
    await page.click('button:has-text("Complete")');
    await expect(page.locator('text=Completed')).toBeVisible();
  });

  test("Admin can view test results and select winner", async ({ page }) => {
    const testId = await createTestViaAPI(page);

    await page.goto(`${BASE_URL}/admin/ab-tests/${testId}`);
    await page.click('button:has-text("Activate")');

    // Simulate some test data
    // ... (similar to VID-ABT-003)

    // Navigate to results
    await page.click('text=View Results');

    // Verify results page
    await expect(page.locator('h2:has-text("Test Results")')).toBeVisible();
    await expect(page.locator('text=Statistical Significance')).toBeVisible();

    // Select winner
    await page.click('button:has-text("Select as Winner"):first');

    // Confirm selection
    await page.click('button:has-text("Confirm")');

    // Verify winner selected
    await expect(page.locator('text=Winner')).toBeVisible();
  });

  test("Traffic allocation controls percentage of users included", async ({ page }) => {
    // Create test with 50% traffic allocation
    const testData = {
      name: "Limited Traffic Test",
      test_type: "landing_page",
      traffic_allocation: 50,
      variants: [
        { name: "Control", is_control: true, traffic_weight: 50, config: {} },
        { name: "Variant A", is_control: false, traffic_weight: 50, config: {} },
      ],
    };

    const createResponse = await page.request.post(
      `${BASE_URL}/api/admin/ab-tests`,
      { data: testData }
    );
    const { test } = await createResponse.json();

    // Activate test
    await page.request.patch(`${BASE_URL}/api/admin/ab-tests/${test.id}`, {
      data: { status: "active" },
    });

    // Test assignments
    let includedCount = 0;
    const totalAttempts = 100;

    for (let i = 0; i < totalAttempts; i++) {
      const response = await page.request.post(`${BASE_URL}/api/ab-tests/assign`, {
        data: {
          test_id: test.id,
          anon_id: `traffic-test-user-${i}`,
        },
      });

      const data = await response.json();
      if (data.included) {
        includedCount++;
      }
    }

    // Verify approximately 50% inclusion (with some margin)
    expect(includedCount).toBeGreaterThan(30);
    expect(includedCount).toBeLessThan(70);
  });
});

// Helper function to create test via API
async function createTestViaAPI(page: any): Promise<string> {
  const testData = {
    name: "E2E Test - " + Date.now(),
    description: "Test created for E2E testing",
    test_type: "pricing",
    variants: [
      {
        name: "Control",
        is_control: true,
        traffic_weight: 50,
        config: { price: 99 },
      },
      {
        name: "Treatment",
        is_control: false,
        traffic_weight: 50,
        config: { price: 149 },
      },
    ],
  };

  const response = await page.request.post(
    `${BASE_URL}/api/admin/ab-tests`,
    { data: testData }
  );

  const { test } = await response.json();
  return test.id;
}
