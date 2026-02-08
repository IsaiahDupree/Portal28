// PERF-LOAD-005: Search with 1000+ results
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:2828';

const searchTerms = [
  'course',
  'lesson',
  'tutorial',
  'guide',
  'introduction',
  'advanced',
  'beginner',
  'complete',
  'master',
  'learn',
];

export const options = {
  stages: [
    { duration: '20s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '20s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.1'],
  },
};

export default function () {
  // Random search term
  const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
    'returns JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
    'has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.results) || Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  sleep(2); // User think time
}
