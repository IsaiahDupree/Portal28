// PERF-LOAD-001: 100 concurrent course page views
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:2828';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],    // Error rate should be below 5%
    errors: ['rate<0.1'],              // Custom error rate should be below 10%
  },
};

export default function () {
  // Simulate browsing course pages
  const courseId = Math.floor(Math.random() * 10) + 1; // Assume 10 courses

  const res = http.get(`${BASE_URL}/app/courses/${courseId}`);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'has course content': (r) => r.body.includes('course') || r.body.includes('Course'),
  });

  errorRate.add(!success);

  sleep(1); // User think time
}
