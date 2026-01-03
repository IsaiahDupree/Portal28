import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockJson = jest.fn();
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: mockJson },
}));

const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
};

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

jest.mock("@/lib/attribution/cookie", () => ({
  getAttribCookie: () => ({
    utm_source: "facebook",
    utm_campaign: "test",
    fbclid: "fb123",
  }),
}));

describe("Stripe Checkout API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data, options) => ({ data, ...options }));
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  describe("POST /api/stripe/checkout", () => {
    it("should return 400 for invalid request body", async () => {
      const { POST } = await import("@/app/api/stripe/checkout/route");

      const mockReq = {
        json: async () => ({}),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        expect.objectContaining({ status: 400 })
      );
    });

    it("should return 400 when course has no price", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: { id: "course-123", title: "Test Course", stripe_price_id: null },
        error: null,
      });

      const { POST } = await import("@/app/api/stripe/checkout/route");

      const mockReq = {
        json: async () => ({
          courseId: "550e8400-e29b-41d4-a716-446655440000",
          event_id: "evt-12345678",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Course not purchasable" }),
        expect.objectContaining({ status: 400 })
      );
    });

    it("should create checkout session successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
          title: "Test Course",
          stripe_price_id: "price_123",
        },
        error: null,
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_123",
        url: "https://checkout.stripe.com/cs_123",
      });

      const { POST } = await import("@/app/api/stripe/checkout/route");

      const mockReq = {
        json: async () => ({
          courseId: "550e8400-e29b-41d4-a716-446655440000",
          event_id: "evt-12345678",
        }),
      };

      await POST(mockReq as any);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.any(String) })
      );
    });
  });
});
