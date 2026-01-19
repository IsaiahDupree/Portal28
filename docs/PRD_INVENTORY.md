# Portal28 Academy — PRD & Feature Inventory

> **Document Version:** 1.0  
> **Generated:** January 19, 2026  
> **Total Features:** 195  
> **Total E2E Tests:** 641  
> **Total PRD Documents:** 13

---

## Part 1: PRD Document Index

### Core PRDs

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 1 | **PRD.md** | Master product requirements (Phases 0-3) | `docs/PRD.md` |
| 2 | **PRD_ASSESSMENT.md** | Implementation status vs PRD | `docs/PRD_ASSESSMENT.md` |
| 3 | **PRD_GAP_ANALYSIS.md** | Gap analysis & recommendations | `docs/PRD_GAP_ANALYSIS.md` |
| 4 | **PRD_NEW_FEATURES.md** | New feature specifications | `docs/PRD_NEW_FEATURES.md` |

### Supporting Documents

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 5 | **FEATURES.md** | Recent feature additions | `docs/FEATURES.md` |
| 6 | **AUDIT.md** | Feature audit & gaps | `docs/AUDIT.md` |
| 7 | **TDD_TEST_SUITE.md** | Test specifications (300 tests) | `docs/TDD_TEST_SUITE.md` |
| 8 | **TESTING_GAP_ANALYSIS.md** | Testing coverage gaps | `docs/TESTING_GAP_ANALYSIS.md` |
| 9 | **API_TEST_COVERAGE.md** | API route test mapping | `docs/API_TEST_COVERAGE.md` |

### Operations Documents

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 10 | **DEPLOYMENT.md** | Deployment guide | `docs/DEPLOYMENT.md` |
| 11 | **LAUNCH_CHECKLIST.md** | Launch preparation | `docs/LAUNCH_CHECKLIST.md` |
| 12 | **DEVELOPER_HANDOFF.md** | Developer onboarding | `docs/DEVELOPER_HANDOFF.md` |
| 13 | **marketing-copy.md** | Marketing content | `docs/marketing-copy.md` |

---

## Part 2: Feature Summary by Phase

### Phase 0: MVP — 15 Features (100% Complete)

| ID | Feature | Status | Test Coverage |
|----|---------|--------|---------------|
| feat-001 | Authentication (Magic Link) | ✅ | E2E: auth-full.spec.ts |
| feat-002 | Password Authentication | ✅ | E2E: auth-full.spec.ts |
| feat-003 | Middleware & Route Protection | ✅ | Unit: middleware/ |
| feat-004 | Public Pages (Home, Courses) | ✅ | E2E: public-pages.spec.ts |
| feat-005 | Course Catalog | ✅ | E2E: courses.spec.ts |
| feat-006 | Course Sales Pages | ✅ | E2E: courses.spec.ts |
| feat-007 | Stripe Checkout | ✅ | Unit: stripe-checkout.test.ts |
| feat-008 | Stripe Webhooks | ✅ | Unit: stripe-webhook.test.ts |
| feat-009 | Entitlements System | ✅ | Unit: entitlements/ |
| feat-010 | Student Dashboard | ✅ | E2E: dashboard.spec.ts |
| feat-011 | Lesson Player | ✅ | E2E: course-delivery.spec.ts |
| feat-012 | Admin Dashboard | ✅ | E2E: admin.spec.ts |
| feat-013 | Admin Course CRUD | ✅ | E2E: admin-journey.spec.ts |
| feat-014 | Meta Pixel + CAPI | ✅ | E2E: meta-tracking.spec.ts |
| feat-015 | Email (Resend) | ✅ | Unit: email/ |

### Phase 1: Growth — 24 Features (71% Complete)

| ID | Feature | Status | Test Coverage |
|----|---------|--------|---------------|
| feat-016 | Offers System | ✅ | E2E: admin-offers.spec.ts |
| feat-017 | Promo Codes | ✅ | E2E: promo-codes.spec.ts |
| feat-018 | Email Programs | ✅ | E2E: email-campaigns.spec.ts |
| feat-019 | Email Analytics | ✅ | E2E: email-analytics.spec.ts |
| feat-020 | Email Automations | ✅ | E2E: email-automations.spec.ts |
| feat-021 | Subscription Management | ✅ | E2E: subscriptions-mrr.spec.ts |
| feat-022 | MRR Dashboard | ✅ | E2E: mrr-dashboard.spec.ts |
| feat-023 | Subscription History | ✅ | Unit: subscriptions.test.ts |
| feat-024 | Churn Rate Analytics | ✅ | Unit: included in MRR |
| feat-056 | Order Bumps | ❌ | **NEEDS E2E** |
| feat-057 | Bundle Product Pages | ❌ | **NEEDS E2E** |
| feat-058 | Upsell Flows | ❌ | **NEEDS E2E** |
| feat-059 | Limited-Time Offers | ❌ | **NEEDS E2E** |
| feat-060 | Abandoned Checkout Recovery | ❌ | **NEEDS E2E** |
| feat-061 | Cohort Analytics | ❌ | **NEEDS E2E** |
| feat-079 | Onboarding Email Sequence | ❌ | **NEEDS E2E** |
| feat-084 | Offer Impression Analytics | ✅ | Included in analytics |
| feat-092 | Subscription History Tracking | ✅ | Unit tests exist |
| feat-093 | Churn Rate Analytics | ✅ | Unit tests exist |
| feat-096 | Newsletter Subscription | ❌ | E2E: newsletter.spec.ts (partial) |

### Phase 2: Platform — 55 Features (87% Complete)

| ID | Feature | Status | Test Coverage |
|----|---------|--------|---------------|
| feat-025 | Community Home | ✅ | E2E: community.spec.ts |
| feat-026 | Forums | ✅ | E2E: forum-*.spec.ts |
| feat-027 | Announcements | ✅ | E2E: announcements.spec.ts |
| feat-028 | Resources Library | ✅ | E2E: resources-library.spec.ts |
| feat-029 | Chat (Realtime) | ✅ | E2E: chat.spec.ts |
| feat-030 | Chat Reactions | ✅ | Included in chat tests |
| feat-031 | Chat Channels | ✅ | Included in chat tests |
| feat-032 | Typing Indicators | ✅ | Included in chat tests |
| feat-033 | Widget System | ✅ | E2E: widget-system.spec.ts |
| feat-034 | Course Studio | ✅ | E2E: course-studio.spec.ts |
| feat-035 | Lesson Editor | ✅ | E2E: course-studio-features.spec.ts |
| feat-036 | Lesson Notes | ✅ | E2E: lesson-notes.spec.ts |
| feat-037 | Lesson Comments | ✅ | Unit: lesson-comments.test.ts |
| feat-038 | Progress Tracking | ✅ | E2E: progress-tracking.spec.ts |
| feat-039 | Certificates | ✅ | E2E: certificates.spec.ts |
| feat-040 | Quiz System | ✅ | E2E: quizzes.spec.ts |
| feat-041 | Mux Video Playback | ✅ | E2E: mux-video.spec.ts |
| feat-042 | R2 File Storage | ✅ | Unit: r2-storage.test.ts |
| feat-043 | Notifications | ✅ | E2E: notifications.spec.ts |
| feat-044 | User Profile | ✅ | E2E: user-profile.spec.ts |
| feat-045 | Search | ✅ | E2E: search.spec.ts |
| feat-046 | CSRF Protection | ✅ | Unit: security/ |
| feat-047 | XSS Prevention | ✅ | Unit: security/ |
| feat-048 | Webhook Signatures | ✅ | Unit: security/ |
| feat-049 | Error Handling | ✅ | E2E: error-handling.spec.ts |
| feat-050 | Caching | ✅ | Unit: cache.test.ts |
| feat-051 | SEO & Sitemap | ✅ | Unit: seo.test.ts |
| feat-052 | Mobile Responsiveness | ✅ | E2E: mobile-responsiveness.spec.ts |
| feat-053 | Deployment (Vercel) | ✅ | CI/CD: .github/workflows |
| feat-054 | Database Migrations | ✅ | Unit: db/ |
| feat-055 | Documentation | ✅ | docs/ |
| feat-062 | Drip Content UI | ❌ | **NEEDS E2E** |
| feat-063 | Mux Admin Upload UI | ❌ | **NEEDS E2E** |
| feat-064 | PDF/File Upload UI | ❌ | **NEEDS E2E** |
| feat-065 | Course Preview Links | ❌ | **NEEDS E2E** |
| feat-066 | Community Activity Feed | ✅ | Included in community |
| feat-067 | Multi-Provider Video | ✅ | E2E: mux-video.spec.ts |
| feat-068 | Enrollment Analytics | ✅ | E2E: admin-analytics.spec.ts |
| feat-069 | Content Reports System | ✅ | E2E: moderation-features.spec.ts |
| feat-070 | Google OAuth | ❌ | **NEEDS E2E** |
| feat-071 | Cookie Consent Banner | ❌ | **NEEDS E2E** |
| feat-078 | Workspace System | ❌ | **NEEDS E2E** |
| feat-080 | Announcement Emails | ❌ | **NEEDS E2E** |
| feat-081 | Reply Notifications | ❌ | **NEEDS E2E** |
| feat-082 | Mux Webhook Handler | ✅ | Unit: mux.test.ts |
| feat-083 | Quiz Grading | ✅ | Included in quizzes |
| feat-085 | Password Auth | ✅ | E2E: auth-full.spec.ts |
| feat-089 | Certificate PDF Generation | ❌ | **NEEDS E2E** |
| feat-090 | Certificate Verification Page | ❌ | **NEEDS E2E** |
| feat-091 | Auto-Certificate Trigger | ✅ | Included in certificates |
| feat-094 | Notification Preferences | ✅ | Included in notifications |
| feat-095 | User Profiles with Avatars | ✅ | E2E: user-profile.spec.ts |
| feat-097 | Video Progress Tracking | ✅ | Included in progress |
| feat-098 | Full-Text Search | ✅ | E2E: search.spec.ts |
| feat-099 | Realtime Subscriptions | ✅ | Included in chat |
| feat-100 | Drip Content Logic | ✅ | Unit: lib/drip.ts |

### Phase 3: Expansion — 6 Features (0% - Future)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| feat-072 | Affiliate System | ❌ | Future phase |
| feat-073 | Events/Calendar | ❌ | Future phase |
| feat-074 | Coaching Bookings | ❌ | Future phase |
| feat-075 | Templates Vault | ❌ | Future phase |
| feat-076 | Multi-Instructor | ❌ | Future phase |
| feat-077 | App Marketplace | ❌ | Future phase |

### Phase 4: Video Platform — 95 Features (79% Complete)

| ID Range | Category | Implemented | Total |
|----------|----------|-------------|-------|
| feat-101 to feat-110 | Core Pipeline | 9 | 10 |
| feat-111 to feat-120 | Video Formats | 6 | 10 |
| feat-121 to feat-130 | Compositions | 8 | 10 |
| feat-131 to feat-140 | Automation | 6 | 10 |
| feat-141 to feat-150 | Audio System | 10 | 10 |
| feat-151 to feat-160 | Components | 7 | 10 |
| feat-161 to feat-170 | Ad Creatives | 10 | 10 |
| feat-171 to feat-180 | Integrations | 10 | 10 |
| feat-181 to feat-195 | Utilities | 15 | 15 |

---

## Part 3: E2E Test Inventory

### Test Files by Category (48 files, 641 tests)

#### Authentication & User
| File | Tests | Coverage |
|------|-------|----------|
| `auth.spec.ts` | 5 | Basic auth flows |
| `auth-full.spec.ts` | 27 | Full auth including password |
| `user-journey.spec.ts` | 24 | Complete user flows |
| `user-profile.spec.ts` | 17 | Profile management |

#### Admin & Management
| File | Tests | Coverage |
|------|-------|----------|
| `admin.spec.ts` | 6 | Admin access |
| `admin-journey.spec.ts` | 35 | Admin workflows |
| `admin-analytics.spec.ts` | 16 | Analytics dashboard |
| `admin-moderation.spec.ts` | 17 | Content moderation |
| `admin-offers.spec.ts` | 8 | Offer management |

#### Course & Content
| File | Tests | Coverage |
|------|-------|----------|
| `courses.spec.ts` | 5 | Course pages |
| `course-delivery.spec.ts` | 16 | Lesson playback |
| `course-studio.spec.ts` | 16 | Course editor |
| `course-studio-features.spec.ts` | 19 | Editor features |
| `progress-tracking.spec.ts` | 11 | Progress system |
| `quizzes.spec.ts` | 8 | Quiz system |
| `certificates.spec.ts` | 13 | Certificates |

#### Community
| File | Tests | Coverage |
|------|-------|----------|
| `community.spec.ts` | 4 | Community home |
| `community-admin.spec.ts` | 26 | Community admin |
| `community-messaging.spec.ts` | 30 | Messaging |
| `community-spaces.spec.ts` | 6 | Spaces |
| `chat.spec.ts` | 11 | Real-time chat |
| `forum-categories.spec.ts` | 9 | Forum categories |
| `forum-posts.spec.ts` | 9 | Forum posts |
| `forum-threads.spec.ts` | 6 | Forum threads |
| `announcements.spec.ts` | 9 | Announcements |
| `resources-library.spec.ts` | 11 | Resources |

#### Email
| File | Tests | Coverage |
|------|-------|----------|
| `email-analytics.spec.ts` | 11 | Email stats |
| `email-automations.spec.ts` | 11 | Automations |
| `email-campaigns.spec.ts` | 20 | Campaigns |
| `newsletter.spec.ts` | 2 | Newsletter |

#### Search & Navigation
| File | Tests | Coverage |
|------|-------|----------|
| `search.spec.ts` | 22 | Global search |
| `widget-system.spec.ts` | 22 | Widget routing |
| `notifications.spec.ts` | 12 | Notifications |

#### Subscriptions & Payments
| File | Tests | Coverage |
|------|-------|----------|
| `subscriptions-mrr.spec.ts` | 13 | Subscriptions |
| `mrr-dashboard.spec.ts` | 21 | MRR analytics |
| `promo-codes.spec.ts` | 5 | Promo codes |

#### Mobile & Responsiveness
| File | Tests | Coverage |
|------|-------|----------|
| `mobile.spec.ts` | 21 | Mobile layouts |
| `mobile-responsiveness.spec.ts` | 14 | Responsive design |

#### Infrastructure
| File | Tests | Coverage |
|------|-------|----------|
| `public-pages.spec.ts` | 15 | Public routes |
| `api-routes.spec.ts` | 7 | API endpoints |
| `error-handling.spec.ts` | 10 | Error pages |
| `dashboard.spec.ts` | 7 | Dashboard |
| `meta-tracking.spec.ts` | 3 | Meta Pixel |
| `mux-video.spec.ts` | 5 | Video playback |
| `lesson-notes.spec.ts` | 7 | Notes feature |
| `moderation-features.spec.ts` | 25 | Moderation |
| `analytics-dashboard.spec.ts` | 10 | Analytics |
| `new-features.spec.ts` | 14 | New features |

---

## Part 4: Missing E2E Tests (Priority)

### Critical — Revenue Impact

| Feature | Proposed Test File | Tests Needed |
|---------|-------------------|--------------|
| Order Bumps | `order-bumps.spec.ts` | 8 |
| Upsell Flows | `upsells.spec.ts` | 8 |
| Abandoned Checkout | `abandoned-checkout.spec.ts` | 6 |
| Stripe Webhooks E2E | `stripe-webhooks.spec.ts` | 10 |

### High — Core Features

| Feature | Proposed Test File | Tests Needed |
|---------|-------------------|--------------|
| Mux Upload UI | `mux-upload.spec.ts` | 6 |
| File Storage UI | `file-storage.spec.ts` | 8 |
| Drip Content UI | `drip-content.spec.ts` | 6 |
| Bundle Pages | `bundle-pages.spec.ts` | 6 |

### Medium — Enhancement

| Feature | Proposed Test File | Tests Needed |
|---------|-------------------|--------------|
| Certificate PDF | `certificate-pdf.spec.ts` | 4 |
| Certificate Verify | `certificate-verify.spec.ts` | 4 |
| Google OAuth | `oauth.spec.ts` | 4 |
| Cookie Consent | `cookie-consent.spec.ts` | 4 |
| Limited-Time Offers | `limited-offers.spec.ts` | 6 |

### Low — Polish

| Feature | Proposed Test File | Tests Needed |
|---------|-------------------|--------------|
| Course Preview | `course-preview.spec.ts` | 4 |
| Announcement Emails | `announcement-email.spec.ts` | 4 |
| Reply Notifications | `reply-notifications.spec.ts` | 4 |
| Accessibility | `accessibility.spec.ts` | 10 |

---

## Part 5: Feature Statistics

### By Phase

```
Phase 0: MVP        15/15  (100%)  ████████████████████
Phase 1: Growth     17/24  ( 71%)  ██████████████░░░░░░
Phase 2: Platform   48/55  ( 87%)  █████████████████░░░
Phase 3: Expansion   0/6   (  0%)  ░░░░░░░░░░░░░░░░░░░░
Phase 4: Video      75/95  ( 79%)  ███████████████░░░░░
─────────────────────────────────────────────────────────
TOTAL              155/195 ( 79%)
```

### By Priority

| Priority | Implemented | Total | Percent |
|----------|-------------|-------|---------|
| Critical | 28 | 30 | 93% |
| High | 42 | 48 | 88% |
| Medium | 55 | 72 | 76% |
| Low | 30 | 45 | 67% |

### Test Coverage

| Category | Tests | Status |
|----------|-------|--------|
| E2E Tests | 641 | ✅ Good |
| Unit Tests | 733+ | ✅ Good |
| Security Tests | 83+ | ✅ Good |
| API Coverage | 56% | ⚠️ Needs work |

---

## Part 6: Next Actions

### Immediate (This Sprint)

1. **Add missing E2E tests for revenue features**
   - `order-bumps.spec.ts`
   - `stripe-webhooks.spec.ts`

2. **Complete Studio tests**
   - `__tests__/api/studio/courses.test.ts`

3. **File storage E2E**
   - `file-storage.spec.ts`

### Near-term (Next 2 Sprints)

4. Implement unfinished Growth features (feat-056 to feat-061)
5. Complete Platform gaps (feat-062 to feat-065)
6. Add accessibility tests

### Backlog

7. Phase 3 Expansion features
8. Remaining Phase 4 Video features
9. Load testing infrastructure

---

*Document generated: January 19, 2026*
