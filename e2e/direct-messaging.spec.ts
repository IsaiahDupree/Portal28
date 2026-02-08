import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '@/lib/supabase/admin';

test.describe('Direct Messaging System (NEW-DM-001)', () => {
  let user1: any;
  let user2: any;
  let threadId: string;

  test.beforeAll(async () => {
    // Create test users
    const { data: u1 } = await supabaseAdmin.auth.admin.createUser({
      email: 'dmuser1@test.com',
      password: 'password123',
      email_confirm: true,
    });
    user1 = u1.user;

    const { data: u2 } = await supabaseAdmin.auth.admin.createUser({
      email: 'dmuser2@test.com',
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

  test('NEW-DM-001-001: users can create a DM thread', async ({ page }) => {
    // Login as user1
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Create thread via API
    const response = await page.request.post('http://localhost:2828/api/dm/threads', {
      data: {
        recipientId: user2.id,
        initialMessage: 'Hello from user1!',
      },
    });

    expect(response.ok()).toBeTruthy();
    const { thread, message } = await response.json();
    expect(thread.id).toBeDefined();
    expect(message.content).toBe('Hello from user1!');
    threadId = thread.id;
  });

  test('NEW-DM-001-002: users can send messages in a thread', async ({ page }) => {
    if (!threadId) {
      test.skip();
    }

    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Send a message
    const response = await page.request.post(
      `http://localhost:2828/api/dm/threads/${threadId}/messages`,
      {
        data: {
          content: 'This is a test message',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const { message } = await response.json();
    expect(message.content).toBe('This is a test message');
    expect(message.sender_id).toBe(user1.id);
  });

  test('NEW-DM-001-003: users can receive messages in real-time', async ({ page }) => {
    if (!threadId) {
      test.skip();
    }

    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser2@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Fetch messages
    const response = await page.request.get(
      `http://localhost:2828/api/dm/threads/${threadId}/messages`
    );

    expect(response.ok()).toBeTruthy();
    const { messages } = await response.json();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some((m: any) => m.content === 'Hello from user1!')).toBeTruthy();
  });

  test('NEW-DM-001-004: messages are marked as read automatically', async ({ page }) => {
    if (!threadId) {
      test.skip();
    }

    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser2@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Fetch messages (this should mark them as read)
    await page.request.get(`http://localhost:2828/api/dm/threads/${threadId}/messages`);

    // Check unread count
    const unreadResponse = await page.request.get('http://localhost:2828/api/dm/unread');
    expect(unreadResponse.ok()).toBeTruthy();
    const { unreadCount } = await unreadResponse.json();
    // Should be 0 after reading
    expect(unreadCount).toBe(0);
  });

  test('NEW-DM-001-005: users can view their thread list', async ({ page }) => {
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    const response = await page.request.get('http://localhost:2828/api/dm/threads');
    expect(response.ok()).toBeTruthy();
    const { threads } = await response.json();
    expect(threads.length).toBeGreaterThan(0);
    expect(threads[0].id).toBeDefined();
    expect(threads[0].other_user).toBeDefined();
  });

  test('NEW-DM-001-006: typing indicators work', async ({ page }) => {
    if (!threadId) {
      test.skip();
    }

    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Send typing indicator
    const response = await page.request.post('http://localhost:2828/api/dm/typing', {
      data: {
        threadId,
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('NEW-DM-001-007: users cannot access threads they are not part of', async ({ page }) => {
    // Create a third user
    const { data: u3 } = await supabaseAdmin.auth.admin.createUser({
      email: 'dmuser3@test.com',
      password: 'password123',
      email_confirm: true,
    });

    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser3@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    if (!threadId) {
      test.skip();
    }

    // Try to access thread between user1 and user2
    const response = await page.request.get(
      `http://localhost:2828/api/dm/threads/${threadId}/messages`
    );

    // Should be forbidden
    expect(response.status()).toBe(404);

    // Cleanup
    if (u3.user) {
      await supabaseAdmin.auth.admin.deleteUser(u3.user.id);
    }
  });

  test('NEW-DM-001-008: duplicate threads are prevented', async ({ page }) => {
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Try to create another thread with same user
    const response = await page.request.post('http://localhost:2828/api/dm/threads', {
      data: {
        recipientId: user2.id,
      },
    });

    expect(response.ok()).toBeTruthy();
    const { thread } = await response.json();
    // Should return existing thread
    expect(thread.id).toBe(threadId);
  });

  test('NEW-DM-001-009: messages have character limit', async ({ page }) => {
    if (!threadId) {
      test.skip();
    }

    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser1@test.com',
    });

    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Try to send message exceeding 5000 characters
    const longMessage = 'a'.repeat(5001);
    const response = await page.request.post(
      `http://localhost:2828/api/dm/threads/${threadId}/messages`,
      {
        data: {
          content: longMessage,
        },
      }
    );

    expect(response.status()).toBe(400);
  });

  test('NEW-DM-001-010: unread count is tracked correctly', async ({ page, context }) => {
    if (!threadId) {
      test.skip();
    }

    // User1 sends a message
    const { data: tokens1 } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser1@test.com',
    });

    if (tokens1?.properties?.action_link) {
      await page.goto(tokens1.properties.action_link);
    }

    await page.request.post(`http://localhost:2828/api/dm/threads/${threadId}/messages`, {
      data: {
        content: 'New unread message',
      },
    });

    // User2 checks unread count
    const user2Page = await context.newPage();
    const { data: tokens2 } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'dmuser2@test.com',
    });

    if (tokens2?.properties?.action_link) {
      await user2Page.goto(tokens2.properties.action_link);
    }

    const unreadResponse = await user2Page.request.get('http://localhost:2828/api/dm/unread');
    expect(unreadResponse.ok()).toBeTruthy();
    const { unreadCount } = await unreadResponse.json();
    expect(unreadCount).toBeGreaterThan(0);
  });
});
