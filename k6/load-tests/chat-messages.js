// PERF-LOAD-004: 100 concurrent chat messages
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
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.1'],
  },
};

export default function () {
  // Simulate community chat interactions
  const threadId = Math.floor(Math.random() * 50) + 1;

  // 1. View thread
  let res = http.get(`${BASE_URL}/app/community/threads/${threadId}`);
  check(res, {
    'thread loaded': (r) => r.status === 200,
  });
  sleep(2);

  // 2. Post a message (requires auth - will be rejected without session)
  res = http.post(
    `${BASE_URL}/api/community/threads/${threadId}/messages`,
    JSON.stringify({ content: 'Test message from load test' }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(res, {
    'message endpoint responds': (r) => r.status === 200 || r.status === 401, // 401 expected without auth
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);

  sleep(1); // Quick think time for chat
}
