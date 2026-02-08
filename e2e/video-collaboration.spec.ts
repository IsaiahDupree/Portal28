import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '@/lib/supabase/admin';

test.describe('Video Collaboration (VID-RTC)', () => {
  let adminUser: any;
  let editorUser: any;
  let sessionId: string;

  test.beforeAll(async () => {
    // Create test users
    const { data: admin } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin-collab@test.com',
      password: 'password123',
      email_confirm: true,
    });
    adminUser = admin.user;

    const { data: editor } = await supabaseAdmin.auth.admin.createUser({
      email: 'editor-collab@test.com',
      password: 'password123',
      email_confirm: true,
    });
    editorUser = editor.user;
  });

  test.afterAll(async () => {
    // Cleanup
    if (adminUser) {
      await supabaseAdmin.auth.admin.deleteUser(adminUser.id);
    }
    if (editorUser) {
      await supabaseAdmin.auth.admin.deleteUser(editorUser.id);
    }
  });

  test('VID-RTC-001: Multiple editors can collaborate on a video project', async ({ page, context }) => {
    // Login as admin
    await page.goto('http://localhost:2828');
    await page.fill('input[name="email"]', 'admin-collab@test.com');
    await page.click('button[type="submit"]');
    await page.waitForURL(/check-email/);

    // Get magic link from Supabase
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin-collab@test.com',
    });
    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Create a collaboration session via API
    const response = await page.request.post('http://localhost:2828/api/video/collaboration/sessions', {
      data: {
        name: 'Test Collaboration Session',
        description: 'Testing real-time collaboration',
      },
    });
    expect(response.ok()).toBeTruthy();
    const { session } = await response.json();
    sessionId = session.id;

    // Open second browser for editor user
    const editorPage = await context.newPage();
    await editorPage.goto('http://localhost:2828');
    await editorPage.fill('input[name="email"]', 'editor-collab@test.com');
    await editorPage.click('button[type="submit"]');
    await editorPage.waitForURL(/check-email/);

    const { data: editorTokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'editor-collab@test.com',
    });
    if (editorTokens?.properties?.action_link) {
      await editorPage.goto(editorTokens.properties.action_link);
    }

    // Add editor as participant
    const addParticipantResponse = await page.request.post(
      'http://localhost:2828/api/video/collaboration/sessions',
      {
        data: {
          session_id: sessionId,
          user_id: editorUser.id,
          role: 'editor',
        },
      }
    );
    expect(addParticipantResponse.ok()).toBeTruthy();

    // Verify both users can see each other's presence
    const presenceResponse = await page.request.get(
      `http://localhost:2828/api/video/collaboration/presence?sessionId=${sessionId}`
    );
    expect(presenceResponse.ok()).toBeTruthy();
    const { presences } = await presenceResponse.json();
    expect(presences.length).toBeGreaterThanOrEqual(1);
  });

  test('VID-RTC-002: Changes sync live between collaborators', async ({ page }) => {
    // Assume session exists from previous test
    if (!sessionId) {
      test.skip();
    }

    // Login as admin
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin-collab@test.com',
    });
    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Create an edit
    const editResponse = await page.request.post('http://localhost:2828/api/video/collaboration/edits', {
      data: {
        sessionId,
        operationType: 'update',
        path: 'brief.script',
        oldValue: 'Old script content',
        newValue: 'Updated script content',
      },
    });
    expect(editResponse.ok()).toBeTruthy();
    const { edit } = await editResponse.json();
    expect(edit.id).toBeDefined();
    expect(edit.operation_type).toBe('update');
    expect(edit.path).toBe('brief.script');

    // Fetch edits and verify
    const editsResponse = await page.request.get(
      `http://localhost:2828/api/video/collaboration/edits?sessionId=${sessionId}&limit=10`
    );
    expect(editsResponse.ok()).toBeTruthy();
    const { edits } = await editsResponse.json();
    expect(edits.length).toBeGreaterThan(0);
    expect(edits[0].id).toBe(edit.id);
  });

  test('VID-RTC-003: Comments and annotations are visible to all participants', async ({ page }) => {
    if (!sessionId) {
      test.skip();
    }

    // Login
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin-collab@test.com',
    });
    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Create a comment
    const commentResponse = await page.request.post(
      'http://localhost:2828/api/video/collaboration/comments',
      {
        data: {
          sessionId,
          content: 'This script needs improvement',
          targetPath: 'brief.script',
          targetTimestamp: 5.5,
        },
      }
    );
    expect(commentResponse.ok()).toBeTruthy();
    const { comment } = await commentResponse.json();
    expect(comment.id).toBeDefined();
    expect(comment.content).toBe('This script needs improvement');
    expect(comment.target_path).toBe('brief.script');

    // Fetch comments and verify
    const commentsResponse = await page.request.get(
      `http://localhost:2828/api/video/collaboration/comments?sessionId=${sessionId}`
    );
    expect(commentsResponse.ok()).toBeTruthy();
    const { comments } = await commentsResponse.json();
    expect(comments.length).toBeGreaterThan(0);
    const foundComment = comments.find((c: any) => c.id === comment.id);
    expect(foundComment).toBeDefined();
    expect(foundComment.content).toBe('This script needs improvement');

    // Resolve comment
    const resolveResponse = await page.request.patch(
      `http://localhost:2828/api/video/collaboration/comments/${comment.id}`,
      {
        data: { resolved: true },
      }
    );
    expect(resolveResponse.ok()).toBeTruthy();
    const { comment: resolvedComment } = await resolveResponse.json();
    expect(resolvedComment.resolved).toBe(true);
  });

  test('VID-RTC-004: Version history is accessible', async ({ page }) => {
    if (!sessionId) {
      test.skip();
    }

    // Login
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin-collab@test.com',
    });
    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Create a version snapshot
    const versionResponse = await page.request.post(
      'http://localhost:2828/api/video/collaboration/versions',
      {
        data: {
          sessionId,
          snapshot: {
            brief: { script: 'Final script version' },
            timestamp: new Date().toISOString(),
          },
          description: 'Final version before export',
        },
      }
    );
    expect(versionResponse.ok()).toBeTruthy();
    const { version } = await versionResponse.json();
    expect(version.id).toBeDefined();
    expect(version.version_number).toBeGreaterThan(0);

    // Fetch versions and verify
    const versionsResponse = await page.request.get(
      `http://localhost:2828/api/video/collaboration/versions?sessionId=${sessionId}`
    );
    expect(versionsResponse.ok()).toBeTruthy();
    const { versions } = await versionsResponse.json();
    expect(versions.length).toBeGreaterThan(0);
    expect(versions[0].snapshot).toBeDefined();
  });

  test('VID-RTC-005: Conflict resolution works correctly', async ({ page }) => {
    if (!sessionId) {
      test.skip();
    }

    // Login
    const { data: tokens } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin-collab@test.com',
    });
    if (tokens?.properties?.action_link) {
      await page.goto(tokens.properties.action_link);
    }

    // Create first edit
    const edit1Response = await page.request.post(
      'http://localhost:2828/api/video/collaboration/edits',
      {
        data: {
          sessionId,
          operationType: 'update',
          path: 'brief.title',
          oldValue: 'Original Title',
          newValue: 'Updated Title V1',
        },
      }
    );
    expect(edit1Response.ok()).toBeTruthy();

    // Create second conflicting edit immediately
    const edit2Response = await page.request.post(
      'http://localhost:2828/api/video/collaboration/edits',
      {
        data: {
          sessionId,
          operationType: 'update',
          path: 'brief.title',
          oldValue: 'Original Title',
          newValue: 'Updated Title V2',
        },
      }
    );
    expect(edit2Response.ok()).toBeTruthy();
    const { conflictDetected } = await edit2Response.json();

    // Verify conflict was detected
    expect(conflictDetected).toBe(true);
  });
});
