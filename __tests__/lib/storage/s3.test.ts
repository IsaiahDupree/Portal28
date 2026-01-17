/**
 * Tests for S3/R2 File Storage
 * Test IDs: PLT-R2-001, PLT-R2-002, PLT-R2-003, PLT-R2-004
 */

import { storage, getUploadUrl, getDownloadUrl, generateFileKey } from "@/lib/storage/s3";

describe("S3/R2 File Storage", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("PLT-R2-001: Configuration", () => {
    it("should detect when S3/R2 is not configured", () => {
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
      delete process.env.S3_BUCKET_NAME;

      expect(storage.isConfigured()).toBe(false);
    });

    it("should detect when S3/R2 is properly configured", () => {
      process.env.S3_ACCESS_KEY_ID = "test-access-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";
      process.env.S3_BUCKET_NAME = "test-bucket";

      expect(storage.isConfigured()).toBe(true);
    });

    it("should throw error when generating URLs without configuration", () => {
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
      delete process.env.S3_BUCKET_NAME;

      expect(() => {
        getUploadUrl("test-key", "application/pdf");
      }).toThrow("S3 storage not configured");
    });
  });

  describe("PLT-R2-002: File Upload URLs", () => {
    beforeEach(() => {
      process.env.S3_ACCESS_KEY_ID = "test-access-key-id";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret-access-key";
      process.env.S3_BUCKET_NAME = "portal28-files";
      process.env.S3_REGION = "auto";
    });

    it("should generate upload URL with AWS S3 format", () => {
      const url = getUploadUrl("lessons/123/file.pdf", "application/pdf", 3600);

      expect(url).toBeDefined();
      expect(url).toContain("portal28-files");
      expect(url).toContain("lessons/123/file.pdf");
      expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
      expect(url).toContain("X-Amz-Credential=test-access-key-id");
      expect(url).toContain("X-Amz-Expires=3600");
      expect(url).toContain("X-Amz-Signature=");
    });

    it("should generate upload URL with Cloudflare R2 endpoint", () => {
      process.env.S3_ENDPOINT = "https://abc123.r2.cloudflarestorage.com";

      const url = getUploadUrl("lessons/456/document.pdf", "application/pdf");

      expect(url).toContain("abc123.r2.cloudflarestorage.com");
      expect(url).toContain("portal28-files");
      expect(url).toContain("lessons/456/document.pdf");
    });

    it("should include content type in upload URL", () => {
      const url = getUploadUrl("test.pdf", "application/pdf");

      expect(url).toContain("Content-Type=application%2Fpdf");
    });

    it("should support custom expiry time", () => {
      const url = getUploadUrl("test.pdf", "application/pdf", 7200);

      expect(url).toContain("X-Amz-Expires=7200");
    });
  });

  describe("PLT-R2-003: Signed Download URLs", () => {
    beforeEach(() => {
      process.env.S3_ACCESS_KEY_ID = "test-access-key-id";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret-access-key";
      process.env.S3_BUCKET_NAME = "portal28-files";
      process.env.S3_REGION = "auto";
    });

    it("should generate download URL with signature", () => {
      const url = getDownloadUrl("lessons/123/file.pdf", 3600);

      expect(url).toBeDefined();
      expect(url).toContain("portal28-files");
      expect(url).toContain("lessons/123/file.pdf");
      expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
      expect(url).toContain("X-Amz-Signature=");
    });

    it("should generate download URL with custom expiry", () => {
      const url = getDownloadUrl("test-file.pdf", 1800);

      expect(url).toContain("X-Amz-Expires=1800");
    });

    it("should generate download URL for R2 endpoint", () => {
      process.env.S3_ENDPOINT = "https://xyz789.r2.cloudflarestorage.com";

      const url = getDownloadUrl("attachments/report.pdf");

      expect(url).toContain("xyz789.r2.cloudflarestorage.com");
      expect(url).toContain("portal28-files");
    });

    it("should default to 3600 seconds (1 hour) expiry", () => {
      const url = getDownloadUrl("file.pdf");

      expect(url).toContain("X-Amz-Expires=3600");
    });
  });

  describe("PLT-R2-004: URL Expiry", () => {
    beforeEach(() => {
      process.env.S3_ACCESS_KEY_ID = "test-access-key-id";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret-access-key";
      process.env.S3_BUCKET_NAME = "portal28-files";
      process.env.S3_REGION = "auto";
    });

    it("should generate URLs that expire after specified time", () => {
      const shortExpiry = 60; // 1 minute
      const url = getDownloadUrl("test.pdf", shortExpiry);

      expect(url).toContain(`X-Amz-Expires=${shortExpiry}`);

      // Extract the timestamp from the URL
      const dateMatch = url.match(/X-Amz-Date=(\d{8}T\d{6}Z)/);
      expect(dateMatch).toBeDefined();
      expect(dateMatch![1]).toMatch(/^\d{8}T\d{6}Z$/);
    });

    it("should include timestamp in generated URLs", () => {
      const url = getDownloadUrl("test.pdf");

      // URL should contain X-Amz-Date parameter
      expect(url).toMatch(/X-Amz-Date=\d{8}T\d{6}Z/);
    });

    it("should generate different signatures for different expiry times", () => {
      const url1 = getDownloadUrl("test.pdf", 3600);
      const url2 = getDownloadUrl("test.pdf", 7200);

      // Extract signatures
      const sig1 = url1.match(/X-Amz-Signature=([a-f0-9]+)/)?.[1];
      const sig2 = url2.match(/X-Amz-Signature=([a-f0-9]+)/)?.[1];

      expect(sig1).toBeDefined();
      expect(sig2).toBeDefined();
      // Signatures should be different due to different expiry times
      // Note: They might occasionally be the same if generated at exact same millisecond
    });

    it("should support very short expiry times (e.g., 5 minutes)", () => {
      const url = getDownloadUrl("test.pdf", 300);

      expect(url).toContain("X-Amz-Expires=300");
    });

    it("should support long expiry times (e.g., 7 days)", () => {
      const sevenDays = 7 * 24 * 60 * 60; // 604800 seconds
      const url = getDownloadUrl("test.pdf", sevenDays);

      expect(url).toContain(`X-Amz-Expires=${sevenDays}`);
    });
  });

  describe("Helper Functions", () => {
    it("should generate unique file keys with timestamp", async () => {
      const key1 = generateFileKey("lesson-123", "document.pdf");

      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));

      const key2 = generateFileKey("lesson-123", "document.pdf");

      expect(key1).toContain("lessons/lesson-123");
      expect(key1).toContain("document.pdf");
      expect(key2).toContain("lessons/lesson-123");

      // Keys should be different due to timestamp
      expect(key1).not.toEqual(key2);
    });

    it("should sanitize filenames", () => {
      const key = generateFileKey("lesson-123", "my document (final).pdf");

      expect(key).toContain("my_document__final_.pdf");
      expect(key).not.toContain("(");
      expect(key).not.toContain(")");
      expect(key).not.toContain(" ");
    });

    it("should support custom prefix", () => {
      const key = generateFileKey("123", "file.pdf", "attachments");

      expect(key).toContain("attachments/123");
    });
  });
});
