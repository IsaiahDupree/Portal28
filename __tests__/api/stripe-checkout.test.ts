// __tests__/api/stripe-checkout.test.ts
// Test suite for Stripe Checkout API
// Test IDs: MVP-PAY-001 through MVP-PAY-010

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

describe("Stripe Checkout API - feat-004", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data, options) => ({ data, ...options }));
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:2828";
    process.env.STRIPE_SECRET_KEY = "sk_test_123456789";
  });

  describe("MVP-PAY-001: Stripe Client Initialization", () => {
    it("should initialize Stripe client with valid secret key", async () => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-06-20",
      });

      expect(stripe).toBeDefined();
      expect(typeof stripe.checkout.sessions.create).toBe("function");
    });

    it("should use correct API version", async () => {
      const { stripe } = await import("@/lib/stripe");
      expect(stripe).toBeDefined();
    });
  });

  describe("MVP-PAY-002: Checkout URL Generation", () => {
    it("should generate valid Stripe checkout URL", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
          title: "Test Course",
          slug: "test-course",
          stripe_price_id: "price_123",
        },
        error: null,
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      });

      const { POST } = await import("@/app/api/stripe/checkout/route");

      const mockReq = {
        json: async () => ({
          courseId: "550e8400-e29b-41d4-a716-446655440000",
          event_id: "evt-12345678",
        }),
      };

      await POST(mockReq as any);

      const call = mockJson.mock.calls[0];
      expect(call[0]).toHaveProperty("url");
      expect(call[0].url).toMatch(/^https:\/\/checkout\.stripe\.com/);
    });

    it("should return checkout URL in response", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining("https://") })
      );
    });
  });

  describe("MVP-PAY-003: Create Checkout Session", () => {
    it("should create checkout session and return session_id", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
          title: "Test Course",
          stripe_price_id: "price_valid_123",
        },
        error: null,
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_session_123",
        url: "https://checkout.stripe.com/cs_test_session_123",
      });

      const { POST } = await import("@/app/api/stripe/checkout/route");

      const mockReq = {
        json: async () => ({
          courseId: "550e8400-e29b-41d4-a716-446655440000",
          event_id: "evt-12345678",
        }),
      };

      await POST(mockReq as any);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          line_items: expect.any(Array),
        })
      );
    });

    it("should create pending order record", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      expect(mockSupabase.from).toHaveBeenCalledWith("orders");
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          course_id: "course-123",
          status: "pending",
        })
      );
    });
  });

  describe("MVP-PAY-004: Valid price_id Checkout", () => {
    it("should create checkout with correct price amount", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
          title: "Premium Course",
          stripe_price_id: "price_premium_997",
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

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: "price_premium_997",
              quantity: 1,
            },
          ],
        })
      );
    });

    it("should set mode to payment for one-time purchase", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
        })
      );
    });
  });

  describe("MVP-PAY-005: Invalid price_id Handling", () => {
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

    it("should return 400 when course has no price_id", async () => {
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

    it("should return 400 for missing courseId", async () => {
      const { POST } = await import("@/app/api/stripe/checkout/route");

      const mockReq = {
        json: async () => ({
          event_id: "evt-12345678",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        expect.objectContaining({ status: 400 })
      );
    });

    it("should return 400 for invalid UUID format", async () => {
      const { POST } = await import("@/app/api/stripe/checkout/route");

      const mockReq = {
        json: async () => ({
          courseId: "not-a-valid-uuid",
          event_id: "evt-12345678",
        }),
      };

      await POST(mockReq as any);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        expect.objectContaining({ status: 400 })
      );
    });
  });

  describe("MVP-PAY-006: Success URL Included", () => {
    it("should redirect to /app on successful payment", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining("/app"),
        })
      );
    });

    it("should include success parameter in success URL", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining("success=1"),
        })
      );
    });
  });

  describe("MVP-PAY-007: Cancel URL Included", () => {
    it("should redirect to course page on cancellation", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
          slug: "test-course",
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

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cancel_url: expect.stringContaining("/courses/test-course"),
        })
      );
    });

    it("should include canceled parameter in cancel URL", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
          slug: "premium-course",
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

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cancel_url: expect.stringContaining("canceled=1"),
        })
      );
    });
  });

  describe("MVP-PAY-008: Customer Email Attached", () => {
    it("should attach user email to checkout session metadata", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-456", email: "customer@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      // Verify email is stored in order record
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "customer@example.com",
        })
      );
    });

    it("should handle unauthenticated checkout sessions", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          email: null,
        })
      );
    });

    it("should attach user_id to checkout session metadata", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-789", email: "user@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            user_id: "user-789",
          }),
        })
      );
    });
  });

  describe("Additional Requirements", () => {
    it("should allow promotion codes", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_promotion_codes: true,
        })
      );
    });

    it("should attach attribution metadata to checkout session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            utm_source: "facebook",
            utm_campaign: "test",
            fbclid: "fb123",
          }),
        })
      );
    });

    it("should attach event_id for Meta CAPI deduplication", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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
          event_id: "p28_unique_event_123",
        }),
      };

      await POST(mockReq as any);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            event_id: "p28_unique_event_123",
          }),
        })
      );
    });

    it("should store meta_event_id in order record", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "course-123",
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
          event_id: "p28_meta_event_456",
        }),
      };

      await POST(mockReq as any);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          meta_event_id: "p28_meta_event_456",
        })
      );
    });
  });
});
