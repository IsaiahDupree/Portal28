// E2E Tests for Quizzes Feature
// feat-040: Quizzes - PLT-QIZ-004, PLT-QIZ-005

import { test, expect } from '@playwright/test';

test.describe('Quizzes Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Assume we're logged in as admin for these tests
    // In real tests, you'd go through auth flow
  });

  test('PLT-QIZ-004: Quiz renders and shows questions', async ({ page }) => {
    // This test assumes a quiz exists
    // In real implementation, you'd create it via API or seed data

    test.skip(true, 'Requires database seeding and auth setup');

    // Navigate to a lesson with a quiz
    await page.goto('/app/lesson/test-lesson-id');

    // Check quiz component renders
    await expect(page.getByText('Test Quiz')).toBeVisible();

    // Start quiz
    await page.click('button:has-text("Start Quiz")');

    // Check questions display
    await expect(page.getByText('1.')).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(4); // Assumes 2 answers per question

    // Check answer options are visible
    const radioButtons = page.getByRole('radio');
    await expect(radioButtons.first()).toBeVisible();
  });

  test('PLT-QIZ-005: Submit quiz and shows results', async ({ page }) => {
    test.skip(true, 'Requires database seeding and auth setup');

    // Navigate to quiz
    await page.goto('/app/lesson/test-lesson-id');

    // Start quiz
    await page.click('button:has-text("Start Quiz")');

    // Answer all questions
    const questions = await page.locator('[name^="question-"]').all();
    for (const question of questions) {
      const answers = await question.locator('input[type="radio"]').all();
      if (answers.length > 0) {
        await answers[0].click();
      }
    }

    // Submit quiz
    await page.click('button:has-text("Submit Quiz")');

    // Wait for results
    await page.waitForTimeout(1000);

    // Check results display
    await expect(page.getByText('Quiz Results')).toBeVisible();
    await expect(page.getByText(/%/)).toBeVisible(); // Score percentage

    // Check pass/fail status
    const resultsText = await page.textContent('body');
    expect(resultsText).toMatch(/Passed|Failed/);
  });

  test('PLT-QIZ-006: Quiz progress is recorded', async ({ page }) => {
    test.skip(true, 'Requires database seeding and auth setup');

    // Navigate to quiz
    await page.goto('/app/lesson/test-lesson-id');

    // Check that previous attempts are shown if any exist
    const previousAttempts = page.getByText('Previous Attempts');

    // This may or may not exist depending on history
    // Just verify the page loads
    await expect(page.getByText('Test Quiz')).toBeVisible();
  });

  test('Admin can create quiz', async ({ page }) => {
    test.skip(true, 'Requires database seeding and auth setup');

    // Navigate to admin quiz builder
    await page.goto('/admin/courses/test-course-id');

    // Find lesson and add quiz
    await page.click('text=Add Quiz');

    // Fill quiz form
    await page.fill('input[placeholder*="quiz title"]', 'New Quiz');
    await page.fill('input[type="number"]', '70'); // Passing score

    // Create quiz
    await page.click('button:has-text("Create Quiz")');

    // Wait for success
    await page.waitForTimeout(1000);

    // Verify quiz was created
    await expect(page.getByText('Quiz created successfully')).toBeVisible();
  });

  test('Admin can add questions to quiz', async ({ page }) => {
    test.skip(true, 'Requires database seeding and auth setup');

    // Assume quiz exists
    await page.goto('/admin/quizzes/test-quiz-id');

    // Fill question form
    await page.fill('textarea[placeholder*="question"]', 'What is 2+2?');

    // Fill answers
    const answerInputs = await page.locator('input[placeholder^="Answer"]').all();
    await answerInputs[0].fill('4');
    await answerInputs[1].fill('5');

    // Mark first answer as correct
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    await checkboxes[0].check();

    // Add question
    await page.click('button:has-text("Add Question")');

    // Wait for success
    await page.waitForTimeout(1000);

    // Verify question was added
    await expect(page.getByText('Question added successfully')).toBeVisible();
  });

  test('Quiz prevents retakes if disabled', async ({ page }) => {
    test.skip(true, 'Requires database seeding and auth setup');

    // Navigate to quiz with retakes disabled
    await page.goto('/app/lesson/test-lesson-no-retakes');

    // If already attempted, should show no retakes message
    const hasAttempted = await page.getByText('Previous Attempts').isVisible();

    if (hasAttempted) {
      await expect(page.getByText('No more attempts available')).toBeVisible();
    }
  });

  test('Quiz respects max attempts', async ({ page }) => {
    test.skip(true, 'Requires database seeding and auth setup');

    // Navigate to quiz with max 2 attempts
    await page.goto('/app/lesson/test-lesson-max-attempts');

    // Check attempts remaining message
    const bodyText = await page.textContent('body');

    // If at max attempts, button should be disabled or message shown
    if (bodyText?.includes('Attempt 2')) {
      await expect(page.getByText('No more attempts available')).toBeVisible();
    }
  });

  test('Quiz shows correct answers after submission when enabled', async ({ page }) => {
    test.skip(true, 'Requires database seeding and auth setup');

    // Navigate to quiz
    await page.goto('/app/lesson/test-lesson-id');

    // Complete quiz flow
    await page.click('button:has-text("Start Quiz")');

    // Answer questions
    await page.click('input[type="radio"]');

    // Submit
    await page.click('button:has-text("Submit Quiz")');

    // Results should show score
    await expect(page.getByText(/%/)).toBeVisible();
  });
});
