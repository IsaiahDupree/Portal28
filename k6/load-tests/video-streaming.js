// PERF-LOAD-002: 50 concurrent video streams
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:2828';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users (simulate long video watch)
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.02'],    // Very low error rate for video
    errors: ['rate<0.05'],
  },
};

export default function () {
  // Simulate accessing video lesson page
  const courseId = Math.floor(Math.random() * 10) + 1;
  const lessonId = Math.floor(Math.random() * 20) + 1;

  const res = http.get(`${BASE_URL}/app/courses/${courseId}/lessons/${lessonId}`);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
    'has video player': (r) => r.body.includes('mux-player') || r.body.includes('video'),
  });

  errorRate.add(!success);

  sleep(5); // Longer think time - users watch videos
}
