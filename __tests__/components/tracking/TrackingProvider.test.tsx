/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TrackingProvider } from '@/components/tracking/TrackingProvider';
import { tracking } from '@/lib/tracking';
import { createBrowserClient } from '@supabase/ssr';

// Mock Supabase client
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
}));

// Mock tracking SDK
jest.mock('@/lib/tracking', () => ({
  tracking: {
    identify: jest.fn(),
    reset: jest.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  user_metadata: {
    full_name: 'Test User',
    role: 'creator',
  },
};

const mockSubscription = {
  tier: 'pro',
  status: 'active',
};

describe('TrackingProvider', () => {
  let mockSupabase: any;
  let authStateChangeCallback: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        onAuthStateChange: jest.fn((callback) => {
          authStateChangeCallback = callback;
          return {
            data: {
              subscription: {
                unsubscribe: jest.fn(),
              },
            },
          };
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(),
            })),
          })),
        })),
      })),
    };

    (createBrowserClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Initial State', () => {
    it('should render children without errors', () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { container } = render(
        <TrackingProvider>
          <div data-testid="child">Child Content</div>
        </TrackingProvider>
      );

      expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
    });

    it('should not identify user when no user is logged in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      render(
        <TrackingProvider>
          <div>Child Content</div>
        </TrackingProvider>
      );

      await waitFor(() => {
        expect(tracking.identify).not.toHaveBeenCalled();
      });
    });

    it('should identify user when user is logged in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      // Mock subscription query
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockSubscription,
              }),
            })),
          })),
        })),
      });

      render(
        <TrackingProvider>
          <div>Child Content</div>
        </TrackingProvider>
      );

      await waitFor(() => {
        expect(tracking.identify).toHaveBeenCalledWith({
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'creator',
          metadata: {
            subscription_tier: 'pro',
            subscription_status: 'active',
            created_at: '2024-01-01T00:00:00Z',
          },
        });
      });
    });

    it('should use default role when role is not in metadata', async () => {
      const userWithoutRole = {
        ...mockUser,
        user_metadata: {
          full_name: 'Test User',
        },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: userWithoutRole },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
              }),
            })),
          })),
        })),
      });

      render(
        <TrackingProvider>
          <div>Child Content</div>
        </TrackingProvider>
      );

      await waitFor(() => {
        expect(tracking.identify).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'student',
          })
        );
      });
    });

    it('should extract name from email when full_name is not available', async () => {
      const userWithoutName = {
        ...mockUser,
        user_metadata: {},
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: userWithoutName },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
              }),
            })),
          })),
        })),
      });

      render(
        <TrackingProvider>
          <div>Child Content</div>
        </TrackingProvider>
      );

      await waitFor(() => {
        expect(tracking.identify).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'test',
          })
        );
      });
    });

    it('should handle null subscription gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
              }),
            })),
          })),
        })),
      });

      render(
        <TrackingProvider>
          <div>Child Content</div>
        </TrackingProvider>
      );

      await waitFor(() => {
        expect(tracking.identify).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: {
              subscription_tier: null,
              subscription_status: null,
              created_at: mockUser.created_at,
            },
          })
        );
      });
    });
  });

  describe('Auth State Changes', () => {
    it('should identify user on SIGNED_IN event', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockSubscription,
              }),
            })),
          })),
        })),
      });

      render(
        <TrackingProvider>
          <div>Child Content</div>
        </TrackingProvider>
      );

      // Wait for initial mount
      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      // Clear previous calls
      (tracking.identify as jest.Mock).mockClear();

      // Simulate SIGNED_IN event
      await authStateChangeCallback('SIGNED_IN', { user: mockUser });

      await waitFor(() => {
        expect(tracking.identify).toHaveBeenCalledWith({
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'creator',
          metadata: {
            subscription_tier: 'pro',
            subscription_status: 'active',
            created_at: '2024-01-01T00:00:00Z',
          },
        });
      });
    });

    it('should reset tracking on SIGNED_OUT event', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockSubscription,
              }),
            })),
          })),
        })),
      });

      render(
        <TrackingProvider>
          <div>Child Content</div>
        </TrackingProvider>
      );

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      // Simulate SIGNED_OUT event
      await authStateChangeCallback('SIGNED_OUT', null);

      await waitFor(() => {
        expect(tracking.reset).toHaveBeenCalled();
      });
    });

    it('should not identify multiple times for same user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockSubscription,
              }),
            })),
          })),
        })),
      });

      render(
        <TrackingProvider>
          <div>Child Content</div>
        </TrackingProvider>
      );

      await waitFor(() => {
        expect(tracking.identify).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', async () => {
      const mockUnsubscribe = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { unmount } = render(
        <TrackingProvider>
          <div>Child Content</div>
        </TrackingProvider>
      );

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
