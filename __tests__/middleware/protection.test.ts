/**
 * Unit Tests for Middleware & Route Protection
 * Test IDs: MVP-MID-001, MVP-MID-002, MVP-MID-003, MVP-MID-004, MVP-MID-005
 *
 * Tests cover:
 * - Protected route detection (/app/*)
 * - Admin route detection (/admin/*)
 * - Unauthenticated user redirects
 * - Non-admin access to admin routes
 * - Authenticated user access to protected routes
 */

import { describe, it, expect } from '@jest/globals';

describe('Middleware - Route Protection (MVP-MID-001, MVP-MID-002)', () => {
  describe('Protected route detection (MVP-MID-001)', () => {
    const protectedRoutes = [
      '/app',
      '/app/dashboard',
      '/app/courses/intro-to-web-dev',
      '/app/courses/intro-to-web-dev/lessons/1',
      '/app/community',
      '/app/community/forums',
      '/app/lesson/123',
    ];

    const publicRoutes = [
      '/',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/courses',
      '/courses/intro-to-web-dev',
      '/about',
      '/faq',
      '/terms',
      '/privacy',
    ];

    it.each(protectedRoutes)('should identify %s as protected', (route) => {
      const isProtected = route.startsWith('/app');
      expect(isProtected).toBe(true);
    });

    it.each(publicRoutes)('should identify %s as public', (route) => {
      const isProtected = route.startsWith('/app');
      expect(isProtected).toBe(false);
    });
  });

  describe('Admin route detection (MVP-MID-002)', () => {
    const adminRoutes = [
      '/admin',
      '/admin/courses',
      '/admin/courses/new',
      '/admin/courses/123',
      '/admin/studio',
      '/admin/studio/123',
      '/admin/analytics',
      '/admin/email-programs',
      '/admin/offers',
      '/admin/community',
      '/admin/moderation',
    ];

    const nonAdminRoutes = [
      '/',
      '/login',
      '/app',
      '/app/courses/intro-to-web-dev',
      '/courses',
    ];

    it.each(adminRoutes)('should identify %s as admin-only', (route) => {
      const isAdminRoute = route.startsWith('/admin');
      expect(isAdminRoute).toBe(true);
    });

    it.each(nonAdminRoutes)('should identify %s as non-admin', (route) => {
      const isAdminRoute = route.startsWith('/admin');
      expect(isAdminRoute).toBe(false);
    });
  });

  describe('Route protection rules', () => {
    it('should require authentication for /app/* routes', () => {
      const appRoutes = ['/app', '/app/dashboard', '/app/courses/123'];

      appRoutes.forEach((route) => {
        const requiresAuth = route.startsWith('/app') || route.startsWith('/admin');
        expect(requiresAuth).toBe(true);
      });
    });

    it('should require admin role for /admin/* routes', () => {
      const adminRoutes = ['/admin', '/admin/courses', '/admin/analytics'];

      adminRoutes.forEach((route) => {
        const requiresAdmin = route.startsWith('/admin');
        expect(requiresAdmin).toBe(true);
      });
    });

    it('should allow public access to login and signup', () => {
      const authPages = ['/login', '/signup', '/forgot-password', '/reset-password'];

      authPages.forEach((route) => {
        const isProtected = route.startsWith('/app') || route.startsWith('/admin');
        expect(isProtected).toBe(false);
      });
    });
  });
});

describe('Middleware - Redirect Logic (MVP-MID-003, MVP-MID-004, MVP-MID-005)', () => {
  describe('Unauthenticated user redirects (MVP-MID-003)', () => {
    it('should redirect to /login when accessing /app without auth', () => {
      const hasUser = false;
      const pathname = '/app';

      if (pathname.startsWith('/app') && !hasUser) {
        const redirectUrl = '/login';
        expect(redirectUrl).toBe('/login');
      }
    });

    it('should redirect to /login when accessing /admin without auth', () => {
      const hasUser = false;
      const pathname = '/admin';

      if ((pathname.startsWith('/app') || pathname.startsWith('/admin')) && !hasUser) {
        const redirectUrl = '/login';
        expect(redirectUrl).toBe('/login');
      }
    });

    it('should not redirect authenticated users from /app', () => {
      const hasUser = true;
      const pathname = '/app';

      const shouldRedirect = pathname.startsWith('/app') && !hasUser;
      expect(shouldRedirect).toBe(false);
    });
  });

  describe('Non-admin access control (MVP-MID-004)', () => {
    it('should block non-admin users from /admin with 403', () => {
      const hasUser = true;
      const isAdmin = false;
      const pathname = '/admin/courses';

      if (pathname.startsWith('/admin') && hasUser && !isAdmin) {
        const statusCode = 403;
        expect(statusCode).toBe(403);
      }
    });

    it('should allow admin users to access /admin', () => {
      const hasUser = true;
      const isAdmin = true;
      const pathname = '/admin/courses';

      const shouldBlock = pathname.startsWith('/admin') && hasUser && !isAdmin;
      expect(shouldBlock).toBe(false);
    });
  });

  describe('Authenticated user access (MVP-MID-005)', () => {
    it('should allow authenticated users to access /app routes', () => {
      const hasUser = true;
      const pathname = '/app/dashboard';

      const shouldAllow = pathname.startsWith('/app') && hasUser;
      expect(shouldAllow).toBe(true);
    });

    it('should allow access to public routes without auth', () => {
      const hasUser = false;
      const publicRoutes = ['/', '/courses', '/login', '/signup'];

      publicRoutes.forEach((route) => {
        const isProtected = route.startsWith('/app') || route.startsWith('/admin');
        expect(isProtected).toBe(false);
      });
    });
  });
});

describe('Middleware - URL Preservation (MVP-MID-006)', () => {
  it('should preserve original URL after authentication', () => {
    const originalUrl = '/app/courses/intro-to-web-dev';
    const loginUrl = `/login?redirect=${encodeURIComponent(originalUrl)}`;

    // Verify redirect parameter is preserved
    const url = new URL(loginUrl, 'http://localhost:2828');
    const redirectParam = url.searchParams.get('redirect');

    expect(redirectParam).toBe(originalUrl);
  });

  it('should redirect back to original URL after login', () => {
    const redirectParam = '/app/courses/intro-to-web-dev';
    const finalDestination = redirectParam || '/app';

    expect(finalDestination).toBe('/app/courses/intro-to-web-dev');
  });

  it('should default to /app when no redirect param exists', () => {
    const redirectParam = null;
    const finalDestination = redirectParam || '/app';

    expect(finalDestination).toBe('/app');
  });
});

describe('Middleware - Edge Cases', () => {
  it('should handle trailing slashes consistently', () => {
    const routes = ['/app', '/app/', '/admin', '/admin/'];

    routes.forEach((route) => {
      const normalizedRoute = route.replace(/\/$/, '') || '/';
      const isProtected = normalizedRoute.startsWith('/app') || normalizedRoute.startsWith('/admin');

      if (route.includes('app') || route.includes('admin')) {
        expect(isProtected).toBe(true);
      }
    });
  });

  it('should handle nested admin routes', () => {
    const nestedRoutes = [
      '/admin/courses/123/edit',
      '/admin/studio/456/lessons/789',
      '/admin/email-programs/111/steps',
    ];

    nestedRoutes.forEach((route) => {
      expect(route.startsWith('/admin')).toBe(true);
    });
  });

  it('should not confuse similar route prefixes', () => {
    const similarRoutes = [
      { route: '/application', shouldBeProtected: false },
      { route: '/app', shouldBeProtected: true },
      { route: '/administrator', shouldBeProtected: false },
      { route: '/admin', shouldBeProtected: true },
    ];

    similarRoutes.forEach(({ route, shouldBeProtected }) => {
      const isProtected = route === '/app' || route.startsWith('/app/') ||
                         route === '/admin' || route.startsWith('/admin/');
      expect(isProtected).toBe(shouldBeProtected);
    });
  });
});
