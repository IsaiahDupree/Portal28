# Portal28 Academy — Testing Gap Analysis

> **Document Version:** 1.0  
> **Analysis Date:** January 19, 2026  
> **Current Test Count:** 733+ Unit Tests, 130+ E2E Tests  
> **Reference:** `docs/TDD_TEST_SUITE.md`, `feature_list.json`

---

## Executive Summary

This document analyzes testing coverage gaps across the Portal28 codebase, identifying areas that need additional test coverage for production readiness.

### Current Testing Infrastructure

| Category | Framework | Location | Count |
|----------|-----------|----------|-------|
| Unit/Integration | Jest | `__tests__/` | 733+ |
| E2E | Playwright | `e2e/` | 130+ |
| Security | Jest | `__tests__/security/` | 83+ |

### Coverage by Area

| Area | Unit Tests | E2E Tests | Coverage Status |
|------|------------|-----------|-----------------|
| Authentication | ✅ Good | ✅ Good | Complete |
| Stripe Payments | ✅ Good | ⚠️ Partial | Needs E2E |
| Entitlements | ✅ Good | ✅ Good | Complete |
| Course Delivery | ✅ Good | ✅ Good | Complete |
| Admin CMS | ✅ Good | ✅ Good | Complete |
| Meta Pixel/CAPI | ✅ Good | ⚠️ Partial | Needs E2E |
| Email (Resend) | ✅ Good | ⚠️ Partial | Needs E2E |
| Community | ✅ Good | ✅ Good | Complete |
| Offers System | ✅ Good | ✅ Good | Complete |
| Video (Mux) | ⚠️ Partial | ⚠️ Partial | Needs work |
| File Storage (R2) | ⚠️ Partial | ❌ Missing | Critical gap |
| Webhooks | ✅ Good | ⚠️ Partial | Needs E2E |
| Subscriptions | ✅ Good | ⚠️ Partial | Needs E2E |

---

## Part 1: Critical Testing Gaps

### 1.1 Stripe Webhook E2E Tests — HIGH PRIORITY

**Current State:** Unit tests exist but no E2E tests for actual webhook flows.

**Missing Tests:**
```
STRIPE-E2E-001: Complete purchase flow with real Stripe test mode
STRIPE-E2E-002: Subscription creation webhook flow
STRIPE-E2E-003: Subscription cancellation webhook flow
STRIPE-E2E-004: Refund processing webhook flow
STRIPE-E2E-005: Failed payment webhook handling
STRIPE-E2E-006: Webhook signature validation (tampered payload)
STRIPE-E2E-007: Idempotency (duplicate webhook delivery)
```

**Files Needed:**
- `e2e/stripe-webhooks.spec.ts`

**Implementation Notes:**
- Use Stripe CLI: `stripe listen --forward-to localhost:2828/api/stripe/webhook`
- Trigger events: `stripe trigger checkout.session.completed`

---

### 1.2 File Storage (R2/S3) Tests — HIGH PRIORITY

**Current State:** `__tests__/api/r2-storage.test.ts` exists but limited coverage.

**Missing Tests:**
```
R2-UNIT-001: Signed URL generation with correct expiry
R2-UNIT-002: File type validation (allowed extensions)
R2-UNIT-003: File size validation (max size enforcement)
R2-UNIT-004: Path sanitization (directory traversal prevention)
R2-INT-001: Upload file to R2 bucket
R2-INT-002: Download file with signed URL
R2-INT-003: Delete file from bucket
R2-INT-004: List files in directory
R2-E2E-001: Admin uploads PDF attachment
R2-E2E-002: Student downloads lesson file
R2-E2E-003: Expired URL rejected
```

**Files Needed:**
- `e2e/file-storage.spec.ts`
- Enhance `__tests__/api/r2-storage.test.ts`

---

### 1.3 Mux Video Integration Tests — HIGH PRIORITY

**Current State:** `__tests__/api/mux.test.ts` has basic tests.

**Missing Tests:**
```
MUX-UNIT-001: Signed playback token generation
MUX-UNIT-002: Token expiry validation
MUX-UNIT-003: Playback ID extraction from URL
MUX-INT-001: Create direct upload URL
MUX-INT-002: Webhook - asset.ready event processing
MUX-INT-003: Webhook - asset.errored event handling
MUX-INT-004: Video progress tracking API
MUX-E2E-001: Admin uploads video via UI
MUX-E2E-002: Student plays Mux video
MUX-E2E-003: Video progress saved on pause
MUX-E2E-004: Resume video from saved position
```

**Files Needed:**
- `e2e/mux-video-full.spec.ts`
- Enhance `__tests__/api/mux.test.ts`

---

### 1.4 Email Delivery E2E Tests — MEDIUM PRIORITY

**Current State:** Unit tests mock Resend, no actual delivery tests.

**Missing Tests:**
```
EMAIL-E2E-001: Welcome email sent on purchase
EMAIL-E2E-002: Course access email contains correct link
EMAIL-E2E-003: Newsletter subscription confirmation
EMAIL-E2E-004: Automation email sequence triggers
EMAIL-E2E-005: Bounce handling updates contact
EMAIL-E2E-006: Unsubscribe link works
```

**Implementation Notes:**
- Use Mailpit (local): `http://localhost:28324`
- Verify email content via Mailpit API

**Files Needed:**
- `e2e/email-delivery.spec.ts`

---

## Part 2: Feature-Specific Testing Gaps

### 2.1 Drip Content Scheduling

**Missing Tests:**
```
DRIP-UNIT-001: computeUnlockedAt returns correct date
DRIP-UNIT-002: isLessonUnlocked returns false before date
DRIP-UNIT-003: isLessonUnlocked returns true after date
DRIP-UNIT-004: Days-after-enroll calculation
DRIP-E2E-001: Locked lesson shows unlock date
DRIP-E2E-002: Lesson auto-unlocks when date passes
DRIP-E2E-003: Admin sets drip schedule
```

**Files Needed:**
- `__tests__/lib/drip.test.ts`
- `e2e/drip-content.spec.ts`

---

### 2.2 Certificate System

**Missing Tests:**
```
CERT-UNIT-001: Certificate number generation format
CERT-UNIT-002: Verification token generation
CERT-UNIT-003: PDF generation (once implemented)
CERT-INT-001: Auto-generation trigger on 100% progress
CERT-INT-002: Duplicate certificate prevention
CERT-E2E-001: Certificate appears on course completion
CERT-E2E-002: Certificate download works
CERT-E2E-003: Public verification page shows certificate
CERT-E2E-004: Invalid token shows error
```

**Files Needed:**
- Enhance `__tests__/api/certificates.test.ts`
- `e2e/certificate-verification.spec.ts`

---

### 2.3 Abandoned Checkout Recovery

**Missing Tests:**
```
ABANDON-UNIT-001: Detect abandoned checkout (status=created, age>1hr)
ABANDON-UNIT-002: Recovery email template renders
ABANDON-INT-001: Cron job finds abandoned checkouts
ABANDON-INT-002: Enrollment in recovery automation
ABANDON-INT-003: Resume link restores cart context
ABANDON-E2E-001: User abandons checkout, receives email
ABANDON-E2E-002: Resume link returns to checkout
```

**Files Needed:**
- `__tests__/lib/email/abandoned-checkout.test.ts`
- `e2e/abandoned-checkout.spec.ts`

---

### 2.4 Order Bumps & Upsells

**Missing Tests:**
```
BUMP-UNIT-001: Order bump component renders offer
BUMP-UNIT-002: Bump adds line item to checkout
BUMP-INT-001: Checkout session includes bump product
BUMP-INT-002: Webhook grants both entitlements
BUMP-E2E-001: User sees bump on checkout page
BUMP-E2E-002: Selecting bump updates total
BUMP-E2E-003: Purchase includes bump product

UPSELL-UNIT-001: Upsell modal triggers post-purchase
UPSELL-INT-001: One-click upsell creates new charge
UPSELL-E2E-001: Upsell modal appears after checkout
UPSELL-E2E-002: Accepting upsell completes purchase
```

**Files Needed:**
- `__tests__/components/offers/OrderBump.test.tsx`
- `__tests__/components/offers/UpsellModal.test.tsx`
- `e2e/order-bumps.spec.ts`
- `e2e/upsells.spec.ts`

---

## Part 3: Security Testing Gaps

### 3.1 Authentication Security

**Missing Tests:**
```
SEC-AUTH-001: Brute force protection (rate limiting)
SEC-AUTH-002: Session fixation prevention
SEC-AUTH-003: Token expiry enforcement
SEC-AUTH-004: Concurrent session handling
SEC-AUTH-005: Password strength validation
```

---

### 3.2 Authorization Security

**Missing Tests:**
```
SEC-AUTHZ-001: Admin route protection (all /admin/* routes)
SEC-AUTHZ-002: User data isolation (can't access other users' data)
SEC-AUTHZ-003: Course access control (entitlement enforcement)
SEC-AUTHZ-004: API rate limiting per user
SEC-AUTHZ-005: RLS policy enforcement (direct DB access)
```

---

### 3.3 Input Validation Security

**Missing Tests:**
```
SEC-INPUT-001: SQL injection via search queries
SEC-INPUT-002: XSS via user-generated content
SEC-INPUT-003: Path traversal via file uploads
SEC-INPUT-004: JSON injection via form fields
SEC-INPUT-005: Header injection via user input
```

---

### 3.4 Webhook Security

**Current:** Good coverage in `__tests__/security/webhook-signatures.test.ts`

**Additional Tests Needed:**
```
SEC-WHK-001: Replay attack prevention (timestamp validation)
SEC-WHK-002: Webhook timeout handling
SEC-WHK-003: Malformed payload handling
```

---

## Part 4: Performance & Load Testing Gaps

### 4.1 Load Testing (Not Currently Implemented)

**Recommended Tests:**
```
PERF-LOAD-001: 100 concurrent course page views
PERF-LOAD-002: 50 concurrent video streams
PERF-LOAD-003: 20 concurrent checkout sessions
PERF-LOAD-004: 100 concurrent chat messages
PERF-LOAD-005: Search with 1000+ results
```

**Tools Recommended:**
- k6 for load testing
- Playwright performance metrics

---

### 4.2 Database Performance

**Recommended Tests:**
```
PERF-DB-001: Course catalog query < 100ms
PERF-DB-002: Search query < 200ms
PERF-DB-003: Analytics aggregation < 500ms
PERF-DB-004: MRR calculation < 300ms
```

---

## Part 5: Accessibility Testing Gaps

### 5.1 WCAG Compliance Tests

**Missing Tests:**
```
A11Y-001: Keyboard navigation (all interactive elements)
A11Y-002: Screen reader compatibility
A11Y-003: Color contrast ratios
A11Y-004: Focus indicators
A11Y-005: Alt text for images
A11Y-006: Form label associations
A11Y-007: Error message announcements
```

**Tools Recommended:**
- Playwright axe-core integration
- `@axe-core/playwright`

**Files Needed:**
- `e2e/accessibility.spec.ts`

---

## Part 6: API Contract Testing Gaps

### 6.1 API Response Schema Validation

**Missing Tests:**
```
API-CONTRACT-001: /api/stripe/checkout returns correct schema
API-CONTRACT-002: /api/admin/courses returns paginated schema
API-CONTRACT-003: /api/community/threads returns thread schema
API-CONTRACT-004: Error responses follow standard format
```

**Tools Recommended:**
- Zod schemas for response validation
- OpenAPI spec generation

---

## Part 7: Test Infrastructure Improvements

### 7.1 Missing Test Utilities

| Utility | Purpose | Status |
|---------|---------|--------|
| Test database seeding | Consistent test data | ⚠️ Partial |
| Auth helper | Login as user/admin | ✅ Exists |
| Stripe mock | Mock Stripe API | ⚠️ Partial |
| Resend mock | Mock email sending | ✅ Exists |
| Mux mock | Mock video API | ❌ Missing |
| R2 mock | Mock file storage | ❌ Missing |

### 7.2 Missing Test Fixtures

| Fixture | Purpose | Status |
|---------|---------|--------|
| Sample course with modules/lessons | Course tests | ✅ Exists |
| Sample user with entitlements | Access tests | ✅ Exists |
| Sample Stripe webhook payloads | Webhook tests | ⚠️ Partial |
| Sample Mux webhook payloads | Video tests | ❌ Missing |
| Sample certificate data | Certificate tests | ❌ Missing |

---

## Part 8: Recommended Test Implementation Order

### Week 1 — Critical Gaps

1. **Stripe Webhook E2E** (`e2e/stripe-webhooks.spec.ts`)
   - Purchase flow
   - Subscription lifecycle
   - Refunds

2. **File Storage Tests** (`e2e/file-storage.spec.ts`)
   - Upload/download
   - Signed URLs
   - Security

### Week 2 — Feature Tests

3. **Mux Video Tests** (`e2e/mux-video-full.spec.ts`)
   - Upload
   - Playback
   - Progress

4. **Email Delivery Tests** (`e2e/email-delivery.spec.ts`)
   - Welcome email
   - Automation sequences

### Week 3 — Security & Performance

5. **Security Tests** (enhance `__tests__/security/`)
   - Auth security
   - Authorization
   - Input validation

6. **Accessibility Tests** (`e2e/accessibility.spec.ts`)
   - Keyboard navigation
   - Screen reader

### Week 4 — Polish

7. **Certificate Tests** (`e2e/certificate-verification.spec.ts`)
8. **Drip Content Tests** (`e2e/drip-content.spec.ts`)
9. **Order Bump Tests** (`e2e/order-bumps.spec.ts`)

---

## Appendix A: Test File Checklist

### Unit Tests Needed

- [ ] `__tests__/lib/drip.test.ts`
- [ ] `__tests__/lib/email/abandoned-checkout.test.ts`
- [ ] `__tests__/components/offers/OrderBump.test.tsx`
- [ ] `__tests__/components/offers/UpsellModal.test.tsx`
- [ ] `__tests__/api/mux-webhook.test.ts` (enhance)
- [ ] `__tests__/api/r2-storage.test.ts` (enhance)

### E2E Tests Needed

- [ ] `e2e/stripe-webhooks.spec.ts`
- [ ] `e2e/file-storage.spec.ts`
- [ ] `e2e/mux-video-full.spec.ts`
- [ ] `e2e/email-delivery.spec.ts`
- [ ] `e2e/certificate-verification.spec.ts`
- [ ] `e2e/drip-content.spec.ts`
- [ ] `e2e/order-bumps.spec.ts`
- [ ] `e2e/upsells.spec.ts`
- [ ] `e2e/abandoned-checkout.spec.ts`
- [ ] `e2e/accessibility.spec.ts`

### Test Utilities Needed

- [ ] `e2e/fixtures/mux-webhooks.json`
- [ ] `e2e/fixtures/certificate-data.json`
- [ ] `__tests__/mocks/mux.ts`
- [ ] `__tests__/mocks/r2.ts`

---

## Appendix B: Coverage Targets

| Metric | Current | Target |
|--------|---------|--------|
| Unit Test Coverage | ~65% | 80% |
| E2E Critical Paths | ~80% | 95% |
| API Route Coverage | ~70% | 90% |
| Security Test Coverage | ~60% | 85% |

---

*Document generated: January 19, 2026*
