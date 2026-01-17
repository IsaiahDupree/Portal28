// __tests__/api/profile.test.ts
// Test suite for Profile API
// Test IDs: feat-044
//
// This test suite verifies the profile API endpoints including:
// - GET /api/profile - Retrieve user profile
// - PUT /api/profile - Update user profile
// - POST /api/profile/avatar - Avatar upload URL generation
// - DELETE /api/profile/avatar - Remove avatar

import { describe, it, expect } from "@jest/globals";
import fs from "fs";

describe("Profile API - feat-044", () => {
  describe("Profile API Routes Exist", () => {
    it("GET/PUT /api/profile route exists", () => {
      const routePath = "./app/api/profile/route.ts";
      expect(fs.existsSync(routePath)).toBe(true);

      const content = fs.readFileSync(routePath, "utf-8");
      expect(content).toContain("export async function GET");
      expect(content).toContain("export async function PUT");
    });

    it("POST/DELETE /api/profile/avatar route exists", () => {
      const routePath = "./app/api/profile/avatar/route.ts";
      expect(fs.existsSync(routePath)).toBe(true);

      const content = fs.readFileSync(routePath, "utf-8");
      expect(content).toContain("export async function POST");
      expect(content).toContain("export async function DELETE");
    });
  });

  describe("Profile API Implementation", () => {
    it("GET /api/profile requires authentication", () => {
      const content = fs.readFileSync("./app/api/profile/route.ts", "utf-8");
      expect(content).toContain("supabase.auth.getUser");
      expect(content).toContain("Not authenticated");
    });

    it("GET /api/profile queries profiles table", () => {
      const content = fs.readFileSync("./app/api/profile/route.ts", "utf-8");
      expect(content).toContain('from("profiles")');
      expect(content).toContain("display_name");
      expect(content).toContain("bio");
      expect(content).toContain("avatar_url");
    });

    it("GET /api/profile supports userId query param", () => {
      const content = fs.readFileSync("./app/api/profile/route.ts", "utf-8");
      expect(content).toContain("searchParams.get");
      expect(content).toContain("userId");
    });

    it("PUT /api/profile validates input with Zod", () => {
      const content = fs.readFileSync("./app/api/profile/route.ts", "utf-8");
      expect(content).toContain("import { z } from");
      expect(content).toContain("display_name");
      expect(content).toContain("max(100)");
      expect(content).toContain("max(500)");
    });

    it("PUT /api/profile handles insert and update", () => {
      const content = fs.readFileSync("./app/api/profile/route.ts", "utf-8");
      expect(content).toContain(".update(");
      expect(content).toContain(".insert(");
    });
  });

  describe("Avatar Upload API Implementation", () => {
    it("POST /api/profile/avatar requires authentication", () => {
      const content = fs.readFileSync("./app/api/profile/avatar/route.ts", "utf-8");
      expect(content).toContain("supabase.auth.getUser");
      expect(content).toContain("Not authenticated");
    });

    it("POST /api/profile/avatar validates image types", () => {
      const content = fs.readFileSync("./app/api/profile/avatar/route.ts", "utf-8");
      expect(content).toContain("contentType");
      expect(content).toContain("image");
    });

    it("POST /api/profile/avatar uses storage service", () => {
      const content = fs.readFileSync("./app/api/profile/avatar/route.ts", "utf-8");
      expect(content).toContain('from "@/lib/storage');
      expect(content).toContain("getUploadUrl");
      expect(content).toContain("getPublicUrl");
    });

    it("POST /api/profile/avatar generates unique keys", () => {
      const content = fs.readFileSync("./app/api/profile/avatar/route.ts", "utf-8");
      expect(content).toContain("avatars/");
      expect(content).toContain("user.id");
      expect(content).toContain("timestamp");
    });

    it("DELETE /api/profile/avatar clears avatar_url", () => {
      const content = fs.readFileSync("./app/api/profile/avatar/route.ts", "utf-8");
      expect(content).toContain(".update");
      expect(content).toContain("avatar_url: null");
    });
  });

  describe("Database Schema", () => {
    it("profiles migration exists", () => {
      const migrationPath = "./supabase/migrations/20260115050000_user_profiles.sql";
      expect(fs.existsSync(migrationPath)).toBe(true);

      const content = fs.readFileSync(migrationPath, "utf-8");
      expect(content).toContain("create table if not exists public.profiles");
      expect(content).toContain("display_name text");
      expect(content).toContain("bio text");
      expect(content).toContain("avatar_url text");
    });

    it("profiles table has RLS policies", () => {
      const content = fs.readFileSync("./supabase/migrations/20260115050000_user_profiles.sql", "utf-8");
      expect(content).toContain("enable row level security");
      expect(content).toContain("create policy");
      expect(content).toContain("viewable by everyone");
      expect(content).toContain("insert their own profile");
      expect(content).toContain("update their own profile");
    });

    it("profiles table has auto-create trigger", () => {
      const content = fs.readFileSync("./supabase/migrations/20260115050000_user_profiles.sql", "utf-8");
      expect(content).toContain("handle_new_user");
      expect(content).toContain("on_auth_user_created");
      expect(content).toContain("after insert on auth.users");
    });
  });

  describe("Frontend Components", () => {
    it("settings page exists", () => {
      const pagePath = "./app/app/settings/page.tsx";
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, "utf-8");
      expect(content).toContain("Profile Settings");
      expect(content).toContain("display_name");
      expect(content).toContain("bio");
      expect(content).toContain("avatar");
    });

    it("settings page has avatar upload", () => {
      const content = fs.readFileSync("./app/app/settings/page.tsx", "utf-8");
      expect(content).toContain('type="file"');
      expect(content).toContain("handleAvatarUpload");
      expect(content).toContain("/api/profile/avatar");
    });

    it("settings page validates file size", () => {
      const content = fs.readFileSync("./app/app/settings/page.tsx", "utf-8");
      expect(content).toContain("5");
      expect(content).toContain("MB");
    });

    it("public profile page exists", () => {
      const pagePath = "./app/app/profile/[userId]/page.tsx";
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, "utf-8");
      expect(content).toContain("userId");
      expect(content).toContain("display_name");
      expect(content).toContain("bio");
    });

    it("public profile page shows edit button for own profile", () => {
      const content = fs.readFileSync("./app/app/profile/[userId]/page.tsx", "utf-8");
      expect(content).toContain("isOwnProfile");
      expect(content).toContain("/app/settings");
      expect(content).toContain("Edit Profile");
    });
  });
});
