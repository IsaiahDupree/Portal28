// PERF-LOAD-003: 20 concurrent checkout sessions
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:2828';

export const options = {
  stages: [
    { duration: '20s', target: 5 },   // Ramp up to 5 users
    { duration: '40s', target: 20 },  // Ramp up to 20 users
    { duration: '2m', target: 20 },   // Stay at 20 users
    { duration: '20s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should be below 5s
    http_req_failed: ['rate<0.01'],    // Very low error rate for checkout
    errors: ['rate<0.02'],
  },
};

export default function () {
  // Simulate checkout flow
  const productId = Math.floor(Math.random() * 5) + 1;

  // 1. Visit product page
  let res = http.get(`${BASE_URL}/courses/${productId}`);
  check(res, {
    'product page loaded': (r) => r.status === 200,
  });
  sleep(2);

  // 2. Request checkout session (API endpoint)
  res = http.post(
    `${BASE_URL}/api/stripe/course-checkout`,
    JSON.stringify({ courseId: productId }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(res, {
    'checkout created': (r) => r.status === 200 || r.status === 303,
    'response time < 5000ms': (r) => r.timings.duration < 5000,
    'has session URL': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.url || body.sessionId;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  sleep(3); // User think time
}
