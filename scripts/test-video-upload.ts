/**
 * Manual Video Upload Test Script
 * 
 * This script tests the video upload flow for the Course Studio.
 * Run with: npx ts-node scripts/test-video-upload.ts
 * 
 * Prerequisites:
 * 1. Local Supabase running (npx supabase start)
 * 2. Dev server running (npm run dev)
 * 3. Admin user created in local Supabase
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>) {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      message: "OK",
      duration: Date.now() - start,
    });
    console.log(`✓ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    console.log(`✗ ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

async function testMuxUploadEndpoint() {
  // Test unauthenticated access
  const response = await fetch(`${BASE_URL}/api/video/mux/create-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId: "00000000-0000-0000-0000-000000000000" }),
  });

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
}

async function testFileUploadEndpoint() {
  const response = await fetch(`${BASE_URL}/api/files/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lessonId: "00000000-0000-0000-0000-000000000000",
      filename: "test.pdf",
      fileKind: "pdf",
    }),
  });

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
}

async function testFileRegisterEndpoint() {
  const response = await fetch(`${BASE_URL}/api/files/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lessonId: "00000000-0000-0000-0000-000000000000",
      path: "test/path.pdf",
      filename: "test.pdf",
      fileKind: "pdf",
    }),
  });

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
}

async function testSignedUrlEndpoint() {
  const response = await fetch(
    `${BASE_URL}/api/files/signed-url?fileId=00000000-0000-0000-0000-000000000000`
  );

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
}

async function testStudioCoursesEndpoint() {
  const response = await fetch(`${BASE_URL}/api/studio/courses`);

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
}

async function testMuxWebhook() {
  // Test Mux webhook endpoint accepts POST
  const response = await fetch(`${BASE_URL}/api/webhooks/mux`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "video.asset.ready",
      data: { id: "test-asset-id", playback_ids: [{ id: "test-playback" }] },
    }),
  });

  // Should return 200 (webhook processed)
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }

  const data = await response.json();
  if (!data.received) {
    throw new Error("Webhook did not acknowledge receipt");
  }
}

async function testPublicPages() {
  // Test home page loads
  const homeResponse = await fetch(`${BASE_URL}/`);
  if (!homeResponse.ok) {
    throw new Error(`Home page failed: ${homeResponse.status}`);
  }

  // Test courses page loads
  const coursesResponse = await fetch(`${BASE_URL}/courses`);
  if (!coursesResponse.ok) {
    throw new Error(`Courses page failed: ${coursesResponse.status}`);
  }
}

async function main() {
  console.log("\n🧪 Portal28 Video Upload & API Tests\n");
  console.log(`Testing against: ${BASE_URL}\n`);

  // API endpoint tests
  await runTest("Mux upload endpoint requires auth", testMuxUploadEndpoint);
  await runTest("File upload URL endpoint requires auth", testFileUploadEndpoint);
  await runTest("File register endpoint requires auth", testFileRegisterEndpoint);
  await runTest("Signed URL endpoint requires auth", testSignedUrlEndpoint);
  await runTest("Studio courses endpoint requires auth", testStudioCoursesEndpoint);
  await runTest("Mux webhook accepts events", testMuxWebhook);
  await runTest("Public pages load correctly", testPublicPages);

  // Summary
  console.log("\n" + "=".repeat(50));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  - ${r.name}: ${r.message}`));
    process.exit(1);
  }

  console.log("\n✅ All tests passed!\n");
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
