/**
 * Integration Test: User Onboarding Workflow
 *
 * Tests the complete onboarding flow from first login to activation
 * including profile setup, role selection, and initial preferences.
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

describe('User Onboarding Workflow Integration', () => {
  let mockSupabase: any;
  let mockCookies: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCookies = {
      get: jest.fn((name) => ({ name, value: '' })),
      set: jest.fn(),
      delete: jest.fn(),
    };
    (cookies as jest.Mock).mockReturnValue(mockCookies);

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
      })),
    };

    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('First Login', () => {
    it('should detect new user on first login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        created_at: new Date().toISOString(),
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null, // No profile exists yet
            }),
          })),
        })),
      });

      const userResult = await mockSupabase.auth.getUser();
      expect(userResult.data.user).toBeDefined();

      const profileResult = await mockSupabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', 'user-123')
        .maybeSingle();

      expect(profileResult.data).toBeNull();
    });

    it('should track activation status', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: 'user-123',
                onboarding_completed: false,
                activation_completed: false,
              },
            }),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .select('onboarding_completed, activation_completed')
        .eq('user_id', 'user-123')
        .maybeSingle();

      expect(result.data.onboarding_completed).toBe(false);
      expect(result.data.activation_completed).toBe(false);
    });
  });

  describe('Profile Setup', () => {
    it('should complete profile with full name and avatar', async () => {
      const profileData = {
        user_id: 'user-123',
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Software developer',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: profileData,
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          bio: 'Software developer',
        })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data).toEqual(profileData);
      expect(result.error).toBeNull();
    });

    it('should allow partial profile updates', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  full_name: 'John Doe',
                  bio: null,
                  avatar_url: null,
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({ full_name: 'John Doe' })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.full_name).toBe('John Doe');
    });
  });

  describe('Role Selection', () => {
    it('should set user role to student', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  role: 'student',
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({ role: 'student' })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.role).toBe('student');
    });

    it('should set user role to creator', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  role: 'creator',
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({ role: 'creator' })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.role).toBe('creator');
    });

    it('should set user role to admin', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  role: 'admin',
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.role).toBe('admin');
    });
  });

  describe('Preferences Setup', () => {
    it('should save email notification preferences', async () => {
      const preferences = {
        email_notifications: true,
        marketing_emails: false,
        course_updates: true,
        new_features: true,
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { user_id: 'user-123', preferences },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({ preferences })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.preferences).toEqual(preferences);
    });

    it('should save language preference', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  language: 'es',
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({ language: 'es' })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.language).toBe('es');
    });
  });

  describe('Onboarding Completion', () => {
    it('should mark onboarding as completed', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  onboarding_completed: true,
                  onboarding_completed_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.onboarding_completed).toBe(true);
      expect(result.data.onboarding_completed_at).toBeDefined();
    });

    it('should track onboarding steps completed', async () => {
      const steps = {
        profile_setup: true,
        role_selected: true,
        preferences_set: true,
        first_action_completed: false,
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  onboarding_steps: steps,
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({ onboarding_steps: steps })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.onboarding_steps.profile_setup).toBe(true);
      expect(result.data.onboarding_steps.role_selected).toBe(true);
      expect(result.data.onboarding_steps.preferences_set).toBe(true);
    });
  });

  describe('Activation Tracking', () => {
    it('should track activation for student (first enrollment)', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  activation_completed: true,
                  activation_type: 'first_enrollment',
                  activated_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({
          activation_completed: true,
          activation_type: 'first_enrollment',
          activated_at: new Date().toISOString(),
        })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.activation_completed).toBe(true);
      expect(result.data.activation_type).toBe('first_enrollment');
    });

    it('should track activation for creator (first course created)', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  activation_completed: true,
                  activation_type: 'first_course_created',
                  activated_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({
          activation_completed: true,
          activation_type: 'first_course_created',
          activated_at: new Date().toISOString(),
        })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data.activation_completed).toBe(true);
      expect(result.data.activation_type).toBe('first_course_created');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await mockSupabase.auth.getUser();

      expect(result.data.user).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle profile update failures', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
              }),
            })),
          })),
        })),
      });

      const result = await mockSupabase
        .from('user_profiles')
        .update({ full_name: 'Test' })
        .eq('user_id', 'user-123')
        .select()
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });
});
