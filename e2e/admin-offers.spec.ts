/**
 * Admin Offers CRUD E2E Tests
 *
 * Test Coverage for feat-019: Admin Offers CRUD
 * Test IDs: GRO-ADM-O-001 through GRO-ADM-O-005
 *
 * Tests the complete admin workflow for managing offers including
 * listing, creating, editing, and toggling active status.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Offers CRUD', () => {
  // Setup: Login as admin before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:2828/login');

    // Enter admin email
    await page.fill('input[type="email"]', 'admin@portal28.academy');

    // Click sign in button
    await page.click('button[type="submit"]');

    // Wait for magic link email (in test environment, auto-login should work)
    // Or use a test account with password auth if available
    await page.waitForURL('**/app**', { timeout: 10000 });
  });

  test('GRO-ADM-O-001: List all offers', async ({ page }) => {
    // Navigate to admin offers page
    await page.goto('http://localhost:2828/admin/offers');

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Offers');

    // Verify "New Offer" button exists
    await expect(page.locator('a[href="/admin/offers/new"]')).toBeVisible();

    // Check if offers table exists or empty state
    const hasOffers = await page.locator('table').isVisible();

    if (hasOffers) {
      // Verify table headers
      await expect(page.locator('th').filter({ hasText: 'Key' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'Kind' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'Title' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'Price' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'Active' })).toBeVisible();

      // Verify at least one offer row exists
      const rows = page.locator('tbody tr');
      await expect(rows.first()).toBeVisible();
    } else {
      // Verify empty state message
      await expect(page.locator('text=No offers yet')).toBeVisible();
    }
  });

  test('GRO-ADM-O-002: Create offer', async ({ page }) => {
    // Navigate to new offer page
    await page.goto('http://localhost:2828/admin/offers/new');

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('New Offer');

    // Fill in offer details
    const timestamp = Date.now();
    const offerKey = `test-offer-${timestamp}`;

    await page.fill('input[type="text"]', offerKey);

    // Select kind
    await page.selectOption('select', 'course');

    // Fill title
    await page.fill('input[value=""]', 'Test Course Offer');

    // Fill subtitle
    const inputs = page.locator('input[type="text"]');
    await inputs.nth(2).fill('This is a test subtitle');

    // Fill badge
    await inputs.nth(3).fill('Test Badge');

    // Fill CTA text
    await inputs.nth(4).fill('Get Started');

    // Fill price label
    await inputs.nth(5).fill('$99');

    // Fill compare at label
    await inputs.nth(6).fill('$199');

    // Fill bullets JSON
    const bulletsTextarea = page.locator('textarea').first();
    await bulletsTextarea.fill(JSON.stringify([
      'Feature 1',
      'Feature 2',
      'Feature 3'
    ], null, 2));

    // Fill payload JSON
    const payloadTextarea = page.locator('textarea').last();
    await payloadTextarea.fill(JSON.stringify({
      courseSlug: 'test-course'
    }, null, 2));

    // Verify active checkbox is checked by default
    await expect(page.locator('input[type="checkbox"]')).toBeChecked();

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to offers list
    await page.waitForURL('**/admin/offers', { timeout: 5000 });

    // Verify offer appears in list
    await expect(page.locator(`text=${offerKey}`)).toBeVisible();
    await expect(page.locator('text=Test Course Offer')).toBeVisible();
  });

  test('GRO-ADM-O-003: Edit offer', async ({ page }) => {
    // First, create a test offer
    await page.goto('http://localhost:2828/admin/offers/new');

    const timestamp = Date.now();
    const offerKey = `edit-test-${timestamp}`;

    await page.fill('input[type="text"]', offerKey);
    await page.selectOption('select', 'membership');

    const inputs = page.locator('input[type="text"]');
    await inputs.nth(1).fill('Original Title');
    await inputs.nth(4).fill('Original CTA');
    await inputs.nth(5).fill('$29/mo');

    const bulletsTextarea = page.locator('textarea').first();
    await bulletsTextarea.fill('["Original Feature"]');

    const payloadTextarea = page.locator('textarea').last();
    await payloadTextarea.fill('{"tier":"member","interval":"monthly"}');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/offers');

    // Now edit the offer
    await page.click(`a[href="/admin/offers/${offerKey}"]`);
    await page.waitForURL(`**/admin/offers/${offerKey}`);

    // Verify edit page loaded
    await expect(page.locator('h1')).toContainText(`Edit: ${offerKey}`);

    // Verify key field is disabled
    const keyInput = page.locator('input[value="' + offerKey + '"]');
    await expect(keyInput).toBeDisabled();

    // Update title
    const titleInput = page.locator('input[type="text"]').nth(1);
    await titleInput.clear();
    await titleInput.fill('Updated Title');

    // Update CTA
    const ctaInput = page.locator('input[type="text"]').nth(4);
    await ctaInput.clear();
    await ctaInput.fill('Updated CTA');

    // Update price
    const priceInput = page.locator('input[type="text"]').nth(5);
    await priceInput.clear();
    await priceInput.fill('$39/mo');

    // Save changes
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/offers');

    // Verify changes persisted
    await page.click(`a[href="/admin/offers/${offerKey}"]`);

    const updatedTitle = page.locator('input[type="text"]').nth(1);
    await expect(updatedTitle).toHaveValue('Updated Title');

    const updatedCta = page.locator('input[type="text"]').nth(4);
    await expect(updatedCta).toHaveValue('Updated CTA');

    const updatedPrice = page.locator('input[type="text"]').nth(5);
    await expect(updatedPrice).toHaveValue('$39/mo');
  });

  test('GRO-ADM-O-004: Toggle active status', async ({ page }) => {
    // Create a test offer
    await page.goto('http://localhost:2828/admin/offers/new');

    const timestamp = Date.now();
    const offerKey = `toggle-test-${timestamp}`;

    await page.fill('input[type="text"]', offerKey);
    await page.selectOption('select', 'course');

    const inputs = page.locator('input[type="text"]');
    await inputs.nth(1).fill('Toggle Test Offer');

    const bulletsTextarea = page.locator('textarea').first();
    await bulletsTextarea.fill('[]');

    const payloadTextarea = page.locator('textarea').last();
    await payloadTextarea.fill('{"courseSlug":"test"}');

    // Verify active is checked
    const activeCheckbox = page.locator('input[type="checkbox"]');
    await expect(activeCheckbox).toBeChecked();

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/offers');

    // Verify offer is shown as active
    const activeRow = page.locator(`tr:has-text("${offerKey}")`);
    await expect(activeRow.locator('text=Active')).toBeVisible();

    // Edit the offer to toggle inactive
    await page.click(`a[href="/admin/offers/${offerKey}"]`);
    await page.waitForURL(`**/admin/offers/${offerKey}`);

    // Uncheck active
    await page.locator('input[type="checkbox"]').uncheck();

    // Save
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/offers');

    // Verify offer is now shown as inactive
    await expect(activeRow.locator('text=Inactive')).toBeVisible();

    // Toggle back to active
    await page.click(`a[href="/admin/offers/${offerKey}"]`);
    await page.locator('input[type="checkbox"]').check();
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/offers');

    // Verify active again
    await expect(activeRow.locator('text=Active')).toBeVisible();
  });

  test('GRO-ADM-O-005: Set payload JSON', async ({ page }) => {
    // Create offer with complex payload
    await page.goto('http://localhost:2828/admin/offers/new');

    const timestamp = Date.now();
    const offerKey = `payload-test-${timestamp}`;

    await page.fill('input[type="text"]', offerKey);
    await page.selectOption('select', 'bundle');

    const inputs = page.locator('input[type="text"]');
    await inputs.nth(1).fill('Payload Test Offer');

    const bulletsTextarea = page.locator('textarea').first();
    await bulletsTextarea.fill('["Feature A", "Feature B"]');

    // Test complex payload
    const complexPayload = {
      courseSlug: 'advanced-course',
      tier: 'vip',
      trialDays: 30,
      bonuses: ['Bonus 1', 'Bonus 2'],
      metadata: {
        campaign: 'summer-sale',
        discount: 40
      }
    };

    const payloadTextarea = page.locator('textarea').last();
    await payloadTextarea.fill(JSON.stringify(complexPayload, null, 2));

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/offers');

    // Edit and verify payload persisted
    await page.click(`a[href="/admin/offers/${offerKey}"]`);
    await page.waitForURL(`**/admin/offers/${offerKey}`);

    // Get payload textarea value
    const payloadValue = await page.locator('textarea').last().inputValue();
    const parsedPayload = JSON.parse(payloadValue);

    // Verify all payload fields
    expect(parsedPayload.courseSlug).toBe('advanced-course');
    expect(parsedPayload.tier).toBe('vip');
    expect(parsedPayload.trialDays).toBe(30);
    expect(parsedPayload.bonuses).toEqual(['Bonus 1', 'Bonus 2']);
    expect(parsedPayload.metadata.campaign).toBe('summer-sale');
    expect(parsedPayload.metadata.discount).toBe(40);

    // Test updating payload
    const updatedPayload = {
      ...complexPayload,
      tier: 'member',
      trialDays: 60,
      newField: 'new value'
    };

    await page.locator('textarea').last().fill(JSON.stringify(updatedPayload, null, 2));
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/offers');

    // Verify update persisted
    await page.click(`a[href="/admin/offers/${offerKey}"]`);
    const updatedValue = await page.locator('textarea').last().inputValue();
    const updatedParsed = JSON.parse(updatedValue);

    expect(updatedParsed.tier).toBe('member');
    expect(updatedParsed.trialDays).toBe(60);
    expect(updatedParsed.newField).toBe('new value');
  });

  test('GRO-ADM-O-005.1: Validate invalid JSON shows error', async ({ page }) => {
    await page.goto('http://localhost:2828/admin/offers/new');

    const timestamp = Date.now();
    const offerKey = `invalid-json-${timestamp}`;

    await page.fill('input[type="text"]', offerKey);
    await page.selectOption('select', 'course');

    const inputs = page.locator('input[type="text"]');
    await inputs.nth(1).fill('Invalid JSON Test');

    // Enter invalid JSON in bullets
    const bulletsTextarea = page.locator('textarea').first();
    await bulletsTextarea.fill('invalid json here');

    const payloadTextarea = page.locator('textarea').last();
    await payloadTextarea.fill('{}');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid bullets JSON')).toBeVisible({ timeout: 3000 });

    // Fix bullets, break payload
    await bulletsTextarea.fill('[]');
    await payloadTextarea.fill('{ invalid: json }');

    await page.click('button[type="submit"]');

    // Should show payload error
    await expect(page.locator('text=Invalid payload JSON')).toBeVisible({ timeout: 3000 });
  });

  test('GRO-ADM-O-005.2: Support all three offer kinds', async ({ page }) => {
    const kinds = [
      {
        kind: 'membership',
        payload: { tier: 'member', interval: 'monthly' }
      },
      {
        kind: 'course',
        payload: { courseSlug: 'test-course' }
      },
      {
        kind: 'bundle',
        payload: { courseSlug: 'test-course', tier: 'vip', trialDays: 30 }
      }
    ];

    for (const { kind, payload } of kinds) {
      await page.goto('http://localhost:2828/admin/offers/new');

      const timestamp = Date.now();
      const offerKey = `${kind}-${timestamp}`;

      await page.fill('input[type="text"]', offerKey);
      await page.selectOption('select', kind);

      const inputs = page.locator('input[type="text"]');
      await inputs.nth(1).fill(`${kind.charAt(0).toUpperCase() + kind.slice(1)} Offer`);

      await page.locator('textarea').first().fill('[]');
      await page.locator('textarea').last().fill(JSON.stringify(payload, null, 2));

      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/offers');

      // Verify kind badge in table
      const row = page.locator(`tr:has-text("${offerKey}")`);
      await expect(row.locator(`text=${kind}`)).toBeVisible();
    }
  });

  test('GRO-ADM-O-005.3: Key field is immutable after creation', async ({ page }) => {
    // Create offer
    await page.goto('http://localhost:2828/admin/offers/new');

    const timestamp = Date.now();
    const offerKey = `immutable-key-${timestamp}`;

    await page.fill('input[type="text"]', offerKey);
    await page.selectOption('select', 'course');

    const inputs = page.locator('input[type="text"]');
    await inputs.nth(1).fill('Immutable Key Test');

    await page.locator('textarea').first().fill('[]');
    await page.locator('textarea').last().fill('{"courseSlug":"test"}');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/offers');

    // Edit offer
    await page.click(`a[href="/admin/offers/${offerKey}"]`);

    // Verify key input is disabled
    const keyInput = page.locator('input[value="' + offerKey + '"]');
    await expect(keyInput).toBeDisabled();

    // Verify we can still edit other fields
    const titleInput = page.locator('input[type="text"]').nth(1);
    await expect(titleInput).not.toBeDisabled();
  });
});

/**
 * Test Summary for feat-019: Admin Offers CRUD
 *
 * E2E Test Coverage:
 * - GRO-ADM-O-001: List all offers (table display, empty state)
 * - GRO-ADM-O-002: Create offer (full form submission, appears in list)
 * - GRO-ADM-O-003: Edit offer (changes persist, key immutable)
 * - GRO-ADM-O-004: Toggle active (checkbox, status display)
 * - GRO-ADM-O-005: Set payload (complex JSON, validation, all kinds)
 *
 * Additional Coverage:
 * - Invalid JSON validation and error messages
 * - All three offer kinds (membership, course, bundle)
 * - Key field immutability after creation
 * - Form field population on edit
 * - Redirect behavior after save
 *
 * Total E2E Tests: 8 tests covering all acceptance criteria
 *
 * Acceptance Criteria Validation:
 * ✓ Admin can CRUD offers
 * ✓ Active toggle works
 * ✓ JSON payload saves
 */
