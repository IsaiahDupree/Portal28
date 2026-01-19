# Portal28 Academy — PRD Gap Analysis

> **Document Version:** 1.0  
> **Analysis Date:** January 19, 2026  
> **Status:** Active  
> **Reference:** `docs/PRD.md`, `feature_list.json`

---

## Executive Summary

This document identifies gaps between the current codebase implementation and PRD requirements, along with new feature recommendations not covered in existing PRDs.

### Implementation Status Overview

| Phase | Features | Implemented | Completion |
|-------|----------|-------------|------------|
| **Phase 0: MVP** | 15 | 15 | **100%** ✅ |
| **Phase 1: Growth** | 24 | 17 | **~71%** |
| **Phase 2: Platform** | 55 | 48 | **~87%** |
| **Phase 3: Expansion** | 6 | 0 | **0%** (future) |
| **Phase 4: Video Platform** | 20 | 15 | **~75%** |

**Total: 120 features tracked, ~79% implemented**

---

## Part 1: Unimplemented PRD Features

### Phase 1 Growth — Gaps

| Feature ID | Feature | Priority | Effort | PRD Reference |
|------------|---------|----------|--------|---------------|
| `feat-056` | Order Bumps - Post-selection upsells | HIGH | Medium | PRD §Phase 1 |
| `feat-057` | Bundle Product Pages - Dedicated UI | MEDIUM | Medium | PRD §Phase 1 |
| `feat-058` | Upsell Flows - Post-purchase modal | MEDIUM | Medium | PRD §Phase 1 |
| `feat-059` | Limited-Time Offers - Countdown timers | MEDIUM | Low | PRD §Phase 1 |
| `feat-060` | Abandoned Checkout Recovery | MEDIUM | Medium | PRD §Phase 1 |
| `feat-061` | Cohort Analytics - Retention curves | LOW | Medium | PRD §Phase 1 |
| `feat-079` | Onboarding Email Sequence | HIGH | Low | PRD §Phase 1 |

### Phase 2 Platform — Gaps

| Feature ID | Feature | Priority | Effort | PRD Reference |
|------------|---------|----------|--------|---------------|
| `feat-062` | Drip Content UI - Locked state display | MEDIUM | Low | PRD §Course Delivery |
| `feat-063` | Mux Admin Upload UI | HIGH | Medium | PRD §Video |
| `feat-064` | PDF/File Upload UI - R2 admin | HIGH | Medium | PRD §Downloads |
| `feat-065` | Course Preview Links | LOW | Low | PRD §Admin CMS |
| `feat-070` | Google OAuth Login | LOW | Low | PRD §Auth (Optional) |
| `feat-071` | Cookie Consent Banner | LOW | Low | PRD §Privacy |
| `feat-080` | Announcement Email Notifications | MEDIUM | Low | PRD §Community |
| `feat-081` | Reply Notifications - Email digest | LOW | Medium | PRD §Community |
| `feat-089` | Certificate PDF Generation | MEDIUM | Medium | PRD §Certificates |
| `feat-090` | Certificate Verification Page | LOW | Low | PRD §Certificates |
| `feat-096` | Newsletter Subscription - Resend audience | LOW | Low | PRD §Email |

### Phase 4 Video Platform — Gaps

| Feature ID | Feature | Priority | Effort |
|------------|---------|----------|--------|
| `feat-111` | GitHub Dev Vlog Format | MEDIUM | High |
| `feat-114` | Comparison Format | LOW | Medium |
| `feat-115` | UGC Recreation Format | LOW | Medium |
| `feat-117` | Code Block Component | MEDIUM | Medium |
| `feat-118` | Terminal Animation Component | MEDIUM | Medium |

---

## Part 2: New Features — Not in Current PRDs

These features are recommended additions based on industry best practices and identified gaps.

### A. Revenue & Monetization

| Feature | Description | Business Value | Priority |
|---------|-------------|----------------|----------|
| **Trial-to-Paid Conversion Tracking** | Track trial→paid conversion rate per plan | High - optimize pricing | HIGH |
| **Revenue Attribution by Source** | Link orders to UTM source for ROAS calculation | High - ad optimization | HIGH |
| **Refund Reason Tracking** | Capture reasons when processing refunds | Medium - product feedback | MEDIUM |
| **Payment Retry Logic** | Handle failed payments with Stripe retry | Medium - reduce churn | MEDIUM |
| **Affiliate System** | Referral links, commission tracking, payouts | High - new revenue channel | MEDIUM |
| **Gift Purchases** | Buy courses as gifts for others | Low - seasonal revenue | LOW |

### B. User Experience

| Feature | Description | Business Value | Priority |
|---------|-------------|----------------|----------|
| **Course Prerequisites** | Lock courses until prerequisites completed | Medium - learning paths | MEDIUM |
| **Bookmark Lessons** | Allow students to bookmark favorite lessons | Low - engagement | LOW |
| **Watch Later Queue** | Queue lessons for later viewing | Low - engagement | LOW |
| **Learning Streaks** | Daily login streaks, gamification | Medium - retention | MEDIUM |
| **Dark Mode** | Theme toggle for reduced eye strain | Low - UX polish | LOW |
| **Keyboard Shortcuts** | Navigation shortcuts for power users | Low - UX polish | LOW |
| **Offline Mode (PWA)** | Download lessons for offline viewing | Medium - mobile users | LOW |

### C. Admin & Operations

| Feature | Description | Business Value | Priority |
|---------|-------------|----------------|----------|
| **Admin Audit Log UI** | View admin actions in dashboard | Medium - accountability | MEDIUM |
| **Bulk User Import** | CSV import for manual enrollments | Medium - enterprise | MEDIUM |
| **Course Duplication** | Clone course with all modules/lessons | Medium - content reuse | MEDIUM |
| **Scheduled Publishing** | Schedule course/lesson publish dates | Low - content ops | LOW |
| **Soft Delete & Restore** | Archive instead of hard delete | Medium - data safety | MEDIUM |
| **Admin Role Permissions** | Granular admin permissions (viewer/editor) | Medium - team scaling | LOW |
| **Webhooks for External Systems** | Send events to Zapier/Make/etc | Medium - integrations | LOW |

### D. Community Enhancements

| Feature | Description | Business Value | Priority |
|---------|-------------|----------------|----------|
| **Member Directory** | Searchable member profiles | Medium - networking | MEDIUM |
| **Direct Messaging (DMs)** | Private member-to-member messaging | Medium - engagement | MEDIUM |
| **Polls in Announcements** | Interactive community polls | Low - engagement | LOW |
| **Leaderboard** | Top contributors in community | Low - gamification | LOW |
| **User Badges/Roles** | Visual distinction for member tiers | Low - status | LOW |
| **Mentorship Matching** | Connect new members with experienced ones | Medium - retention | LOW |

### E. Analytics & Reporting

| Feature | Description | Business Value | Priority |
|---------|-------------|----------------|----------|
| **Email Revenue Attribution** | Track purchases from email campaigns | High - email ROI | HIGH |
| **Lesson Engagement Heatmaps** | Video watch patterns visualization | Medium - content optimization | MEDIUM |
| **Custom Report Builder** | Admin-defined analytics views | Low - flexibility | LOW |
| **Export All Data (GDPR)** | User data export for compliance | Medium - legal | MEDIUM |
| **A/B Testing Framework** | Test offer variations | High - optimization | MEDIUM |
| **Funnel Visualization** | Visual conversion funnel | Medium - insights | MEDIUM |

### F. Infrastructure & Performance

| Feature | Description | Business Value | Priority |
|---------|-------------|----------------|----------|
| **CDN for Video Assets** | Edge caching for Mux videos | Medium - performance | MEDIUM |
| **Rate Limiting Dashboard** | Monitor API usage and limits | Medium - security | LOW |
| **Backup & Recovery UI** | Self-service database backups | Medium - operations | LOW |
| **Multi-region Deployment** | Geographic redundancy | Low - enterprise | LOW |

---

## Part 3: Recommended Implementation Priorities

### Sprint 1 — Critical Path (Week 1-2)

| # | Feature | Reason | Effort |
|---|---------|--------|--------|
| 1 | Mux Upload UI (`feat-063`) | Unblocks video content creation | 4-6 hrs |
| 2 | R2 File Upload UI (`feat-064`) | Unblocks download attachments | 4-6 hrs |
| 3 | Drip Content UI (`feat-062`) | Complete existing feature | 2-3 hrs |
| 4 | Order Bumps Integration (`feat-056`) | Revenue impact | 3-4 hrs |

### Sprint 2 — Revenue Features (Week 3-4)

| # | Feature | Reason | Effort |
|---|---------|--------|--------|
| 5 | Bundle Product Pages (`feat-057`) | Enable bundle sales | 4-6 hrs |
| 6 | Limited-Time Offers (`feat-059`) | Urgency/scarcity | 3-4 hrs |
| 7 | Abandoned Checkout Recovery (`feat-060`) | Recover lost sales | 4-6 hrs |
| 8 | Onboarding Email Sequence (`feat-079`) | Customer success | 3-4 hrs |

### Sprint 3 — Polish & Compliance (Week 5-6)

| # | Feature | Reason | Effort |
|---|---------|--------|--------|
| 9 | Certificate PDF Generation (`feat-089`) | Course completion | 6-8 hrs |
| 10 | Certificate Verification (`feat-090`) | Credential validation | 2-3 hrs |
| 11 | Google OAuth (`feat-070`) | Reduce login friction | 1-2 hrs |
| 12 | Cookie Consent Banner (`feat-071`) | GDPR compliance | 2-3 hrs |

### Backlog — Future Sprints

- Affiliate System
- Cohort Analytics
- Member Directory
- DMs
- Custom Report Builder
- GDPR Data Export

---

## Part 4: Technical Debt to Address

### High Priority

1. **Type Generation** — Run `npx supabase gen types typescript` to sync DB types
2. **Error Handling** — Standardize on `lib/api-errors.ts` across all routes
3. **Unused Files** — Remove/gitignore large log files (`autonomous-harness.log`)

### Medium Priority

4. **Supabase Client Consolidation** — Use consistent patterns
5. **Image Optimization** — Replace `<img>` with Next.js `<Image>`
6. **Chart Bundle Size** — Review Recharts tree-shaking

### Low Priority

7. **Code Comments** — Add JSDoc to public functions
8. **Storybook** — Component documentation

---

## Appendix A: Feature Dependencies

```
feat-063 (Mux Upload) ← Required for video lessons
feat-064 (R2 Upload) ← Required for lesson downloads
feat-056 (Order Bumps) ← Requires checkout page changes
feat-060 (Abandoned Cart) ← Requires checkout_attempts tracking (exists)
feat-089 (PDF Certs) ← Requires @react-pdf/renderer library
```

---

## Appendix B: Database Schema Additions Needed

| Feature | Table/Column | Notes |
|---------|--------------|-------|
| Limited-Time Offers | `offers.start_at`, `offers.end_at` | TIMESTAMPTZ |
| Abandoned Cart | Already exists | `checkout_attempts.status` |
| Affiliate System | New tables | `affiliates`, `affiliate_referrals`, `affiliate_payouts` |
| Gift Purchases | `orders.is_gift`, `orders.gift_recipient_email` | |
| Course Prerequisites | `course_prerequisites` | Many-to-many |

---

*Document generated: January 19, 2026*
