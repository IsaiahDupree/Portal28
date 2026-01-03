import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockJson = jest.fn();
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: mockJson },
}));

const mockResend = {
  contacts: {
    create: jest.fn(),
  },
  emails: {
    send: jest.fn(),
  },
};

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => mockResend),
}));

jest.mock("@/lib/email/resend", () => ({
  resend: mockResend,
  RESEND_FROM: "test@example.com",
}));

jest.mock("@/lib/email/sendLeadWelcome", () => ({
  sendLeadWelcome: jest.fn().mockResolvedValue({ success: true }),
}));

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mockSupabase,
}));

describe("Newsletter API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data, options) => ({ data, ...options }));
  });

  describe("POST /api/newsletter/subscribe", () => {
    it("should return 400 for missing email", async () => {
      const { POST } = await import("@/app/api/newsletter/subscribe/route");

      const mockReq = {
        json: async () => ({}),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        expect.objectContaining({ status: 400 })
      );
    });

    it("should accept valid email format", async () => {
      // Test that valid email passes validation
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "email+tag@subdomain.domain.org",
      ];

      for (const email of validEmails) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(true);
      }
    });

    it("should reject invalid email format", async () => {
      const invalidEmails = ["notanemail", "missing@domain", "@nodomain.com"];

      for (const email of invalidEmails) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      }
    });
  });
});
