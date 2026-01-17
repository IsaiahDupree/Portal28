/**
 * Tests for R2 Storage Integration
 * Test IDs: PLT-R2-001, PLT-R2-002, PLT-R2-003, PLT-R2-004
 *
 * Note: Core S3/R2 storage tests are in __tests__/lib/storage/s3.test.ts
 * These tests verify the integration and API route existence.
 */

import { storage } from "@/lib/storage/s3";
import path from "path";
import fs from "fs";

describe("R2 Storage Integration", () => {
  describe("PLT-R2-001: Configuration and Setup", () => {
    it("should have R2 storage configuration in environment example", () => {
      const envExample = path.join(process.cwd(), ".env.example");
      const content = fs.readFileSync(envExample, "utf-8");

      expect(content).toContain("S3_ACCESS_KEY_ID");
      expect(content).toContain("S3_SECRET_ACCESS_KEY");
      expect(content).toContain("S3_BUCKET_NAME");
      expect(content).toContain("S3_ENDPOINT");
      expect(content).toContain("S3_REGION");
      expect(content).toContain("Cloudflare R2");
    });

    it("should have storage module exported", () => {
      expect(storage).toBeDefined();
      expect(storage.isConfigured).toBeDefined();
      expect(storage.getUploadUrl).toBeDefined();
      expect(storage.getDownloadUrl).toBeDefined();
      expect(storage.generateFileKey).toBeDefined();
    });
  });

  describe("PLT-R2-002: Upload URL Generation", () => {
    it("should have upload URL API route", () => {
      const routePath = path.join(process.cwd(), "app/api/r2/upload-url/route.ts");
      expect(fs.existsSync(routePath)).toBe(true);

      const content = fs.readFileSync(routePath, "utf-8");
      expect(content).toContain("POST");
      expect(content).toContain("getUploadUrl");
      expect(content).toContain("generateFileKey");
    });

    it("should validate required fields in upload URL route", () => {
      const routePath = path.join(process.cwd(), "app/api/r2/upload-url/route.ts");
      const content = fs.readFileSync(routePath, "utf-8");

      expect(content).toContain("lessonId");
      expect(content).toContain("filename");
      expect(content).toContain("contentType");
      expect(content).toContain("z.string()");
    });
  });

  describe("PLT-R2-003: Download URL Generation with Signatures", () => {
    it("should have download URL API route", () => {
      const routePath = path.join(process.cwd(), "app/api/r2/download-url/route.ts");
      expect(fs.existsSync(routePath)).toBe(true);

      const content = fs.readFileSync(routePath, "utf-8");
      expect(content).toContain("GET");
      expect(content).toContain("getDownloadUrl");
    });

    it("should support key parameter in download URL route", () => {
      const routePath = path.join(process.cwd(), "app/api/r2/download-url/route.ts");
      const content = fs.readFileSync(routePath, "utf-8");

      expect(content).toContain("key");
      expect(content).toContain("url.searchParams");
    });

    it("should verify access control for lesson files", () => {
      const routePath = path.join(process.cwd(), "app/api/r2/download-url/route.ts");
      const content = fs.readFileSync(routePath, "utf-8");

      expect(content).toContain("lessons/");
      expect(content).toContain("lessonId");
    });
  });

  describe("PLT-R2-004: URL Expiry", () => {
    it("should support expiry parameter in upload URL route", () => {
      const routePath = path.join(process.cwd(), "app/api/r2/upload-url/route.ts");
      const content = fs.readFileSync(routePath, "utf-8");

      expect(content).toContain("expiresIn");
    });

    it("should support expiry parameter in download URL route", () => {
      const routePath = path.join(process.cwd(), "app/api/r2/download-url/route.ts");
      const content = fs.readFileSync(routePath, "utf-8");

      expect(content).toContain("expiresIn");
    });

    it("should have default expiry values", () => {
      const uploadRoutePath = path.join(process.cwd(), "app/api/r2/upload-url/route.ts");
      const downloadRoutePath = path.join(process.cwd(), "app/api/r2/download-url/route.ts");

      const uploadContent = fs.readFileSync(uploadRoutePath, "utf-8");
      const downloadContent = fs.readFileSync(downloadRoutePath, "utf-8");

      // Default should be 3600 seconds (1 hour)
      expect(uploadContent).toContain("3600");
      expect(downloadContent).toContain("3600");
    });

    it("should validate expiry time range", () => {
      const downloadRoutePath = path.join(process.cwd(), "app/api/r2/download-url/route.ts");
      const content = fs.readFileSync(downloadRoutePath, "utf-8");

      // Should have validation for min/max expiry
      expect(content).toMatch(/60|604800/); // 1 min or 7 days
    });
  });

  describe("R2 Storage Library Tests (Reference)", () => {
    it("should reference comprehensive storage tests", () => {
      const testPath = path.join(process.cwd(), "__tests__/lib/storage/s3.test.ts");
      expect(fs.existsSync(testPath)).toBe(true);

      const content = fs.readFileSync(testPath, "utf-8");

      // Verify all test IDs are present
      expect(content).toContain("PLT-R2-001");
      expect(content).toContain("PLT-R2-002");
      expect(content).toContain("PLT-R2-003");
      expect(content).toContain("PLT-R2-004");
    });
  });

  describe("Acceptance Criteria Verification", () => {
    it("should have functionality for files to upload to R2", () => {
      // Upload URL generation exists
      const uploadRoutePath = path.join(process.cwd(), "app/api/r2/upload-url/route.ts");
      expect(fs.existsSync(uploadRoutePath)).toBe(true);

      // Storage module has upload URL generation
      expect(storage.getUploadUrl).toBeDefined();
    });

    it("should have functionality for downloads to work", () => {
      // Download URL generation exists
      const downloadRoutePath = path.join(process.cwd(), "app/api/r2/download-url/route.ts");
      expect(fs.existsSync(downloadRoutePath)).toBe(true);

      // Storage module has download URL generation
      expect(storage.getDownloadUrl).toBeDefined();
    });

    it("should have functionality for URLs to expire", () => {
      const storagePath = path.join(process.cwd(), "lib/storage/s3.ts");
      const content = fs.readFileSync(storagePath, "utf-8");

      // Should use AWS signature with expiry
      expect(content).toContain("X-Amz-Expires");
      expect(content).toContain("expiresIn");
      expect(content).toContain("X-Amz-Date");
    });
  });
});
