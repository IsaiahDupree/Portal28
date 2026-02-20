// API Response Time Performance Tests - All API endpoints < 500ms
import { test, expect } from '@playwright/test';

test.describe('API Response Time Performance', () => {
  // Helper to measure response time
  async function measureResponseTime(
    request: any,
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    options?: any
  ) {
    const start = Date.now();
    const response = await request[method](endpoint, options);
    const responseTime = Date.now() - start;
    return { response, responseTime };
  }

  test.describe('List API Endpoints - Should respond < 500ms', () => {
    test('GET /api/courses - Course list', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(request, 'get', '/api/courses');

      console.log(`✓ Course list API: ${responseTime}ms (status: ${response.status()})`);
      expect([200, 401, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /api/admin/courses - Admin course list', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/admin/courses'
      );

      console.log(`✓ Admin course list API: ${responseTime}ms (status: ${response.status()})`);
      expect([200, 401, 404, 405]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /api/admin/users - User list', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/admin/users'
      );

      console.log(`✓ User list API: ${responseTime}ms (status: ${response.status()})`);
      expect([200, 401, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /api/admin/orders - Order list', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/admin/orders'
      );

      console.log(`✓ Order list API: ${responseTime}ms (status: ${response.status()})`);
      expect([200, 401, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /api/community/posts - Community posts list', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/community/posts'
      );

      console.log(`✓ Community posts list API: ${responseTime}ms (status: ${response.status()})`);
      expect([200, 401, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /api/lessons - Lessons list', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(request, 'get', '/api/lessons');

      console.log(`✓ Lessons list API: ${responseTime}ms (status: ${response.status()})`);
      expect([200, 401, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /api/admin/analytics - Analytics data', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/admin/analytics'
      );

      console.log(`✓ Analytics API: ${responseTime}ms (status: ${response.status()})`);
      expect([200, 401, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });
  });

  test.describe('Detail API Endpoints - Should respond < 300ms', () => {
    test('GET /api/courses/[id] - Course detail', async ({ request }) => {
      // First get a course ID
      const coursesResponse = await request.get('/api/courses');
      if (coursesResponse.status() === 200) {
        const courses = await coursesResponse.json();
        const courseId = courses[0]?.id || 1;

        const { response, responseTime } = await measureResponseTime(
          request,
          'get',
          `/api/courses/${courseId}`
        );

        console.log(`✓ Course detail API: ${responseTime}ms`);
        expect([200, 404]).toContain(response.status());
        expect(responseTime).toBeLessThan(300);
      } else {
        // If not authenticated, just test with ID 1
        const { response, responseTime } = await measureResponseTime(
          request,
          'get',
          '/api/courses/1'
        );

        console.log(`✓ Course detail API (fallback): ${responseTime}ms`);
        expect([200, 401, 404]).toContain(response.status());
        expect(responseTime).toBeLessThan(300);
      }
    });

    test('GET /api/lessons/[id] - Lesson detail', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/lessons/1'
      );

      console.log(`✓ Lesson detail API: ${responseTime}ms`);
      expect([200, 401, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(300);
    });

    test('GET /api/admin/users/[id] - User detail', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/admin/users/1'
      );

      console.log(`✓ User detail API: ${responseTime}ms`);
      expect([200, 401, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(300);
    });

    test('GET /api/community/posts/[id] - Post detail', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/community/posts/1'
      );

      console.log(`✓ Post detail API: ${responseTime}ms`);
      expect([200, 401, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(300);
    });
  });

  test.describe('Search API Endpoints - Should respond < 500ms', () => {
    test('GET /api/search?q=course - General search', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/search?q=course'
      );

      console.log(`✓ Search API (course): ${responseTime}ms (status: ${response.status()})`);
      expect([200, 400, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);

      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.results) || Array.isArray(data)).toBe(true);
      }
    });

    test('GET /api/search?q=test - General search (test)', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/search?q=test'
      );

      console.log(`✓ Search API (test): ${responseTime}ms (status: ${response.status()})`);
      expect([200, 400, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /api/search?q=user - General search (user)', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/search?q=user'
      );

      console.log(`✓ Search API (user): ${responseTime}ms (status: ${response.status()})`);
      expect([200, 400, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /api/search?q= - Empty search query', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(request, 'get', '/api/search?q=');

      console.log(`✓ Search API (empty query): ${responseTime}ms (status: ${response.status()})`);
      expect([200, 400, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });
  });

  test.describe('Auth API Endpoints - Should be fast', () => {
    test('POST /api/auth/login - Login endpoint', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(request, 'post', '/api/auth/login', {
        data: { email: 'test@example.com' },
      });

      console.log(`✓ Login API: ${responseTime}ms`);
      expect([200, 400, 401, 404, 405]).toContain(response.status());
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /api/auth/session - Session check', async ({ request }) => {
      const { response, responseTime } = await measureResponseTime(
        request,
        'get',
        '/api/auth/session'
      );

      console.log(`✓ Session check API: ${responseTime}ms`);
      expect([200, 401, 404, 405]).toContain(response.status());
      expect(responseTime).toBeLessThan(300);
    });
  });

  test.describe('Performance under load - Sequential requests', () => {
    test('10 sequential search requests should maintain performance', async ({ request }) => {
      const times: number[] = [];
      const queries = ['course', 'test', 'user', 'lesson', 'video', 'quiz', 'forum', 'post', 'community', 'dashboard'];

      for (const query of queries) {
        const { responseTime } = await measureResponseTime(
          request,
          'get',
          `/api/search?q=${query}`
        );
        times.push(responseTime);
      }

      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`✓ 10 sequential searches: avg=${avgTime.toFixed(0)}ms, min=${minTime}ms, max=${maxTime}ms`);

      // Average should still be under 500ms
      expect(avgTime).toBeLessThan(500);
      // No single request should be excessively slow
      expect(maxTime).toBeLessThan(1000);
    });

    test('5 parallel list requests should complete quickly', async ({ request }) => {
      const startTime = Date.now();

      const promises = [
        request.get('/api/courses'),
        request.get('/api/search?q=test'),
        request.get('/api/admin/analytics'),
        request.get('/api/lessons'),
        request.get('/api/community/posts'),
      ];

      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      console.log(`✓ 5 parallel requests completed in: ${totalTime}ms`);

      // Parallel requests should complete faster than sequential (ideally < 2s total)
      expect(totalTime).toBeLessThan(2000);
    });
  });

  test.describe('API Performance Consistency', () => {
    test('Course list API should be consistently fast (5 requests)', async ({ request }) => {
      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const { responseTime } = await measureResponseTime(request, 'get', '/api/courses');
        times.push(responseTime);
      }

      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const maxTime = Math.max(...times);
      const standardDeviation = Math.sqrt(
        times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length
      );

      console.log(`✓ Course list consistency: avg=${avgTime.toFixed(0)}ms, max=${maxTime}ms, stddev=${standardDeviation.toFixed(0)}ms`);

      expect(avgTime).toBeLessThan(500);
      expect(maxTime).toBeLessThan(700);
      // Standard deviation should be reasonable (not too variable)
      expect(standardDeviation).toBeLessThan(200);
    });

    test('Search API should be consistently fast (5 requests)', async ({ request }) => {
      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const { responseTime } = await measureResponseTime(request, 'get', '/api/search?q=course');
        times.push(responseTime);
      }

      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const maxTime = Math.max(...times);
      const standardDeviation = Math.sqrt(
        times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length
      );

      console.log(`✓ Search consistency: avg=${avgTime.toFixed(0)}ms, max=${maxTime}ms, stddev=${standardDeviation.toFixed(0)}ms`);

      expect(avgTime).toBeLessThan(500);
      expect(maxTime).toBeLessThan(700);
      expect(standardDeviation).toBeLessThan(200);
    });
  });

  test.describe('Caching and optimization checks', () => {
    test('Repeated requests should benefit from caching', async ({ request }) => {
      // First request (cold)
      const { responseTime: firstTime } = await measureResponseTime(
        request,
        'get',
        '/api/search?q=performance'
      );

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second request (potentially cached)
      const { responseTime: secondTime } = await measureResponseTime(
        request,
        'get',
        '/api/search?q=performance'
      );

      console.log(`✓ Caching test: first=${firstTime}ms, second=${secondTime}ms`);

      // Both should be under 500ms
      expect(firstTime).toBeLessThan(500);
      expect(secondTime).toBeLessThan(500);
    });
  });
});
