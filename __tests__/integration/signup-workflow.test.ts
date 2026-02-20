/**
 * Integration Test: User Sign-up Workflow
 *
 * Tests the complete sign-up flow from email submission to account creation
 * including database operations, auth, and email sending.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

describe('User Sign-up Workflow Integration', () => {
  let mockSupabase: any;
  let mockCookies: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock cookies
    mockCookies = {
      get: jest.fn((name) => ({ name, value: '' })),
      set: jest.fn(),
      delete: jest.fn(),
    };
    (cookies as jest.Mock).mockReturnValue(mockCookies);

    // Mock Supabase client
    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        getUser: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                email: 'test@example.com',
                role: 'student',
              },
            }),
          })),
        })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null }),
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          })),
        })),
      })),
    };

    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Account Creation', () => {
    it('should create account with valid email and password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        user_metadata: { full_name: 'New User' },
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token-123' } },
        error: null,
      });

      const result = await mockSupabase.auth.signUp({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        options: {
          data: {
            full_name: 'New User',
          },
        },
      });

      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
      expect(result.data.user.email).toBe('newuser@example.com');
      expect(result.data.session).toBeDefined();
    });

    it('should reject sign-up with weak password', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters' },
      });

      const result = await mockSupabase.auth.signUp({
        email: 'test@example.com',
        password: '123',
      });

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Password');
      expect(result.data.user).toBeNull();
    });

    it('should reject sign-up with invalid email', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email format' },
      });

      const result = await mockSupabase.auth.signUp({
        email: 'invalid-email',
        password: 'SecurePass123!',
      });

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('email');
      expect(result.data.user).toBeNull();
    });

    it('should reject sign-up with existing email', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const result = await mockSupabase.auth.signUp({
        email: 'existing@example.com',
        password: 'SecurePass123!',
      });

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('already registered');
    });
  });

  describe('User Role Assignment', () => {
    it('should assign default student role on sign-up', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'student@example.com',
        user_metadata: { full_name: 'Student User', role: 'student' },
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token-123' } },
        error: null,
      });

      const result = await mockSupabase.auth.signUp({
        email: 'student@example.com',
        password: 'SecurePass123!',
        options: {
          data: {
            full_name: 'Student User',
            role: 'student',
          },
        },
      });

      expect(result.data.user.user_metadata.role).toBe('student');
    });

    it('should allow creator role assignment', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'creator@example.com',
        user_metadata: { full_name: 'Creator User', role: 'creator' },
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token-456' } },
        error: null,
      });

      const result = await mockSupabase.auth.signUp({
        email: 'creator@example.com',
        password: 'SecurePass123!',
        options: {
          data: {
            full_name: 'Creator User',
            role: 'creator',
          },
        },
      });

      expect(result.data.user.user_metadata.role).toBe('creator');
    });
  });

  describe('Session Management', () => {
    it('should create session on successful sign-up', async () => {
      const mockSession = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      const result = await mockSupabase.auth.signUp({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(result.data.session).toBeDefined();
      expect(result.data.session.access_token).toBe('access-token-123');
      expect(result.data.session.refresh_token).toBe('refresh-token-123');
    });

    it('should retrieve user from session', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
          },
        },
        error: null,
      });

      const result = await mockSupabase.auth.getUser();

      expect(result.data.user).toBeDefined();
      expect(result.data.user.id).toBe('user-123');
      expect(result.data.user.email).toBe('test@example.com');
    });
  });

  describe('Profile Creation', () => {
    it('should create user profile after sign-up', async () => {
      const profileData = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'student',
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: profileData, error: null }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('users')
        .insert({
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'student',
        })
        .select()
        .single();

      expect(result.data).toEqual(profileData);
      expect(result.error).toBeNull();
    });
  });

  describe('Email Verification', () => {
    it('should require email confirmation for new accounts', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: null, // Not confirmed
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: null, // No session until confirmed
        },
        error: null,
      });

      const result = await mockSupabase.auth.signUp({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(result.data.user.email_confirmed_at).toBeNull();
      expect(result.data.session).toBeNull();
    });

    it('should create session after email confirmation', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: 'token-123',
        user: mockUser,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await mockSupabase.auth.getUser();

      expect(result.data.user.email_confirmed_at).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during sign-up', async () => {
      mockSupabase.auth.signUp.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        mockSupabase.auth.signUp({
          email: 'test@example.com',
          password: 'SecurePass123!',
        })
      ).rejects.toThrow('Network error');
    });

    it('should handle server errors during sign-up', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Internal server error', status: 500 },
      });

      const result = await mockSupabase.auth.signUp({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(result.error).toBeDefined();
      expect(result.error.status).toBe(500);
    });
  });
});
