# Performance Baselines & Benchmarks

**Created:** February 8, 2026
**Purpose:** Track performance benchmarks and detect regressions

---

## Overview

This document establishes performance baselines for Portal28 Academy and provides a framework for detecting performance regressions.

## Database Performance Benchmarks

### PERF-DB-001: Course Catalog Query
- **Target:** < 100ms (p95)
- **Test:** `e2e/performance/database-performance.spec.ts`
- **Baseline:** TBD (run initial test)
- **Status:** ⏳ Pending baseline

### PERF-DB-002: Search Query
- **Target:** < 200ms (p95)
- **Test:** `e2e/performance/database-performance.spec.ts`
- **Baseline:** TBD (run initial test)
- **Status:** ⏳ Pending baseline

### PERF-DB-003: Analytics Aggregation
- **Target:** < 500ms (p95)
- **Test:** `e2e/performance/database-performance.spec.ts`
- **Baseline:** TBD (run initial test)
- **Status:** ⏳ Pending baseline

### PERF-DB-004: MRR Calculation
- **Target:** < 300ms (p95)
- **Test:** `e2e/performance/database-performance.spec.ts`
- **Baseline:** TBD (run initial test)
- **Status:** ⏳ Pending baseline

---

## Load Testing Benchmarks

### PERF-LOAD-001: Course Page Views
- **Target:** 100 concurrent users
- **p95 Response Time:** < 2000ms
- **Error Rate:** < 5%
- **Test:** `k6/load-tests/course-page.js`
- **Baseline:** TBD (run initial test)
- **Status:** ⏳ Pending baseline

### PERF-LOAD-002: Video Streaming
- **Target:** 50 concurrent users
- **p95 Response Time:** < 3000ms
- **Error Rate:** < 2%
- **Test:** `k6/load-tests/video-streaming.js`
- **Baseline:** TBD (run initial test)
- **Status:** ⏳ Pending baseline

### PERF-LOAD-003: Checkout Sessions
- **Target:** 20 concurrent users
- **p95 Response Time:** < 5000ms
- **Error Rate:** < 1%
- **Test:** `k6/load-tests/checkout-sessions.js`
- **Baseline:** TBD (run initial test)
- **Status:** ⏳ Pending baseline

### PERF-LOAD-004: Chat Messages
- **Target:** 100 concurrent users
- **p95 Response Time:** < 1000ms
- **Error Rate:** < 5%
- **Test:** `k6/load-tests/chat-messages.js`
- **Baseline:** TBD (run initial test)
- **Status:** ⏳ Pending baseline

### PERF-LOAD-005: Search with Large Results
- **Target:** 50 concurrent users
- **p95 Response Time:** < 3000ms
- **Error Rate:** < 5%
- **Test:** `k6/load-tests/search.js`
- **Baseline:** TBD (run initial test)
- **Status:** ⏳ Pending baseline

---

## Response Time Benchmarks

### Page Load Times

| Page | Target (p95) | Current | Status |
|------|-------------|---------|--------|
| Homepage | < 1s | TBD | ⏳ Pending |
| Course Listing | < 1.5s | TBD | ⏳ Pending |
| Course Detail | < 2s | TBD | ⏳ Pending |
| Lesson Player | < 2.5s | TBD | ⏳ Pending |

### API Response Times

| Endpoint | Target (p95) | Current | Status |
|----------|-------------|---------|--------|
| `/api/search` | < 500ms | TBD | ⏳ Pending |
| `/api/stripe/course-checkout` | < 3s | TBD | ⏳ Pending |
| `/api/admin/analytics` | < 1s | TBD | ⏳ Pending |
| `/api/admin/analytics/mrr` | < 300ms | TBD | ⏳ Pending |

---

## Establishing Initial Baselines

To establish baselines, run the following commands:

```bash
# 1. Start the application
npm run dev

# 2. Run database performance tests
npm run test:perf:db

# 3. Run response time benchmarks
npm run test:perf:response

# 4. Run load tests (requires k6 installed)
npm run test:load:all
```

After running tests, update this document with actual performance metrics.

---

## Regression Detection

### Automated Detection

Performance tests will fail if:
1. **Response times exceed thresholds** (e.g., p95 > 2000ms for course pages)
2. **Error rates exceed thresholds** (e.g., > 5% failure rate)
3. **Response time degradation** > 20% from previous baseline

### Manual Review Triggers

Review performance when:
- Adding new database indexes
- Modifying complex queries (analytics, search)
- Deploying major features
- Increasing data volume significantly
- After infrastructure changes

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Performance Tests
  run: |
    npm run test:perf
    npm run test:load:courses
  continue-on-error: true # Don't block deploys, but flag for review

- name: Check for Regressions
  run: |
    # Compare against previous baseline
    node scripts/compare-performance.js
```

---

## Performance Monitoring

### Key Metrics to Track

1. **Database Query Times**
   - Monitor slow queries (> 100ms)
   - Track query count per request
   - Watch for N+1 queries

2. **API Response Times**
   - p50, p95, p99 response times
   - Error rates
   - Timeout rates

3. **Page Load Times**
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)

4. **Infrastructure**
   - CPU usage
   - Memory usage
   - Database connection pool

### Tools

- **Development:** Playwright performance metrics, k6
- **Production:** Vercel Analytics, Supabase Dashboard
- **APM:** (Consider DataDog, New Relic, or Sentry Performance)

---

## Optimization History

| Date | Change | Impact | Test |
|------|--------|--------|------|
| 2026-02-08 | Performance testing suite added | Baseline established | All |
| TBD | | | |

---

## Next Steps

1. ✅ Performance tests implemented
2. ⏳ Run initial baseline tests
3. ⏳ Document baseline metrics
4. ⏳ Set up CI/CD integration
5. ⏳ Add production monitoring
6. ⏳ Schedule monthly performance reviews

---

## Notes

- **Testing Environment:** Tests should be run on consistent hardware
- **Data Volume:** Baseline assumes ~100 courses, ~1000 users, ~10,000 orders
- **Network:** Local testing eliminates network latency
- **Production:** Production performance may vary due to CDN, geographic distribution, etc.

---

*Last Updated: February 8, 2026*
