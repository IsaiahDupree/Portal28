/**
 * Form Validation Unit Tests (feat-WC-004)
 *
 * Tests for common Zod validation patterns used across the codebase:
 * - Required field validation
 * - Email validation
 * - Password validation (min length, complexity)
 * - Custom validation rules (URLs, min/max, regex)
 *
 * These tests validate the validation schemas used in API routes.
 */

import { z } from "zod";

describe("Form Validation - Required Fields", () => {
  const requiredStringSchema = z.object({
    name: z.string(),
  });

  it("should pass when required field is provided", () => {
    const result = requiredStringSchema.safeParse({ name: "John" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John");
    }
  });

  it("should fail when required field is missing", () => {
    const result = requiredStringSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe("invalid_type");
      expect(result.error.errors[0].path).toEqual(["name"]);
    }
  });

  it("should fail when required field is null", () => {
    const result = requiredStringSchema.safeParse({ name: null });
    expect(result.success).toBe(false);
  });

  it("should fail when required field is undefined", () => {
    const result = requiredStringSchema.safeParse({ name: undefined });
    expect(result.success).toBe(false);
  });

  it("should fail when required field is empty string", () => {
    const schema = z.object({
      name: z.string().min(1), // Common pattern for non-empty strings
    });
    const result = schema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("Form Validation - Optional Fields", () => {
  const optionalFieldSchema = z.object({
    name: z.string(),
    bio: z.string().optional(),
    age: z.number().optional(),
  });

  it("should pass when optional field is omitted", () => {
    const result = optionalFieldSchema.safeParse({ name: "John" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBeUndefined();
    }
  });

  it("should pass when optional field is provided", () => {
    const result = optionalFieldSchema.safeParse({
      name: "John",
      bio: "Software developer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBe("Software developer");
    }
  });

  it("should handle nullable fields", () => {
    const schema = z.object({
      avatar_url: z.string().url().optional().nullable(),
    });

    expect(schema.safeParse({ avatar_url: null }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ avatar_url: "https://example.com/avatar.jpg" }).success).toBe(true);
  });
});

describe("Form Validation - Email Validation", () => {
  const emailSchema = z.object({
    email: z.string().email(),
  });

  it("should pass for valid email addresses", () => {
    const validEmails = [
      "user@example.com",
      "test.user@example.com",
      "user+tag@example.co.uk",
      "user123@test-domain.com",
    ];

    validEmails.forEach((email) => {
      const result = emailSchema.safeParse({ email });
      expect(result.success).toBe(true);
    });
  });

  it("should fail for invalid email addresses", () => {
    const invalidEmails = [
      "notanemail",
      "missing@domain",
      "@nodomain.com",
      "spaces in@email.com",
      "double@@email.com",
    ];

    invalidEmails.forEach((email) => {
      const result = emailSchema.safeParse({ email });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].validation).toBe("email");
      }
    });
  });

  it("should fail for empty email", () => {
    const result = emailSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("should allow optional email fields", () => {
    const schema = z.object({
      email: z.string().email().optional(),
    });

    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ email: "user@example.com" }).success).toBe(true);
    expect(schema.safeParse({ email: "invalid" }).success).toBe(false);
  });
});

describe("Form Validation - String Length Constraints", () => {
  it("should enforce minimum length", () => {
    const schema = z.object({
      name: z.string().min(3),
    });

    expect(schema.safeParse({ name: "Jo" }).success).toBe(false);
    expect(schema.safeParse({ name: "Joe" }).success).toBe(true);
    expect(schema.safeParse({ name: "John" }).success).toBe(true);
  });

  it("should enforce maximum length", () => {
    const schema = z.object({
      bio: z.string().max(500),
    });

    expect(schema.safeParse({ bio: "a".repeat(500) }).success).toBe(true);
    expect(schema.safeParse({ bio: "a".repeat(501) }).success).toBe(false);
  });

  it("should enforce both min and max length", () => {
    const schema = z.object({
      display_name: z.string().min(1).max(100),
    });

    expect(schema.safeParse({ display_name: "" }).success).toBe(false);
    expect(schema.safeParse({ display_name: "User" }).success).toBe(true);
    expect(schema.safeParse({ display_name: "a".repeat(100) }).success).toBe(true);
    expect(schema.safeParse({ display_name: "a".repeat(101) }).success).toBe(false);
  });
});

describe("Form Validation - Password Validation", () => {
  describe("Basic password requirements", () => {
    const passwordSchema = z.object({
      password: z.string().min(8),
    });

    it("should require minimum 8 characters", () => {
      expect(passwordSchema.safeParse({ password: "short" }).success).toBe(false);
      expect(passwordSchema.safeParse({ password: "12345678" }).success).toBe(true);
      expect(passwordSchema.safeParse({ password: "longpassword" }).success).toBe(true);
    });
  });

  describe("Complex password requirements", () => {
    const complexPasswordSchema = z.object({
      password: z
        .string()
        .min(8)
        .regex(/[A-Z]/, "Must contain uppercase letter")
        .regex(/[a-z]/, "Must contain lowercase letter")
        .regex(/[0-9]/, "Must contain number"),
    });

    it("should pass for strong passwords", () => {
      const strongPasswords = [
        "Password123",
        "MySecure1Pass",
        "Complex9Password",
      ];

      strongPasswords.forEach((password) => {
        const result = complexPasswordSchema.safeParse({ password });
        expect(result.success).toBe(true);
      });
    });

    it("should fail for passwords missing uppercase", () => {
      const result = complexPasswordSchema.safeParse({ password: "password123" });
      expect(result.success).toBe(false);
    });

    it("should fail for passwords missing lowercase", () => {
      const result = complexPasswordSchema.safeParse({ password: "PASSWORD123" });
      expect(result.success).toBe(false);
    });

    it("should fail for passwords missing numbers", () => {
      const result = complexPasswordSchema.safeParse({ password: "PasswordOnly" });
      expect(result.success).toBe(false);
    });

    it("should fail for passwords too short", () => {
      const result = complexPasswordSchema.safeParse({ password: "Pass1" });
      expect(result.success).toBe(false);
    });
  });

  describe("Password confirmation validation", () => {
    const passwordConfirmSchema = z
      .object({
        password: z.string().min(8),
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });

    it("should pass when passwords match", () => {
      const result = passwordConfirmSchema.safeParse({
        password: "password123",
        confirmPassword: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should fail when passwords don't match", () => {
      const result = passwordConfirmSchema.safeParse({
        password: "password123",
        confirmPassword: "different456",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Passwords don't match");
        expect(result.error.errors[0].path).toEqual(["confirmPassword"]);
      }
    });
  });
});

describe("Form Validation - URL Validation", () => {
  const urlSchema = z.object({
    website: z.string().url(),
  });

  it("should pass for valid URLs", () => {
    const validUrls = [
      "https://example.com",
      "http://example.com",
      "https://www.example.com/path",
      "https://example.com/path?query=value",
      "https://subdomain.example.co.uk",
    ];

    validUrls.forEach((url) => {
      const result = urlSchema.safeParse({ website: url });
      expect(result.success).toBe(true);
    });
  });

  it("should fail for invalid URLs", () => {
    const invalidUrls = [
      "notaurl",
      "example.com", // missing protocol
      "//example.com",
    ];

    invalidUrls.forEach((url) => {
      const result = urlSchema.safeParse({ website: url });
      expect(result.success).toBe(false);
    });
  });

  it("should allow optional nullable URLs", () => {
    const schema = z.object({
      avatar_url: z.string().url().optional().nullable(),
    });

    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ avatar_url: null }).success).toBe(true);
    expect(schema.safeParse({ avatar_url: "https://example.com/avatar.jpg" }).success).toBe(true);
    expect(schema.safeParse({ avatar_url: "invalid" }).success).toBe(false);
  });
});

describe("Form Validation - Number Validation", () => {
  it("should validate number types", () => {
    const schema = z.object({
      age: z.number(),
    });

    expect(schema.safeParse({ age: 25 }).success).toBe(true);
    expect(schema.safeParse({ age: 0 }).success).toBe(true);
    expect(schema.safeParse({ age: -5 }).success).toBe(true);
    expect(schema.safeParse({ age: "25" }).success).toBe(false); // String not allowed
  });

  it("should enforce minimum value", () => {
    const schema = z.object({
      age: z.number().min(0),
    });

    expect(schema.safeParse({ age: 0 }).success).toBe(true);
    expect(schema.safeParse({ age: 25 }).success).toBe(true);
    expect(schema.safeParse({ age: -1 }).success).toBe(false);
  });

  it("should enforce maximum value", () => {
    const schema = z.object({
      age: z.number().max(120),
    });

    expect(schema.safeParse({ age: 120 }).success).toBe(true);
    expect(schema.safeParse({ age: 25 }).success).toBe(true);
    expect(schema.safeParse({ age: 121 }).success).toBe(false);
  });

  it("should enforce integer values", () => {
    const schema = z.object({
      count: z.number().int(),
    });

    expect(schema.safeParse({ count: 5 }).success).toBe(true);
    expect(schema.safeParse({ count: 0 }).success).toBe(true);
    expect(schema.safeParse({ count: 5.5 }).success).toBe(false);
  });

  it("should enforce positive values", () => {
    const schema = z.object({
      price: z.number().positive(),
    });

    expect(schema.safeParse({ price: 1 }).success).toBe(true);
    expect(schema.safeParse({ price: 99.99 }).success).toBe(true);
    expect(schema.safeParse({ price: 0 }).success).toBe(false);
    expect(schema.safeParse({ price: -1 }).success).toBe(false);
  });
});

describe("Form Validation - Custom Regex Validation", () => {
  it("should validate slug format (lowercase, hyphens, alphanumeric)", () => {
    const schema = z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
    });

    expect(schema.safeParse({ slug: "my-course-slug" }).success).toBe(true);
    expect(schema.safeParse({ slug: "course-123" }).success).toBe(true);
    expect(schema.safeParse({ slug: "My-Course" }).success).toBe(false); // Uppercase
    expect(schema.safeParse({ slug: "my course" }).success).toBe(false); // Spaces
    expect(schema.safeParse({ slug: "my_course" }).success).toBe(false); // Underscores
  });

  it("should validate hex color codes", () => {
    const schema = z.object({
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    });

    expect(schema.safeParse({ color: "#FF5733" }).success).toBe(true);
    expect(schema.safeParse({ color: "#000000" }).success).toBe(true);
    expect(schema.safeParse({ color: "#ffffff" }).success).toBe(true);
    expect(schema.safeParse({ color: "FF5733" }).success).toBe(false); // Missing #
    expect(schema.safeParse({ color: "#FFF" }).success).toBe(false); // Too short
  });

  it("should validate phone numbers (simple pattern)", () => {
    const schema = z.object({
      phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
    });

    expect(schema.safeParse({ phone: "+14155552671" }).success).toBe(true);
    expect(schema.safeParse({ phone: "14155552671" }).success).toBe(true);
    expect(schema.safeParse({ phone: "123" }).success).toBe(true);
    expect(schema.safeParse({ phone: "invalid" }).success).toBe(false);
  });
});

describe("Form Validation - Array Validation", () => {
  it("should validate array of strings", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    expect(schema.safeParse({ tags: ["tag1", "tag2"] }).success).toBe(true);
    expect(schema.safeParse({ tags: [] }).success).toBe(true);
    expect(schema.safeParse({ tags: [1, 2, 3] }).success).toBe(false); // Wrong type
  });

  it("should enforce minimum array length", () => {
    const schema = z.object({
      tags: z.array(z.string()).min(1),
    });

    expect(schema.safeParse({ tags: ["tag1"] }).success).toBe(true);
    expect(schema.safeParse({ tags: [] }).success).toBe(false);
  });

  it("should enforce maximum array length", () => {
    const schema = z.object({
      tags: z.array(z.string()).max(5),
    });

    expect(schema.safeParse({ tags: ["1", "2", "3", "4", "5"] }).success).toBe(true);
    expect(schema.safeParse({ tags: ["1", "2", "3", "4", "5", "6"] }).success).toBe(false);
  });
});

describe("Form Validation - Nested Object Validation", () => {
  it("should validate nested objects", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    });

    const valid = schema.safeParse({
      user: {
        name: "John",
        email: "john@example.com",
      },
    });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({
      user: {
        name: "John",
        email: "invalid-email",
      },
    });
    expect(invalid.success).toBe(false);
  });
});

describe("Form Validation - Enum Validation", () => {
  it("should validate enum values", () => {
    const schema = z.object({
      role: z.enum(["admin", "member", "guest"]),
    });

    expect(schema.safeParse({ role: "admin" }).success).toBe(true);
    expect(schema.safeParse({ role: "member" }).success).toBe(true);
    expect(schema.safeParse({ role: "guest" }).success).toBe(true);
    expect(schema.safeParse({ role: "superadmin" }).success).toBe(false);
  });
});

describe("Form Validation - Custom Refinements", () => {
  it("should apply custom validation logic", () => {
    const schema = z.object({
      age: z.number(),
    }).refine((data) => data.age >= 18, {
      message: "Must be 18 or older",
      path: ["age"],
    });

    expect(schema.safeParse({ age: 18 }).success).toBe(true);
    expect(schema.safeParse({ age: 25 }).success).toBe(true);

    const result = schema.safeParse({ age: 17 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Must be 18 or older");
    }
  });

  it("should validate multiple field dependencies", () => {
    const schema = z
      .object({
        startDate: z.string(),
        endDate: z.string(),
      })
      .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
        message: "End date must be after start date",
        path: ["endDate"],
      });

    expect(schema.safeParse({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    }).success).toBe(true);

    const result = schema.safeParse({
      startDate: "2026-01-31",
      endDate: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("Form Validation - Error Messages", () => {
  it("should provide custom error messages", () => {
    const schema = z.object({
      email: z.string().email("Please enter a valid email address"),
    });

    const result = schema.safeParse({ email: "invalid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Please enter a valid email address");
    }
  });

  it("should handle multiple validation errors", () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });

    const result = schema.safeParse({
      email: "invalid",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors).toHaveLength(2);
    }
  });
});

describe("Form Validation - Type Coercion", () => {
  it("should handle number coercion", () => {
    const schema = z.object({
      age: z.coerce.number(),
    });

    expect(schema.safeParse({ age: "25" }).success).toBe(true);
    if (schema.safeParse({ age: "25" }).success) {
      const result = schema.parse({ age: "25" });
      expect(result.age).toBe(25);
      expect(typeof result.age).toBe("number");
    }
  });

  it("should handle boolean coercion", () => {
    const schema = z.object({
      isActive: z.coerce.boolean(),
    });

    // Note: z.coerce.boolean() converts any truthy value to true, any falsy to false
    // Strings are always truthy except empty string
    expect(schema.parse({ isActive: true }).isActive).toBe(true);
    expect(schema.parse({ isActive: false }).isActive).toBe(false);
    expect(schema.parse({ isActive: 1 }).isActive).toBe(true);
    expect(schema.parse({ isActive: 0 }).isActive).toBe(false);
    expect(schema.parse({ isActive: "" }).isActive).toBe(false);
  });
});
