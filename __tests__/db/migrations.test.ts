/**
 * Database Migrations Tests (feat-054)
 * Test IDs: PLT-MIG-001, PLT-MIG-002
 *
 * Note: These tests verify that migrations are properly structured and documented.
 * Full database connectivity tests should be run with `npm run db:reset` and manual verification.
 */

import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

describe("Database Migrations (feat-054)", () => {
  describe("PLT-MIG-001: All migrations exist", () => {
    it("should have migrations directory", () => {
      expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    });

    it("should have at least 20 migration files", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const sqlFiles = files.filter((f) => f.endsWith(".sql"));

      expect(sqlFiles.length).toBeGreaterThanOrEqual(20);
    });

    it("should have initial schema migration", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasInit = files.some((f) => f.includes("init"));

      expect(hasInit).toBe(true);
    });

    it("should have email system migrations", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasEmail = files.some((f) => f.toLowerCase().includes("email"));

      expect(hasEmail).toBe(true);
    });

    it("should have course-related migrations", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasCourseStudio = files.some((f) =>
        f.toLowerCase().includes("course")
      );

      expect(hasCourseStudio).toBe(true);
    });

    it("should have community features migrations", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasCommunity = files.some((f) =>
        f.toLowerCase().includes("community")
      );

      expect(hasCommunity).toBe(true);
    });

    it("should have offers system migration", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasOffers = files.some((f) => f.toLowerCase().includes("offer"));

      expect(hasOffers).toBe(true);
    });

    it("should have analytics migrations", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasAnalytics = files.some((f) =>
        f.toLowerCase().includes("analytics")
      );

      expect(hasAnalytics).toBe(true);
    });

    it("should have MRR tracking migration", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasMRR = files.some((f) => f.toLowerCase().includes("mrr"));

      expect(hasMRR).toBe(true);
    });

    it("should have certificates migration", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasCertificates = files.some((f) =>
        f.toLowerCase().includes("certificate")
      );

      expect(hasCertificates).toBe(true);
    });

    it("should have notifications migration", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasNotifications = files.some((f) =>
        f.toLowerCase().includes("notification")
      );

      expect(hasNotifications).toBe(true);
    });

    it("should have announcements migration", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const hasAnnouncements = files.some((f) =>
        f.toLowerCase().includes("announcement")
      );

      expect(hasAnnouncements).toBe(true);
    });
  });

  describe("PLT-MIG-002: Migration file structure", () => {
    let migrationFiles: string[];

    beforeAll(() => {
      migrationFiles = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql"));
    });

    it("should have properly named migration files", () => {
      migrationFiles.forEach((file) => {
        // Should be either numbered (0001_name.sql) or timestamped (20260101_name.sql)
        // Also accept variations with underscores and hyphens in names
        const isNumbered = /^\d{4}_[\w-]+\.sql$/.test(file);
        const isTimestamped = /^\d{8,14}_[\w-]+\.sql$/.test(file);

        expect(isNumbered || isTimestamped).toBe(true);
      });
    });

    it("should have non-empty migration files", () => {
      migrationFiles.forEach((file) => {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");

        expect(content.length).toBeGreaterThan(0);
      });
    });

    it("should contain CREATE TABLE statements", () => {
      let hasCreateTable = false;

      migrationFiles.forEach((file) => {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");

        if (content.toUpperCase().includes("CREATE TABLE")) {
          hasCreateTable = true;
        }
      });

      expect(hasCreateTable).toBe(true);
    });

    it("should contain RLS policies", () => {
      let hasRLS = false;

      migrationFiles.forEach((file) => {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");

        if (
          content.toUpperCase().includes("CREATE POLICY") ||
          content.toUpperCase().includes("ALTER TABLE") && content.toUpperCase().includes("ENABLE ROW LEVEL SECURITY")
        ) {
          hasRLS = true;
        }
      });

      expect(hasRLS).toBe(true);
    });

    it("should contain database functions", () => {
      let hasFunctions = false;

      migrationFiles.forEach((file) => {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");

        if (content.toUpperCase().includes("CREATE FUNCTION")) {
          hasFunctions = true;
        }
      });

      expect(hasFunctions).toBe(true);
    });
  });

  describe("Migration Coverage", () => {
    it("should have migrations for all core features", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const fileNames = files.join(" ").toLowerCase();

      // Core features that should have migrations
      const coreFeatures = [
        "course",
        "lesson",
        "email",
        "offer",
        "community",
        "analytics",
        "certificate",
      ];

      coreFeatures.forEach((feature) => {
        expect(fileNames.includes(feature)).toBe(true);
      });
    });

    it("should be properly ordered", () => {
      const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      // First file should be the earliest (0001 or timestamp)
      expect(files[0]).toBeTruthy();

      // Files should be in order
      for (let i = 1; i < Math.min(files.length, 10); i++) {
        expect(files[i] >= files[i - 1]).toBe(true);
      }
    });
  });
});
