# Portal28 Academy — Test-Driven Development Suite

> **Document Version:** 1.0  
> **Total Tests:** 300  
> **Total Features:** 55  
> **Last Updated:** January 13, 2026  
> **PRD Reference:** `docs/PRD.md`

---

## Table of Contents

1. [Overview](#overview)
2. [Test Categories](#test-categories)
3. [Phase 0 — MVP Tests (Features 1-15)](#phase-0--mvp-tests)
4. [Phase 1 — Growth Tests (Features 16-24)](#phase-1--growth-tests)
5. [Phase 2 — Platform Tests (Features 25-55)](#phase-2--platform-tests)
6. [Test Implementation Guide](#test-implementation-guide)
7. [Test Coverage Matrix](#test-coverage-matrix)

---

## Overview

This document defines **300 test cases** across **55 features** for Portal28.academy, organized by PRD phase. Each test includes:

- **Test ID**: Unique identifier (e.g., `MVP-AUTH-001`)
- **Feature**: The feature being tested
- **Test Type**: Unit / Integration / E2E
- **Description**: What the test validates
- **Expected Outcome**: The success criteria
- **Priority**: P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)

### Test Naming Convention

```
{PHASE}-{FEATURE}-{NUMBER}
```

- **PHASE**: `MVP`, `GRO` (Growth), `PLT` (Platform)
- **FEATURE**: 3-4 letter code (e.g., `AUTH`, `PAY`, `CAPI`)
- **NUMBER**: 3-digit sequential number

---

## Test Categories

| Category | Description | Count |
|----------|-------------|-------|
| Unit Tests | Isolated function testing | 120 |
| Integration Tests | API + DB testing | 100 |
| E2E Tests | Full user flow testing | 80 |
| **Total** | | **300** |

---

# Phase 0 — MVP Tests

## Feature 1: Authentication (AUTH)
**Files:** `__tests__/lib/auth/`, `e2e/auth.spec.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-AUTH-001 | Unit | Magic link token generation | Generates valid UUID token | P0 |
| MVP-AUTH-002 | Unit | Email validation for magic link | Rejects invalid email formats | P0 |
| MVP-AUTH-003 | Integration | Magic link sends email via Supabase | Email sent, token stored | P0 |
| MVP-AUTH-004 | Integration | Magic link verification | Valid token grants session | P0 |
| MVP-AUTH-005 | Integration | Expired magic link rejection | Tokens >1hr rejected | P0 |
| MVP-AUTH-006 | E2E | User requests magic link | User receives email | P0 |
| MVP-AUTH-007 | E2E | User completes magic link flow | Lands on dashboard | P0 |
| MVP-AUTH-008 | Unit | Session token refresh | Refreshes before expiry | P1 |
| MVP-AUTH-009 | Integration | Logout clears session | Session removed | P0 |
| MVP-AUTH-010 | E2E | Logout redirects to home | Sees public page | P1 |

---

## Feature 2: Middleware & Route Protection (MID)
**Files:** `__tests__/middleware/`, `middleware.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-MID-001 | Unit | Protected route detection | /app/* is protected | P0 |
| MVP-MID-002 | Unit | Admin route detection | /admin/* admin-only | P0 |
| MVP-MID-003 | Integration | Unauthenticated redirect | Redirects to /login | P0 |
| MVP-MID-004 | Integration | Non-admin accessing /admin | Returns 403 | P0 |
| MVP-MID-005 | Integration | Authenticated user /app | Allows access | P0 |
| MVP-MID-006 | E2E | Direct URL to protected | Redirects then returns | P1 |

---

## Feature 3: Public Pages (PUB)
**Files:** `e2e/public-pages.spec.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-PUB-001 | E2E | Home page loads | Renders hero, CTA | P0 |
| MVP-PUB-002 | E2E | Home page SEO meta | Has title, OG tags | P1 |
| MVP-PUB-003 | E2E | Courses catalog loads | Shows published courses | P0 |
| MVP-PUB-004 | E2E | Course sales page loads | Shows details, price | P0 |
| MVP-PUB-005 | E2E | Course curriculum section | Displays outline | P1 |
| MVP-PUB-006 | E2E | Course testimonials | Renders cards | P2 |
| MVP-PUB-007 | E2E | About page loads | Shows instructor bio | P2 |
| MVP-PUB-008 | E2E | FAQ page loads | Accordion works | P2 |
| MVP-PUB-009 | E2E | Terms of Service | Renders legal | P1 |
| MVP-PUB-010 | E2E | Privacy Policy | Renders legal | P1 |
| MVP-PUB-011 | Unit | Course slug generation | Valid URL slugs | P1 |
| MVP-PUB-012 | Integration | Catalog query | Published only | P0 |

---

## Feature 4: Stripe Payments (PAY)
**Files:** `__tests__/api/stripe/`, `app/api/stripe/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-PAY-001 | Unit | Stripe client init | Valid instance | P0 |
| MVP-PAY-002 | Unit | Checkout URL generation | Valid Stripe URL | P0 |
| MVP-PAY-003 | Integration | Create checkout session | Returns session_id | P0 |
| MVP-PAY-004 | Integration | Valid price_id checkout | Correct amount | P0 |
| MVP-PAY-005 | Integration | Invalid price_id | Returns 400 | P0 |
| MVP-PAY-006 | Integration | Success URL included | Redirects to /app | P0 |
| MVP-PAY-007 | Integration | Cancel URL included | Redirects to course | P1 |
| MVP-PAY-008 | Integration | Customer email attached | Session has email | P1 |
| MVP-PAY-009 | E2E | Buy button click | Redirects to Stripe | P0 |
| MVP-PAY-010 | E2E | Successful payment | Gains course access | P0 |

---

## Feature 5: Stripe Webhooks (WHK)
**Files:** `__tests__/api/stripe/webhook.test.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-WHK-001 | Unit | Signature verification | Validates signature | P0 |
| MVP-WHK-002 | Unit | Invalid signature rejection | Rejects tampered | P0 |
| MVP-WHK-003 | Integration | checkout.session.completed | Creates order + entitlement | P0 |
| MVP-WHK-004 | Integration | payment_intent.succeeded | Updates order status | P0 |
| MVP-WHK-005 | Integration | charge.refunded | Revokes entitlement | P0 |
| MVP-WHK-006 | Integration | Idempotent handling | Duplicates ignored | P0 |
| MVP-WHK-007 | Integration | User creation on purchase | Creates if not exists | P0 |
| MVP-WHK-008 | Integration | Order record creation | Stores payment details | P0 |
| MVP-WHK-009 | Integration | Entitlement granted | User can access | P0 |
| MVP-WHK-010 | Integration | Welcome email triggered | Sends access email | P1 |

---

## Feature 6: Entitlements & Access (ENT)
**Files:** `__tests__/lib/entitlements/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-ENT-001 | Unit | hasAccess - granted | Returns true | P0 |
| MVP-ENT-002 | Unit | hasAccess - revoked | Returns false | P0 |
| MVP-ENT-003 | Unit | hasAccess - no record | Returns false | P0 |
| MVP-ENT-004 | Integration | Grant entitlement | Creates record | P0 |
| MVP-ENT-005 | Integration | Revoke entitlement | Sets revoked | P0 |
| MVP-ENT-006 | Integration | Link by email | Associates pre-purchase | P1 |
| MVP-ENT-007 | E2E | User with access | Sees all lessons | P0 |
| MVP-ENT-008 | E2E | User without access | Sees paywall | P0 |

---

## Feature 7: Course Delivery (CRS)
**Files:** `e2e/courses.spec.ts`, `app/app/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-CRS-001 | E2E | Dashboard loads | Shows enrolled courses | P0 |
| MVP-CRS-002 | E2E | Course outline view | Modules and lessons | P0 |
| MVP-CRS-003 | E2E | Lesson page loads | Video + content | P0 |
| MVP-CRS-004 | E2E | Video embed renders | Player works | P0 |
| MVP-CRS-005 | E2E | Download links work | Files download | P1 |
| MVP-CRS-006 | E2E | Next/prev navigation | Navigates lessons | P1 |
| MVP-CRS-007 | E2E | Mobile responsive | Works on mobile | P1 |
| MVP-CRS-008 | Unit | Lesson sort order | Correct order | P1 |
| MVP-CRS-009 | Integration | Progress calculation | Returns % | P2 |
| MVP-CRS-010 | Integration | Completion tracking | Marks complete | P2 |

---

## Feature 8: Admin CMS - Courses (ADM-C)
**Files:** `e2e/admin-journey.spec.ts`, `app/admin/courses/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-ADM-C-001 | E2E | Admin dashboard loads | Shows stats | P0 |
| MVP-ADM-C-002 | E2E | Create new course | Appears in list | P0 |
| MVP-ADM-C-003 | E2E | Edit course details | Changes persist | P0 |
| MVP-ADM-C-004 | E2E | Delete course | Soft deleted | P1 |
| MVP-ADM-C-005 | E2E | Publish/unpublish | Status toggles | P0 |
| MVP-ADM-C-006 | Integration | Course API - Create | Returns 201 | P0 |
| MVP-ADM-C-007 | Integration | Course API - Read | Returns course | P0 |
| MVP-ADM-C-008 | Integration | Course API - Update | Returns 200 | P0 |
| MVP-ADM-C-009 | Integration | Course API - Delete | Marks deleted | P1 |
| MVP-ADM-C-010 | Integration | Non-admin denied | Returns 403 | P0 |

---

## Feature 9: Admin CMS - Modules (ADM-M)
**Files:** `app/api/admin/modules/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-ADM-M-001 | E2E | Create module | Appears in outline | P0 |
| MVP-ADM-M-002 | E2E | Reorder modules | Drag-drop works | P1 |
| MVP-ADM-M-003 | E2E | Edit module title | Title updates | P0 |
| MVP-ADM-M-004 | E2E | Delete module | Removed with lessons | P1 |
| MVP-ADM-M-005 | Integration | Module create API | Returns 201 | P0 |
| MVP-ADM-M-006 | Integration | Module update API | Returns 200 | P0 |
| MVP-ADM-M-007 | Integration | Module delete API | Cascades | P1 |
| MVP-ADM-M-008 | Integration | Module reorder API | Updates sort | P1 |

---

## Feature 10: Admin CMS - Lessons (ADM-L)
**Files:** `app/api/admin/lessons/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-ADM-L-001 | E2E | Create lesson | Lesson appears | P0 |
| MVP-ADM-L-002 | E2E | Edit lesson content | HTML saves | P0 |
| MVP-ADM-L-003 | E2E | Set video URL | Video embeds | P0 |
| MVP-ADM-L-004 | E2E | Add downloads | Files attached | P1 |
| MVP-ADM-L-005 | E2E | Reorder lessons | Order changes | P1 |
| MVP-ADM-L-006 | E2E | Delete lesson | Lesson removed | P1 |
| MVP-ADM-L-007 | Integration | Lesson create API | Returns 201 | P0 |
| MVP-ADM-L-008 | Integration | Lesson update API | Returns 200 | P0 |
| MVP-ADM-L-009 | Integration | Lesson delete API | Returns 200 | P1 |
| MVP-ADM-L-010 | Integration | Downloads JSONB | Stores array | P1 |

---

## Feature 11: Meta Pixel (PIX)
**Files:** `__tests__/lib/meta/`, `lib/meta/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-PIX-001 | Unit | Pixel script injection | Adds fbq script | P0 |
| MVP-PIX-002 | Unit | PageView event fire | fbq called | P0 |
| MVP-PIX-003 | E2E | Home fires PageView | Visible in helper | P0 |
| MVP-PIX-004 | E2E | Course fires ViewContent | With content_id | P0 |
| MVP-PIX-005 | E2E | Newsletter fires Lead | Lead event | P0 |
| MVP-PIX-006 | E2E | Buy fires InitiateCheckout | Event fires | P0 |
| MVP-PIX-007 | Unit | Event ID generation | Unique event_id | P0 |
| MVP-PIX-008 | Unit | Content parameters | Includes ids, value | P1 |

---

## Feature 12: Meta CAPI (CAPI)
**Files:** `__tests__/lib/meta/capi.test.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-CAPI-001 | Unit | Payload construction | Valid payload | P0 |
| MVP-CAPI-002 | Unit | User data hashing | SHA256 email | P0 |
| MVP-CAPI-003 | Unit | Event ID dedup | Matches Pixel | P0 |
| MVP-CAPI-004 | Integration | Purchase sends | Meta accepts | P0 |
| MVP-CAPI-005 | Integration | Lead sends | Meta accepts | P0 |
| MVP-CAPI-006 | Integration | CAPI from webhook | Fires on complete | P0 |
| MVP-CAPI-007 | Unit | IP address handling | Includes IP | P1 |
| MVP-CAPI-008 | Unit | User agent handling | Includes UA | P1 |
| MVP-CAPI-009 | Unit | fbp/fbc cookies | Includes cookies | P1 |
| MVP-CAPI-010 | Integration | Error handling | Logs, no throw | P1 |

---

## Feature 13: Attribution Tracking (ATR)
**Files:** `__tests__/lib/attribution/`, `lib/attribution/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-ATR-001 | Unit | UTM parsing | Extracts all fields | P0 |
| MVP-ATR-002 | Unit | fbclid extraction | Captures click ID | P0 |
| MVP-ATR-003 | Unit | Cookie storage | First-party cookie | P0 |
| MVP-ATR-004 | Integration | Attribution persist | Saves to table | P0 |
| MVP-ATR-005 | Integration | Link to user | Associates on login | P0 |
| MVP-ATR-006 | E2E | Landing with UTMs | Captured | P1 |
| MVP-ATR-007 | E2E | Persists to checkout | Attached to order | P1 |
| MVP-ATR-008 | Unit | Anonymous ID | Unique anon_id | P1 |

---

## Feature 14: Email - Resend (EML)
**Files:** `__tests__/lib/email/`, `lib/email/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-EML-001 | Unit | Resend client init | Valid config | P0 |
| MVP-EML-002 | Integration | Welcome email | Delivered | P0 |
| MVP-EML-003 | Integration | Course access email | With login link | P0 |
| MVP-EML-004 | Unit | Template rendering | HTML correct | P1 |
| MVP-EML-005 | Integration | Newsletter API | Creates + sends | P0 |
| MVP-EML-006 | Integration | Webhook - delivered | Updates events | P1 |
| MVP-EML-007 | Integration | Webhook - bounced | Marks suppressed | P1 |
| MVP-EML-008 | Integration | Webhook - complained | Marks suppressed | P1 |
| MVP-EML-009 | Unit | Contact upsert | Updates existing | P1 |
| MVP-EML-010 | Integration | Send logging | Records in table | P1 |

---

## Feature 15: Database Schema (DB)
**Files:** `__tests__/db/`, `supabase/migrations/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| MVP-DB-001 | Integration | Users RLS | Own data only | P0 |
| MVP-DB-002 | Integration | Courses RLS | Published public | P0 |
| MVP-DB-003 | Integration | Orders RLS | Own orders only | P0 |
| MVP-DB-004 | Integration | Entitlements RLS | Own only | P0 |
| MVP-DB-005 | Integration | Admin bypasses RLS | Full access | P0 |
| MVP-DB-006 | Unit | UUID generation | Valid UUIDs | P1 |
| MVP-DB-007 | Integration | FK constraints | Cascades work | P1 |
| MVP-DB-008 | Integration | Unique constraints | No duplicates | P1 |

---

# Phase 1 — Growth Tests

## Feature 16: Offers System (OFR)
**Files:** `lib/offers/`, `app/api/stripe/offer-checkout/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| GRO-OFR-001 | Unit | getOffers function | Returns active | P0 |
| GRO-OFR-002 | Unit | Offer by key | Returns single | P0 |
| GRO-OFR-003 | Integration | Offer checkout API | Creates session | P0 |
| GRO-OFR-004 | Integration | Membership checkout | Creates subscription | P0 |
| GRO-OFR-005 | Integration | Bundle checkout | Grants multiple | P1 |
| GRO-OFR-006 | E2E | Offer card renders | Shows price, CTA | P0 |
| GRO-OFR-007 | E2E | Offer card click | Redirects checkout | P0 |
| GRO-OFR-008 | Integration | Impressions API | Logs impression | P1 |
| GRO-OFR-009 | Integration | Checkout attempts | Creates record | P1 |
| GRO-OFR-010 | E2E | Multiple offers | All render | P1 |

---

## Feature 17: Offer Placements (PLC)
**Files:** `lib/offers/placements.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| GRO-PLC-001 | Unit | Get by placement | Returns ordered | P0 |
| GRO-PLC-002 | Integration | Save order | Updates sort | P1 |
| GRO-PLC-003 | Integration | Add to placement | Creates link | P1 |
| GRO-PLC-004 | Integration | Remove from placement | Deletes link | P1 |
| GRO-PLC-005 | E2E | Admin placements | Drag-drop works | P1 |
| GRO-PLC-006 | E2E | Widget placement | Shows in sidebar | P1 |

---

## Feature 18: Membership Checkout (MEM)
**Files:** `app/api/stripe/membership-checkout/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| GRO-MEM-001 | Integration | Subscription checkout | Returns URL | P0 |
| GRO-MEM-002 | Integration | Subscription webhook | Creates record | P0 |
| GRO-MEM-003 | Integration | Renewal | Extends access | P1 |
| GRO-MEM-004 | Integration | Cancellation | Revokes at end | P0 |
| GRO-MEM-005 | E2E | Customer portal | Opens Stripe | P1 |
| GRO-MEM-006 | Integration | Status check | Returns status | P0 |
| GRO-MEM-007 | Integration | invoice.paid | Updates sub | P1 |
| GRO-MEM-008 | Integration | payment_failed | Grace period | P1 |

---

## Feature 19: Admin Offers CRUD (ADM-O)
**Files:** `app/admin/offers/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| GRO-ADM-O-001 | E2E | List all offers | Shows table | P0 |
| GRO-ADM-O-002 | E2E | Create offer | Appears in list | P0 |
| GRO-ADM-O-003 | E2E | Edit offer | Changes persist | P0 |
| GRO-ADM-O-004 | E2E | Toggle active | Status changes | P0 |
| GRO-ADM-O-005 | E2E | Set payload | JSON saves | P1 |
| GRO-ADM-O-006 | Integration | Upsert API | Creates/updates | P0 |

---

## Feature 20: Analytics Dashboard (ANA)
**Files:** `app/admin/analytics/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| GRO-ANA-001 | E2E | Page loads | Shows charts | P0 |
| GRO-ANA-002 | E2E | Revenue chart | Daily/weekly/monthly | P1 |
| GRO-ANA-003 | E2E | Conversion funnel | LP → Purchase | P1 |
| GRO-ANA-004 | E2E | Top courses | Lists by revenue | P1 |
| GRO-ANA-005 | Integration | Daily metrics | Cron updates | P1 |
| GRO-ANA-006 | Integration | Offer analytics | Returns data | P1 |
| GRO-ANA-007 | E2E | Date filter | Charts update | P2 |
| GRO-ANA-008 | E2E | Export data | Downloads CSV | P2 |

---

## Feature 21: Email Programs (EPG)
**Files:** `app/admin/email-programs/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| GRO-EPG-001 | E2E | List programs | Shows all | P0 |
| GRO-EPG-002 | E2E | Create program | Appears | P0 |
| GRO-EPG-003 | E2E | Add email step | Step added | P0 |
| GRO-EPG-004 | E2E | Set delay | Configured | P1 |
| GRO-EPG-005 | E2E | Activate | Status active | P0 |
| GRO-EPG-006 | Integration | Scheduler runs | Sends due | P0 |
| GRO-EPG-007 | Integration | Skip sent | No duplicates | P0 |
| GRO-EPG-008 | Integration | Enroll user | Creates enrollment | P1 |
| GRO-EPG-009 | Integration | Drip timing | Respects delay | P1 |
| GRO-EPG-010 | E2E | Program analytics | Open/click rates | P1 |

---

## Feature 22: Email Analytics (EAN)
**Files:** `app/admin/email-analytics/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| GRO-EAN-001 | E2E | Analytics page | Shows stats | P1 |
| GRO-EAN-002 | E2E | Open rate | Shows % | P1 |
| GRO-EAN-003 | E2E | Click rate | Shows % | P1 |
| GRO-EAN-004 | E2E | Bounce rate | Shows % | P1 |
| GRO-EAN-005 | Integration | Aggregate stats | Calculates | P1 |
| GRO-EAN-006 | E2E | Filter by template | Filters | P2 |

---

## Feature 23: Coupons (CPN)
**Files:** `app/api/stripe/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| GRO-CPN-001 | Integration | Promo codes | Stripe accepts | P1 |
| GRO-CPN-002 | Integration | Invalid code | Error returned | P1 |
| GRO-CPN-003 | E2E | Enter at checkout | Discount applied | P1 |
| GRO-CPN-004 | Integration | Usage tracking | Records in Stripe | P2 |

---

## Feature 24: MRR & Subscriptions (MRR)
**Files:** `e2e/subscriptions-mrr.spec.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| GRO-MRR-001 | Integration | Calculate MRR | Sum active subs | P1 |
| GRO-MRR-002 | E2E | MRR widget | Shows current | P1 |
| GRO-MRR-003 | Integration | Churn rate | Calculates % | P1 |
| GRO-MRR-004 | E2E | Subscriber list | Shows active | P1 |
| GRO-MRR-005 | Integration | Sub history | Plan changes | P2 |
| GRO-MRR-006 | E2E | Revenue by plan | Breakdown | P2 |

---

# Phase 2 — Platform Tests

## Feature 25: Widget System (WDG)
**Files:** `lib/widgets/`, `supabase/migrations/0008-0009`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-WDG-001 | Unit | Get widgets | Returns enabled | P0 |
| PLT-WDG-002 | Unit | Access check | Validates membership | P0 |
| PLT-WDG-003 | Integration | Config retrieval | Returns settings | P1 |
| PLT-WDG-004 | E2E | Sidebar render | Shows nav | P0 |
| PLT-WDG-005 | E2E | Paywall | Shows upgrade | P0 |
| PLT-WDG-006 | Integration | Enable/disable | Admin toggles | P1 |

---

## Feature 26: Community Spaces (SPC)
**Files:** `lib/community/`, `supabase/migrations/0011`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-SPC-001 | Integration | Create space | Returns record | P0 |
| PLT-SPC-002 | Integration | Get by slug | Returns space | P0 |
| PLT-SPC-003 | Integration | List user spaces | Accessible spaces | P0 |
| PLT-SPC-004 | Integration | Membership check | Validates access | P0 |
| PLT-SPC-005 | E2E | Community home | Shows overview | P0 |
| PLT-SPC-006 | E2E | Space navigation | Sidebar works | P0 |

---

## Feature 27: Forums - Categories (FOR-C)
**Files:** `app/api/community/forum/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-FOR-C-001 | E2E | Categories page | Lists all | P0 |
| PLT-FOR-C-002 | E2E | Thread count | Shows number | P1 |
| PLT-FOR-C-003 | E2E | Click category | Opens threads | P0 |
| PLT-FOR-C-004 | Integration | Create API | Admin creates | P1 |
| PLT-FOR-C-005 | Integration | Sort order | Returns ordered | P1 |

---

## Feature 28: Forums - Threads (FOR-T)
**Files:** `app/api/community/threads/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-FOR-T-001 | E2E | Thread list | Shows all | P0 |
| PLT-FOR-T-002 | E2E | Create thread | Thread appears | P0 |
| PLT-FOR-T-003 | E2E | Thread detail | Title + posts | P0 |
| PLT-FOR-T-004 | E2E | Pinned first | At top | P1 |
| PLT-FOR-T-005 | Integration | Create API | Returns thread | P0 |
| PLT-FOR-T-006 | Integration | Thread RLS | Members only | P0 |
| PLT-FOR-T-007 | E2E | Pagination | Loads more | P2 |
| PLT-FOR-T-008 | E2E | Search | Finds matches | P2 |

---

## Feature 29: Forums - Posts (FOR-P)
**Files:** `app/api/community/replies/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-FOR-P-001 | E2E | Reply to thread | Post appears | P0 |
| PLT-FOR-P-002 | E2E | Edit own post | Updates | P1 |
| PLT-FOR-P-003 | E2E | Delete own post | Removed | P1 |
| PLT-FOR-P-004 | Integration | Create post API | Returns post | P0 |
| PLT-FOR-P-005 | Integration | Author data | Includes user | P1 |
| PLT-FOR-P-006 | E2E | Quote reply | Quotes original | P2 |
| PLT-FOR-P-007 | E2E | Rich text | Formatting works | P2 |
| PLT-FOR-P-008 | Integration | Notification | Notifies author | P2 |

---

## Feature 30: Announcements (ANN)
**Files:** `app/api/community/announcements/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-ANN-001 | E2E | Feed | Lists all | P0 |
| PLT-ANN-002 | E2E | Single view | Full content | P0 |
| PLT-ANN-003 | E2E | Pinned | At top | P1 |
| PLT-ANN-004 | E2E | Tags | Filter works | P2 |
| PLT-ANN-005 | Integration | Create API | Admin creates | P0 |
| PLT-ANN-006 | Integration | RLS | Members only | P0 |

---

## Feature 31: Resources (RES)
**Files:** `app/api/community/resources/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-RES-001 | E2E | Page loads | Folder tree | P0 |
| PLT-RES-002 | E2E | Navigate folders | Opens subfolder | P0 |
| PLT-RES-003 | E2E | Download file | Downloads | P0 |
| PLT-RES-004 | E2E | Open link | New tab | P1 |
| PLT-RES-005 | E2E | View note | Shows content | P1 |
| PLT-RES-006 | Integration | Create folder | Returns folder | P1 |
| PLT-RES-007 | Integration | Create item | Returns item | P1 |
| PLT-RES-008 | Integration | RLS | Members only | P0 |

---

## Feature 32: Realtime Chat (CHT)
**Files:** `components/community/ChatApp.tsx`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-CHT-001 | E2E | Channel loads | Shows messages | P0 |
| PLT-CHT-002 | E2E | Send message | Appears | P0 |
| PLT-CHT-003 | E2E | Realtime update | Auto-loads | P0 |
| PLT-CHT-004 | E2E | Timestamp | Shows time | P1 |
| PLT-CHT-005 | E2E | User avatar | Shows avatar | P1 |
| PLT-CHT-006 | Integration | Channel RLS | Members only | P0 |
| PLT-CHT-007 | Integration | Create API | Broadcasts | P0 |
| PLT-CHT-008 | E2E | Scroll history | Loads older | P2 |
| PLT-CHT-009 | E2E | Typing indicator | Shows typing | P3 |
| PLT-CHT-010 | E2E | Reactions | Emoji works | P3 |

---

## Feature 33: Community Admin (CAD)
**Files:** `app/admin/community/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-CAD-001 | E2E | Admin page | Management UI | P0 |
| PLT-CAD-002 | E2E | Create category | Appears | P1 |
| PLT-CAD-003 | E2E | Create announcement | Posts | P1 |
| PLT-CAD-004 | E2E | Manage folders | CRUD works | P1 |
| PLT-CAD-005 | E2E | Configure channels | Add/remove | P1 |
| PLT-CAD-006 | Integration | Settings API | Updates config | P1 |

---

## Feature 34: Moderation (MOD)
**Files:** `app/api/admin/community/`, `e2e/admin-moderation.spec.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-MOD-001 | E2E | Pin thread | Pinned | P1 |
| PLT-MOD-002 | E2E | Lock thread | No replies | P1 |
| PLT-MOD-003 | E2E | Delete thread | Removed | P1 |
| PLT-MOD-004 | E2E | Delete post | Removed | P1 |
| PLT-MOD-005 | E2E | Ban user | Loses access | P2 |
| PLT-MOD-006 | Integration | Mod API | Actions work | P1 |
| PLT-MOD-007 | E2E | Mod queue | Flagged content | P2 |

---

## Feature 35: Community Feed (FED)
**Files:** `lib/community/feed.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-FED-001 | Unit | Aggregate feed | Combined items | P1 |
| PLT-FED-002 | Unit | Feed sorting | Recent first | P1 |
| PLT-FED-003 | Integration | Feed API | Mixed items | P1 |
| PLT-FED-004 | E2E | Feed renders | Combined view | P1 |
| PLT-FED-005 | E2E | Item click | Opens page | P1 |

---

## Feature 36: Course Studio (STU)
**Files:** `app/admin/studio/`, `e2e/course-studio.spec.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-STU-001 | E2E | Studio loads | Course editor | P0 |
| PLT-STU-002 | E2E | Drag modules | Reorders | P1 |
| PLT-STU-003 | E2E | Drag lessons | Reorders | P1 |
| PLT-STU-004 | E2E | Inline edit | Title edits | P1 |
| PLT-STU-005 | E2E | Add module | Creates | P0 |
| PLT-STU-006 | E2E | Add lesson | Creates | P0 |
| PLT-STU-007 | E2E | Lesson modal | Full editor | P1 |
| PLT-STU-008 | E2E | Video input | Saves/previews | P1 |
| PLT-STU-009 | E2E | HTML editor | Rich text | P1 |
| PLT-STU-010 | Integration | Save API | Persists | P0 |

---

## Feature 37: Progress Tracking (PRG)
**Files:** `lib/progress/`, `app/api/progress/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-PRG-001 | Unit | Calculate progress | Returns % | P1 |
| PLT-PRG-002 | Integration | Mark complete | Creates record | P1 |
| PLT-PRG-003 | Integration | Mark incomplete | Removes record | P1 |
| PLT-PRG-004 | Integration | Get progress | Returns completed | P1 |
| PLT-PRG-005 | E2E | Progress bar | Shows % | P1 |
| PLT-PRG-006 | E2E | Checkbox toggle | Toggles | P1 |
| PLT-PRG-007 | E2E | Completed badge | Shows on finish | P2 |
| PLT-PRG-008 | Integration | Progress API | CRUD works | P1 |

---

## Feature 38: Lesson Notes (NOT)
**Files:** `app/api/notes/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-NOT-001 | E2E | Notes panel | Shows area | P1 |
| PLT-NOT-002 | E2E | Create note | Saves | P1 |
| PLT-NOT-003 | E2E | Edit note | Updates | P1 |
| PLT-NOT-004 | E2E | Delete note | Removed | P1 |
| PLT-NOT-005 | Integration | CRUD API | Works | P1 |
| PLT-NOT-006 | Integration | Notes RLS | Own only | P0 |

---

## Feature 39: Lesson Comments (COM)
**Files:** `app/api/comments/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-COM-001 | E2E | Comments section | Below lesson | P1 |
| PLT-COM-002 | E2E | Post comment | Appears | P1 |
| PLT-COM-003 | E2E | Reply to comment | Nested | P2 |
| PLT-COM-004 | E2E | Edit own | Updates | P2 |
| PLT-COM-005 | E2E | Delete own | Removed | P2 |
| PLT-COM-006 | Integration | Comments API | CRUD | P1 |
| PLT-COM-007 | Integration | Comments RLS | Members only | P1 |

---

## Feature 40: File Uploads (UPL)
**Files:** `app/api/uploads/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-UPL-001 | Integration | Signed URL | Returns URL | P1 |
| PLT-UPL-002 | Integration | Type validation | Rejects invalid | P1 |
| PLT-UPL-003 | Integration | Size limit | Rejects large | P1 |
| PLT-UPL-004 | E2E | Upload progress | Shows bar | P2 |
| PLT-UPL-005 | Integration | Download URL | Returns URL | P1 |
| PLT-UPL-006 | E2E | File manager | Lists files | P2 |

---

## Feature 41: Video Integration (VID)
**Files:** `app/api/video/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-VID-001 | Unit | Parse URL | Provider + ID | P1 |
| PLT-VID-002 | Unit | YouTube embed | Correct URL | P1 |
| PLT-VID-003 | Unit | Vimeo embed | Correct URL | P1 |
| PLT-VID-004 | Unit | Mux embed | Correct URL | P1 |
| PLT-VID-005 | E2E | Player renders | Plays | P0 |
| PLT-VID-006 | E2E | No autoplay | Respects | P2 |

---

## Feature 42: Preview Tokens (PRV)
**Files:** `app/api/preview/`, `supabase/migrations/0017`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-PRV-001 | Integration | Generate token | Unique token | P1 |
| PLT-PRV-002 | Integration | Validate token | Course access | P1 |
| PLT-PRV-003 | Integration | Expired rejected | Returns 401 | P1 |
| PLT-PRV-004 | E2E | Preview works | Shows course | P1 |
| PLT-PRV-005 | E2E | Preview watermark | Shows mode | P2 |

---

## Feature 43: Quiz System (QIZ)
**Files:** `app/api/quiz/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-QIZ-001 | Integration | Create quiz | Returns record | P2 |
| PLT-QIZ-002 | Integration | Add question | Returns Q | P2 |
| PLT-QIZ-003 | Integration | Submit answers | Returns score | P2 |
| PLT-QIZ-004 | E2E | Quiz renders | Shows Qs | P2 |
| PLT-QIZ-005 | E2E | Submit quiz | Shows results | P2 |
| PLT-QIZ-006 | Integration | Quiz progress | Records | P2 |

---

## Feature 44: Mobile Responsive (MOB)
**Files:** `e2e/mobile.spec.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-MOB-001 | E2E | Home mobile | Responsive | P0 |
| PLT-MOB-002 | E2E | Course mobile | Readable | P0 |
| PLT-MOB-003 | E2E | Lesson mobile | Video scales | P0 |
| PLT-MOB-004 | E2E | Dashboard mobile | Touch friendly | P0 |
| PLT-MOB-005 | E2E | Admin mobile | Basic works | P1 |
| PLT-MOB-006 | E2E | Community mobile | Usable | P1 |
| PLT-MOB-007 | E2E | Mobile nav | Hamburger | P0 |
| PLT-MOB-008 | E2E | Mobile checkout | Payment works | P0 |

---

## Feature 45: Performance (PRF)
**Files:** `__tests__/performance/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-PRF-001 | E2E | Home load | < 2s | P0 |
| PLT-PRF-002 | E2E | Course load | < 2s | P0 |
| PLT-PRF-003 | E2E | Dashboard load | < 3s | P1 |
| PLT-PRF-004 | E2E | Lesson load | < 2s | P1 |
| PLT-PRF-005 | Unit | Query efficiency | < 100ms | P1 |
| PLT-PRF-006 | E2E | Lighthouse | > 80 | P2 |

---

## Feature 46: Security (SEC)
**Files:** `__tests__/security/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-SEC-001 | Integration | Stripe sig | Validates | P0 |
| PLT-SEC-002 | Integration | Resend sig | Validates | P0 |
| PLT-SEC-003 | Integration | SQL injection | Prevented | P0 |
| PLT-SEC-004 | Integration | XSS prevention | Escaped | P0 |
| PLT-SEC-005 | Integration | CSRF | Validates | P0 |
| PLT-SEC-006 | Integration | Rate limiting | Blocks | P1 |
| PLT-SEC-007 | Unit | Password hash | Secure | P0 |
| PLT-SEC-008 | Integration | API keys | Not exposed | P0 |

---

## Feature 47: Error Handling (ERR)
**Files:** `__tests__/error/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-ERR-001 | E2E | 404 page | Friendly | P1 |
| PLT-ERR-002 | E2E | 500 handling | Error page | P1 |
| PLT-ERR-003 | Integration | API format | JSON errors | P1 |
| PLT-ERR-004 | Unit | Error logging | Context | P1 |
| PLT-ERR-005 | Integration | Degradation | Graceful | P2 |

---

## Feature 48: Cron Jobs (CRN)
**Files:** `app/api/cron/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-CRN-001 | Integration | Email cron | Processes | P1 |
| PLT-CRN-002 | Integration | Metrics cron | Aggregates | P1 |
| PLT-CRN-003 | Integration | Cron auth | Rejects unauth | P0 |
| PLT-CRN-004 | Integration | Idempotent | Safe rerun | P1 |

---

## Feature 49: Supabase (SUP)
**Files:** `lib/supabase/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-SUP-001 | Unit | Client init | Valid | P0 |
| PLT-SUP-002 | Unit | Server auth | Service role | P0 |
| PLT-SUP-003 | Integration | RLS testing | Enforced | P0 |
| PLT-SUP-004 | Integration | Realtime | Receives | P1 |
| PLT-SUP-005 | Integration | Storage | Works | P1 |

---

## Feature 50: API Standards (API)
**Files:** `e2e/api-routes.spec.ts`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-API-001 | Integration | JSON returns | Headers | P1 |
| PLT-API-002 | Integration | Auth required | 401 | P0 |
| PLT-API-003 | Integration | Admin required | 403 | P0 |
| PLT-API-004 | Integration | Body validation | 400 | P1 |
| PLT-API-005 | Integration | Rate headers | Present | P2 |
| PLT-API-006 | Integration | CORS | Correct | P1 |

---

## Feature 51: UI Components (UIC)
**Files:** `__tests__/components/ui/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-UIC-001 | Unit | Button | Variants | P1 |
| PLT-UIC-002 | Unit | Card | Children | P1 |
| PLT-UIC-003 | Unit | Input | onChange | P1 |
| PLT-UIC-004 | Unit | Modal | Opens/closes | P1 |
| PLT-UIC-005 | Unit | Toast | Messages | P1 |
| PLT-UIC-006 | Unit | Spinner | Animates | P2 |

---

## Feature 52: Offer Components (OFC)
**Files:** `components/offers/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-OFC-001 | Unit | OfferCard | Renders | P0 |
| PLT-OFC-002 | Unit | Badge display | Shows badge | P1 |
| PLT-OFC-003 | Unit | Price display | Formats | P1 |
| PLT-OFC-004 | Unit | Bullets list | Shows items | P1 |
| PLT-OFC-005 | Unit | CTA button | Clickable | P0 |

---

## Feature 53: Email Components (EMC)
**Files:** `components/emails/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-EMC-001 | Unit | WelcomeEmail | Renders | P0 |
| PLT-EMC-002 | Unit | CourseAccess | Renders | P0 |
| PLT-EMC-003 | Unit | Email layout | Consistent | P1 |
| PLT-EMC-004 | Unit | Dynamic data | Interpolates | P1 |

---

## Feature 54: Community Components (CMC)
**Files:** `components/community/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-CMC-001 | Unit | ForumApp | Renders | P0 |
| PLT-CMC-002 | Unit | ChatApp | Renders | P0 |
| PLT-CMC-003 | Unit | AnnouncementsApp | Renders | P0 |
| PLT-CMC-004 | Unit | ResourcesApp | Renders | P0 |
| PLT-CMC-005 | Unit | WidgetPaywall | Renders | P0 |

---

## Feature 55: Admin Components (ADC)
**Files:** `components/admin/`

| Test ID | Type | Description | Expected Outcome | Priority |
|---------|------|-------------|------------------|----------|
| PLT-ADC-001 | Unit | CourseForm | Renders | P0 |
| PLT-ADC-002 | Unit | ModuleForm | Renders | P0 |
| PLT-ADC-003 | Unit | LessonForm | Renders | P0 |
| PLT-ADC-004 | Unit | Form validation | Works | P1 |
| PLT-ADC-005 | Unit | Save handlers | Fire | P1 |

---

# Test Implementation Guide

## Running Tests

```bash
# Unit + Integration Tests
npm run test

# E2E Tests
npm run test:e2e

# Specific test file
npm run test -- __tests__/lib/auth/

# E2E with UI
npm run test:e2e:ui

# Coverage report
npm run test:coverage
```

## Test File Structure

```
Portal28/
├── __tests__/
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout.test.ts
│   │   │   └── webhook.test.ts
│   │   ├── admin/
│   │   └── community/
│   ├── components/
│   │   ├── ui/
│   │   ├── offers/
│   │   └── community/
│   ├── lib/
│   │   ├── auth/
│   │   ├── entitlements/
│   │   ├── meta/
│   │   ├── email/
│   │   └── community/
│   └── fixtures/
│       ├── stripe.ts
│       ├── users.ts
│       └── courses.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── user-journey.spec.ts
│   ├── admin-journey.spec.ts
│   ├── community.spec.ts
│   └── fixtures/
└── jest.config.js
```

## Mock Fixtures

### Stripe Mock

```typescript
// __tests__/fixtures/stripe.ts
export function createMockStripeEvent(type: string, data: any) {
  return {
    id: `evt_${Date.now()}`,
    type,
    data: { object: data },
    created: Math.floor(Date.now() / 1000)
  };
}
```

### User Mock

```typescript
// __tests__/fixtures/users.ts
export const mockUser = {
  id: 'user-test-123',
  email: 'test@example.com',
  role: 'student'
};

export const mockAdmin = {
  id: 'admin-test-456',
  email: 'admin@example.com',
  role: 'admin'
};
```

---

# Test Coverage Matrix

## By PRD Phase

| Phase | Features | Tests | Coverage Target |
|-------|----------|-------|-----------------|
| MVP | 15 | 132 | 95% |
| Growth | 9 | 70 | 90% |
| Platform | 31 | 98 | 85% |
| **Total** | **55** | **300** | **90%** |

## By Test Type

| Type | Count | % of Total |
|------|-------|------------|
| Unit | 120 | 40% |
| Integration | 100 | 33% |
| E2E | 80 | 27% |

## By Priority

| Priority | Count | % of Total |
|----------|-------|------------|
| P0 (Critical) | 95 | 32% |
| P1 (High) | 120 | 40% |
| P2 (Medium) | 65 | 22% |
| P3 (Low) | 20 | 6% |

---

# Implementation Checklist

## Phase 1: MVP Tests (Week 1-2)
- [ ] AUTH tests (10)
- [ ] MID tests (6)
- [ ] PUB tests (12)
- [ ] PAY tests (10)
- [ ] WHK tests (10)
- [ ] ENT tests (8)
- [ ] CRS tests (10)
- [ ] ADM-C tests (10)
- [ ] ADM-M tests (8)
- [ ] ADM-L tests (10)
- [ ] PIX tests (8)
- [ ] CAPI tests (10)
- [ ] ATR tests (8)
- [ ] EML tests (10)
- [ ] DB tests (8)

## Phase 2: Growth Tests (Week 3)
- [ ] OFR tests (10)
- [ ] PLC tests (6)
- [ ] MEM tests (8)
- [ ] ADM-O tests (6)
- [ ] ANA tests (8)
- [ ] EPG tests (10)
- [ ] EAN tests (6)
- [ ] CPN tests (4)
- [ ] MRR tests (6)

## Phase 3: Platform Tests (Week 4-5)
- [ ] All Widget/Community tests
- [ ] All Studio tests
- [ ] All Component tests
- [ ] Performance/Security tests

---

*Document generated: January 13, 2026*
*PRD Reference: /docs/PRD.md*
*Assessment Reference: /docs/PRD_ASSESSMENT.md*
