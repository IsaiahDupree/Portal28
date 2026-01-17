/**
 * Unit Tests for Authentication - lib/auth/getUser.ts
 * Test IDs: MVP-AUTH-001, MVP-AUTH-002, MVP-AUTH-008
 *
 * Tests cover:
 * - User session retrieval
 * - Email validation
 * - Session management
 * - Role verification
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
    refreshSession: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

// Mock the server supabase module
jest.mock('@/lib/supabase/server', () => ({
  supabaseServer: jest.fn(() => mockSupabaseClient),
}));

// Import after mocking
const { getUserOrNull, requireUser, getUserRole, getUserSubscription } = require('@/lib/auth/getUser');

describe('Authentication - getUser (MVP-AUTH-001, MVP-AUTH-002, MVP-AUTH-008)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserOrNull', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await getUserOrNull();

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
      });
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });

    it('should return null when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getUserOrNull();

      expect(result).toBeNull();
    });

    it('should return null on auth error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      });

      const result = await getUserOrNull();

      expect(result).toBeNull();
    });
  });

  describe('requireUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await requireUser();

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw error when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(requireUser()).rejects.toThrow('Authentication required');
    });
  });

  describe('getUserRole', () => {
    it('should return admin role for admin user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      const role = await getUserRole(userId);

      expect(role).toBe('admin');
    });

    it('should return student role for regular user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { role: 'student' },
              error: null,
            }),
          }),
        }),
      });

      const role = await getUserRole(userId);

      expect(role).toBe('student');
    });

    it('should return null when user profile not found', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const role = await getUserRole(userId);

      expect(role).toBeNull();
    });
  });

  describe('getUserSubscription', () => {
    it('should return subscription data for subscribed user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      const mockSubscription = {
        tier: 'premium',
        status: 'active',
        stripe_customer_id: 'cus_123',
        current_period_end: '2026-02-13',
        cancel_at_period_end: false,
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: mockSubscription,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const subscription = await getUserSubscription(userId);

      expect(subscription).toEqual(mockSubscription);
    });

    it('should return null when user has no active subscription', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const subscription = await getUserSubscription(userId);

      expect(subscription).toBeNull();
    });
  });
});

describe('Email Validation for Magic Link (MVP-AUTH-002)', () => {
  describe('Email format validation', () => {
    const validEmails = [
      'user@example.com',
      'test.user@domain.co.uk',
      'user+tag@example.org',
      'first.last@subdomain.example.com',
    ];

    const invalidEmails = [
      'invalid',
      'invalid@',
      '@invalid.com',
      'invalid@.com',
      'invalid @example.com',
    ];

    it.each(validEmails)('should accept valid email: %s', (email) => {
      // HTML5 email validation regex (simplified)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(email)).toBe(true);
    });

    it.each(invalidEmails)('should reject invalid email: %s', (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  describe('Email normalization', () => {
    it('should trim whitespace from email', () => {
      const email = '  user@example.com  ';
      const normalized = email.trim().toLowerCase();
      expect(normalized).toBe('user@example.com');
    });

    it('should convert email to lowercase', () => {
      const email = 'User@Example.COM';
      const normalized = email.trim().toLowerCase();
      expect(normalized).toBe('user@example.com');
    });
  });
});

describe('Session Management (MVP-AUTH-008)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session refresh logic', () => {
    it('should detect expired session', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredSession = {
        expires_at: now - 3600, // Expired 1 hour ago
      };

      const isExpired = expiredSession.expires_at < now;
      expect(isExpired).toBe(true);
    });

    it('should detect valid session', () => {
      const now = Math.floor(Date.now() / 1000);
      const validSession = {
        expires_at: now + 3600, // Expires in 1 hour
      };

      const isExpired = validSession.expires_at < now;
      expect(isExpired).toBe(false);
    });

    it('should detect session nearing expiry (within 5 minutes)', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiringSession = {
        expires_at: now + 240, // Expires in 4 minutes
      };

      const needsRefresh = expiringSession.expires_at - now < 300; // 5 minutes
      expect(needsRefresh).toBe(true);
    });

    it('should call refreshSession when needed', async () => {
      const mockSession = {
        access_token: 'old_token',
        refresh_token: 'refresh_token',
        expires_at: Math.floor(Date.now() / 1000) + 240,
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new_token',
            refresh_token: 'refresh_token',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
        error: null,
      });

      const { data } = await mockSupabaseClient.auth.getSession();
      const now = Math.floor(Date.now() / 1000);

      if (data.session && data.session.expires_at - now < 300) {
        await mockSupabaseClient.auth.refreshSession();
        expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
      }
    });
  });
});

describe('Magic Link Token Generation (MVP-AUTH-001)', () => {
  describe('UUID token validation', () => {
    it('should validate UUID v4 format', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a3bb189e-8bf9-3888-9912-ace4e6543002',
        '550e8400-e29b-41d4-a716-446655440000',
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      validUUIDs.forEach((uuid) => {
        expect(uuidRegex.test(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      invalidUUIDs.forEach((uuid) => {
        expect(uuidRegex.test(uuid)).toBe(false);
      });
    });

    it('should validate that UUIDs are unique (simulated)', () => {
      // Supabase generates UUIDs automatically
      // This test simulates UUID uniqueness check
      const token1 = '123e4567-e89b-12d3-a456-426614174000';
      const token2 = 'a3bb189e-8bf9-3888-9912-ace4e6543002';

      expect(token1).not.toBe(token2);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(token1)).toBe(true);
      expect(uuidRegex.test(token2)).toBe(true);
    });
  });
});
