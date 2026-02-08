# k6 Load Testing for Portal28

This directory contains k6 load testing scripts for Portal28 Academy.

## Prerequisites

Install k6:
- **macOS:** `brew install k6`
- **Linux:** `sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6`
- **Windows:** `choco install k6`
- **Docker:** `docker pull grafana/k6`

## Running Load Tests

### Individual Tests

```bash
# Test course page views (100 concurrent users)
npm run test:load:courses

# Test video streaming (50 concurrent users)
npm run test:load:video

# Test checkout sessions (20 concurrent users)
npm run test:load:checkout

# Test chat messages (100 concurrent users)
npm run test:load:chat

# Test search (50 concurrent users)
npm run test:load:search
```

### All Load Tests

```bash
npm run test:load:all
```

### Custom Base URL

```bash
BASE_URL=https://your-production-url.com k6 run k6/load-tests/course-page.js
```

## Test Specifications

### PERF-LOAD-001: Course Page Views
- **Target:** 100 concurrent users
- **Duration:** 4 minutes
- **Threshold:** 95% of requests < 2s
- **File:** `k6/load-tests/course-page.js`

### PERF-LOAD-002: Video Streaming
- **Target:** 50 concurrent users
- **Duration:** 5 minutes
- **Threshold:** 95% of requests < 3s
- **File:** `k6/load-tests/video-streaming.js`

### PERF-LOAD-003: Checkout Sessions
- **Target:** 20 concurrent users
- **Duration:** 3.5 minutes
- **Threshold:** 95% of requests < 5s
- **File:** `k6/load-tests/checkout-sessions.js`

### PERF-LOAD-004: Chat Messages
- **Target:** 100 concurrent users
- **Duration:** 4 minutes
- **Threshold:** 95% of requests < 1s
- **File:** `k6/load-tests/chat-messages.js`

### PERF-LOAD-005: Search Queries
- **Target:** 50 concurrent users
- **Duration:** 2.5 minutes
- **Threshold:** 95% of requests < 3s
- **File:** `k6/load-tests/search.js`

## Understanding Results

k6 outputs detailed metrics including:
- **http_req_duration:** Response time for HTTP requests
- **http_req_failed:** Percentage of failed requests
- **errors:** Custom error rate (specific to test logic)
- **iterations:** Total number of test iterations completed
- **vus:** Virtual users (concurrent users)

### Success Criteria

Tests pass when:
1. ✅ All thresholds are met (95th percentile response times)
2. ✅ Error rate is below threshold
3. ✅ No crashes or timeouts

### Example Output

```
     ✓ status is 200
     ✓ response time < 2000ms
     ✓ has course content

     checks.........................: 100.00% ✓ 15000      ✗ 0
     data_received..................: 45 MB   11 MB/s
     data_sent......................: 1.5 MB  375 kB/s
     http_req_duration..............: avg=850ms    min=200ms med=800ms max=1.8s p(95)=1.2s
     http_req_failed................: 0.00%   ✓ 0          ✗ 15000
```

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Run load tests
  run: |
    npm run test:load:all
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
```

## Troubleshooting

### Issue: Tests timeout
- **Solution:** Increase `timeout` in options or check server capacity

### Issue: High error rates
- **Solution:** Reduce concurrent users or check for bugs in endpoints

### Issue: k6 not found
- **Solution:** Install k6 using instructions above or use Docker:
  ```bash
  docker run --rm -v $(pwd):/workspace grafana/k6 run /workspace/k6/load-tests/course-page.js
  ```

## Performance Baselines

See `docs/PERFORMANCE_BASELINES.md` for historical benchmark data and regression detection.
