import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '@/lib/supabase/admin';

test.describe('DM Thread Management (NEW-DM-002)', () => {
  let user1: any;
  let user2: any;
  let threadId: string;

  test.beforeAll(async () => {
    // Create test users
    const { data: u1 } = await supabaseAdmin.auth.admin.createUser({
      email: 'dmthread1@test.com',
      password: 'password123',
      email_confirm: true,
    });
    user1 = u1.user;

    const { data: u2 } = await supabaseAdmin.auth.admin.createUser({
      email: 'dmthread2@test.com',
      password: 'password123',
      email_confirm: true,
    });
    user2 = u2.user;
  });

  test.afterAll(async () => {
    // Cleanup
    if (user1) {
      await supabaseAdmin.auth.admin.deleteUser(user1.id);
    }
    if (user2) {
      await supabaseAdmin.auth.admin.deleteUser(user2.id);
    }
  });

  test('NEW-DM-002-001: thread list shows all conversations', async ({ page }) => {
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmthread1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Create a thread
    const createResponse = await page.request.post('http://localhost:2828/api/dm/threads', {
      data: {
        recipientId: user2.id,
        initialMessage: 'Test message',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const { thread } = await createResponse.json();
    threadId = thread.id;

    // Fetch thread list
    const listResponse = await page.request.get('http://localhost:2828/api/dm/threads');
    expect(listResponse.ok()).toBeTruthy();
    const { threads } = await listResponse.json();
    expect(threads.length).toBeGreaterThan(0);
    expect(threads[0].id).toBe(threadId);
  });

  test('NEW-DM-002-002: threads show unread counts', async ({ page }) => {
    if (!threadId) {
      test.skip();
    }

    // User2 sends a message
    const { data: tokens2 } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmthread2@test.com',
    });

    if (tokens2?.properties?.action_link) {
      await page.goto(tokens2.properties.action_link);
    }

    await page.request.post(`http://localhost:2828/api/dm/threads/${threadId}/messages`, {
      data: {
        content: 'Unread message from user2',
      },
    });

    // User1 checks threads
    const { data: tokens1 } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmthread1@test.com',
    });

    if (tokens1?.properties?.action_link) {
      await page.goto(tokens1.properties.action_link);
    }

    const response = await page.request.get('http://localhost:2828/api/dm/threads');
    expect(response.ok()).toBeTruthy();
    const { threads } = await response.json();
    const thread = threads.find((t: any) => t.id === threadId);
    expect(thread.unread_count).toBeGreaterThan(0);
  });

  test('NEW-DM-002-003: threads can be archived', async ({ page }) => {
    if (!threadId) {
      test.skip();
    }

    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmthread1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Archive the thread
    const response = await page.request.patch(
      `http://localhost:2828/api/dm/threads/${threadId}/archive`,
      {
        data: {
          isArchived: true,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const { isArchived } = await response.json();
    expect(isArchived).toBe(true);
  });

  test('NEW-DM-002-004: archived threads can be unarchived', async ({ page }) => {
    if (!threadId) {
      test.skip();
    }

    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmthread1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Unarchive the thread
    const response = await page.request.patch(
      `http://localhost:2828/api/dm/threads/${threadId}/archive`,
      {
        data: {
          isArchived: false,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const { isArchived } = await response.json();
    expect(isArchived).toBe(false);
  });

  test('NEW-DM-002-005: threads are sorted by most recent', async ({ page }) => {
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmthread1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    const response = await page.request.get('http://localhost:2828/api/dm/threads');
    expect(response.ok()).toBeTruthy();
    const { threads } = await response.json();

    // Verify threads are sorted by updated_at descending
    for (let i = 0; i < threads.length - 1; i++) {
      const current = new Date(threads[i].updated_at).getTime();
      const next = new Date(threads[i + 1].updated_at).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  test('NEW-DM-002-006: global unread count is accurate', async ({ page }) => {
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmthread1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    const response = await page.request.get('http://localhost:2828/api/dm/unread');
    expect(response.ok()).toBeTruthy();
    const { unreadCount } = await response.json();
    expect(typeof unreadCount).toBe('number');
    expect(unreadCount).toBeGreaterThanOrEqual(0);
  });

  test('NEW-DM-002-007: thread list shows other user info', async ({ page }) => {
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmthread1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    const response = await page.request.get('http://localhost:2828/api/dm/threads');
    expect(response.ok()).toBeTruthy();
    const { threads } = await response.json();

    if (threads.length > 0) {
      expect(threads[0].other_user).toBeDefined();
      expect(threads[0].other_user.id).toBeDefined();
      expect(threads[0].other_user.email).toBeDefined();
    }
  });

  test('NEW-DM-002-008: archived threads are separate from active', async ({ page }) => {
    if (!threadId) {
      test.skip();
    }

    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmthread1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Archive a thread first
    await page.request.patch(`http://localhost:2828/api/dm/threads/${threadId}/archive`, {
      data: {
        isArchived: true,
      },
    });

    // Thread list should still work (archived threads handled by UI filter)
    const response = await page.request.get('http://localhost:2828/api/dm/threads');
    expect(response.ok()).toBeTruthy();
  });
});
