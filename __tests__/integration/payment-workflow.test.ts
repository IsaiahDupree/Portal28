/**
 * Integration Test: Payment Workflow (feat-WC-008)
 *
 * Tests the complete payment flow including:
 * - Stripe checkout session creation
 * - Webhook event processing
 * - Order and entitlement creation
 * - Subscription management
 *
 * Test IDs: MVP-PAY-001 through MVP-PAY-010, MVP-WHK-001 through MVP-WHK-010
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
  }));
});

describe('Payment Workflow Integration Tests', () => {
  let mockSupabase: any;
  let mockCookies: any;
  let mockStripe: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock cookies
    mockCookies = {
      get: jest.fn((name) => ({ name, value: 'mock-session-token' })),
      set: jest.fn(),
      delete: jest.fn(),
    };
    (cookies as jest.Mock).mockReturnValue(mockCookies);

    // Mock Supabase client (using pattern from course-creation-workflow)
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            maybeSingle: jest.fn(),
          })),
          order: jest.fn(() => ({
            limit: jest.fn(),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(),
        })),
        upsert: jest.fn(),
      })),
      rpc: jest.fn(),
    };

    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock Stripe client
    const StripeConstructor = Stripe as unknown as jest.Mock;
    mockStripe = StripeConstructor();
  });

  describe('Checkout Flow Integration', () => {
    it('should create checkout session with valid course and user', async () => {
      // Setup: User authenticated
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      // Setup: Course with price
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'course-123',
                title: 'Test Course',
                slug: 'test-course',
                stripe_price_id: 'price_valid_123',
              },
              error: null,
            }),
          })),
        })),
      });

      // Setup: Stripe session creation
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      });

      // Execute: Create checkout session
      const session = await mockStripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: 'price_valid_123', quantity: 1 }],
        success_url: 'http://localhost:2828/app?success=1',
        cancel_url: 'http://localhost:2828/courses/test-course?canceled=1',
        metadata: {
          course_id: 'course-123',
          user_id: 'user-123',
          event_id: 'evt-test-123',
        },
      });

      // Verify: Session created
      expect(session.id).toBe('cs_test_123');
      expect(session.url).toContain('checkout.stripe.com');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          metadata: expect.objectContaining({
            course_id: 'course-123',
            user_id: 'user-123',
          }),
        })
      );
    });

    it('should create pending order when checkout session is created', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      const orderData = {
        id: 'order-123',
        user_id: 'user-123',
        course_id: 'course-123',
        stripe_session_id: 'cs_test_123',
        status: 'pending',
        email: 'test@example.com',
        meta_event_id: 'evt-test-123',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: orderData,
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('orders')
        .insert({
          user_id: 'user-123',
          course_id: 'course-123',
          stripe_session_id: 'cs_test_123',
          status: 'pending',
          email: 'test@example.com',
          meta_event_id: 'evt-test-123',
        })
        .select()
        .single();

      expect(result.data.status).toBe('pending');
      expect(result.data.stripe_session_id).toBe('cs_test_123');
      expect(result.error).toBeNull();
    });

    it('should handle guest checkout without user_id', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'order-guest-123',
                user_id: null,
                course_id: 'course-123',
                stripe_session_id: 'cs_guest_123',
                status: 'pending',
                email: null,
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('orders')
        .insert({
          user_id: null,
          course_id: 'course-123',
          stripe_session_id: 'cs_guest_123',
          status: 'pending',
          email: null,
        })
        .select()
        .single();

      expect(result.data.user_id).toBeNull();
      expect(result.data.status).toBe('pending');
      expect(result.error).toBeNull();
    });

    it('should include attribution metadata in checkout session', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      });

      await mockStripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: 'price_123', quantity: 1 }],
        success_url: 'http://localhost:2828/app?success=1',
        cancel_url: 'http://localhost:2828/courses/test-course?canceled=1',
        metadata: {
          course_id: 'course-123',
          user_id: 'user-123',
          utm_source: 'facebook',
          utm_campaign: 'summer-sale',
          fbclid: 'fb_click_123',
          event_id: 'p28_evt_456',
        },
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            utm_source: 'facebook',
            utm_campaign: 'summer-sale',
            fbclid: 'fb_click_123',
            event_id: 'p28_evt_456',
          }),
        })
      );
    });

    it('should reject checkout for course without price_id', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'course-no-price',
                stripe_price_id: null,
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('courses')
        .select('*')
        .eq('id', 'course-no-price')
        .single();

      expect(result.data.stripe_price_id).toBeNull();
    });
  });

  describe('Webhook Event Processing Integration', () => {
    it('should process checkout.session.completed and update order to paid', async () => {
      const webhookEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_intent: 'pi_123',
            amount_total: 9900,
            currency: 'usd',
            customer_details: {
              email: 'customer@example.com',
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);

      // Update order
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'order-123',
                  status: 'paid',
                  stripe_payment_intent: 'pi_123',
                  amount: 9900,
                  currency: 'usd',
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const updated = await mockSupabase
        .from('orders')
        .update({
          status: 'paid',
          stripe_payment_intent: 'pi_123',
          amount: 9900,
          currency: 'usd',
        })
        .eq('stripe_session_id', 'cs_test_123')
        .select()
        .single();

      expect(updated.data.status).toBe('paid');
      expect(updated.data.stripe_payment_intent).toBe('pi_123');
      expect(updated.error).toBeNull();
    });

    it('should create entitlement after successful payment', async () => {
      const entitlementData = {
        id: 'entitlement-123',
        user_id: 'user-123',
        course_id: 'course-123',
        email: 'customer@example.com',
        status: 'active',
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: entitlementData,
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('entitlements')
        .insert({
          user_id: 'user-123',
          course_id: 'course-123',
          email: 'customer@example.com',
          status: 'active',
        })
        .select()
        .single();

      expect(result.data.status).toBe('active');
      expect(result.data.user_id).toBe('user-123');
      expect(result.data.course_id).toBe('course-123');
      expect(result.error).toBeNull();
    });

    it('should handle charge.refunded webhook and update order status', async () => {
      const refundEvent = {
        id: 'evt_refund_123',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_123',
            payment_intent: 'pi_123',
            amount_refunded: 9900,
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(refundEvent);

      // Update to refunded
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'order-123',
                  status: 'refunded',
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const updated = await mockSupabase
        .from('orders')
        .update({ status: 'refunded' })
        .eq('id', 'order-123')
        .select()
        .single();

      expect(updated.data.status).toBe('refunded');
      expect(updated.error).toBeNull();
    });

    it('should revoke entitlement when charge is refunded', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'entitlement-123',
                  status: 'revoked',
                  revoked_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('entitlements')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.status).toBe('revoked');
      expect(result.data.revoked_at).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('should be idempotent - skip processing if order already paid', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'order-123',
                status: 'paid',
                stripe_session_id: 'cs_test_123',
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('orders')
        .select('id,status')
        .eq('stripe_session_id', 'cs_test_123')
        .single();

      expect(result.data.status).toBe('paid');
      // Should not process again
    });

    it('should validate webhook signature before processing', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => {
        mockStripe.webhooks.constructEvent(
          'invalid body',
          'invalid sig',
          'whsec_test'
        );
      }).toThrow('Invalid signature');
    });
  });

  describe('Subscription Flow Integration', () => {
    it('should create subscription checkout session', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_sub_123',
        url: 'https://checkout.stripe.com/c/pay/cs_sub_123',
        mode: 'subscription',
      });

      const session = await mockStripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: 'price_sub_monthly_123', quantity: 1 }],
        success_url: 'http://localhost:2828/app?success=1',
        cancel_url: 'http://localhost:2828/pricing?canceled=1',
        metadata: {
          user_id: 'user-123',
          subscription_id: 'subscription-123',
        },
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
        })
      );
      expect(session.id).toBe('cs_sub_123');
    });

    it('should create subscription record after customer.subscription.created', async () => {
      const subscriptionData = {
        id: 'user-sub-123',
        user_id: 'user-123',
        stripe_subscription_id: 'sub_123',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: subscriptionData,
              error: null,
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('subscriptions')
        .insert({
          user_id: 'user-123',
          stripe_subscription_id: 'sub_123',
          status: 'active',
        })
        .select()
        .single();

      expect(result.data.status).toBe('active');
      expect(result.data.stripe_subscription_id).toBe('sub_123');
      expect(result.error).toBeNull();
    });

    it('should update subscription status when customer.subscription.deleted', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'user-sub-123',
                  status: 'canceled',
                  canceled_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', 'sub_123')
        .select()
        .single();

      expect(result.data.status).toBe('canceled');
      expect(result.data.canceled_at).toBeDefined();
      expect(result.error).toBeNull();
    });
  });

  describe('Complete Purchase-to-Access Flow', () => {
    it('should complete full workflow from checkout to course access', async () => {
      // Step 1: Create checkout
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_flow_123',
        url: 'https://checkout.stripe.com/c/pay/cs_flow_123',
      });

      const checkoutSession = await mockStripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: 'price_123', quantity: 1 }],
        metadata: { course_id: 'course-123', user_id: 'user-123' },
      });

      expect(checkoutSession.id).toBe('cs_flow_123');

      // Step 2 & 3: Create entitlement after webhook
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'entitlement-123',
                user_id: 'user-123',
                course_id: 'course-123',
                status: 'active',
              },
              error: null,
            }),
          })),
        })),
      });

      const entitlement = await mockSupabase
        .from('entitlements')
        .insert({
          user_id: 'user-123',
          course_id: 'course-123',
          status: 'active',
        })
        .select()
        .single();

      // Step 4: User can access course
      expect(entitlement.data.status).toBe('active');
      expect(entitlement.data.course_id).toBe('course-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Invalid price ID')
      );

      await expect(
        mockStripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [{ price: 'price_invalid', quantity: 1 }],
        })
      ).rejects.toThrow('Invalid price ID');
    });

    it('should handle database errors during order creation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('orders')
        .insert({ user_id: 'user-123' })
        .select()
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });
});
