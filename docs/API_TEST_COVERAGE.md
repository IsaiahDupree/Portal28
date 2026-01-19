# Portal28 Academy — API Route Test Coverage

> **Document Version:** 1.0  
> **Analysis Date:** January 19, 2026  
> **Total API Routes:** 80+  
> **Routes with Tests:** ~45 (~56%)

---

## Coverage Summary

| Category | Routes | Tested | Coverage |
|----------|--------|--------|----------|
| Admin - Courses/Modules/Lessons | 12 | 10 | 83% |
| Admin - Email | 10 | 3 | 30% |
| Admin - Community | 8 | 4 | 50% |
| Admin - Other | 12 | 4 | 33% |
| Stripe | 6 | 5 | 83% |
| Community | 12 | 6 | 50% |
| User Features | 15 | 10 | 67% |
| Studio | 8 | 0 | 0% |
| Other | 7 | 3 | 43% |

---

## Part 1: Routes WITH Test Coverage ✅

### Stripe Routes
| Route | Test File | Coverage |
|-------|-----------|----------|
| `/api/stripe/checkout` | `stripe-checkout.test.ts` | ✅ Full |
| `/api/stripe/offer-checkout` | `stripe-offer-checkout.test.ts` | ✅ Full |
| `/api/stripe/webhook` | `stripe-webhook.test.ts` | ✅ Full |
| `/api/stripe/membership-checkout` | `subscriptions.test.ts` | ✅ Partial |
| `/api/stripe/customer-portal` | `subscriptions.test.ts` | ✅ Partial |

### Admin - Course Management
| Route | Test File | Coverage |
|-------|-----------|----------|
| `/api/admin/courses` | `admin/courses.test.ts` | ✅ Full |
| `/api/admin/courses/[id]` | `admin/courses.test.ts` | ✅ Full |
| `/api/admin/courses/[id]/modules` | `admin/modules.test.ts` | ✅ Full |
| `/api/admin/modules/[id]` | `admin/modules.test.ts` | ✅ Full |
| `/api/admin/modules/[id]/lessons` | `admin/lessons.test.ts` | ✅ Full |
| `/api/admin/lessons/[id]` | `admin/lessons.test.ts` | ✅ Full |

### Admin - Offers & Widgets
| Route | Test File | Coverage |
|-------|-----------|----------|
| `/api/admin/offers/upsert` | `admin/offers-upsert.test.ts` | ✅ Full |
| `/api/admin/widgets` | `admin/widgets.test.ts` | ✅ Full |
| `/api/admin/announcements` | `admin/announcements.test.ts` | ✅ Full |
| `/api/admin/forum-categories` | `admin/forum-categories.test.ts` | ✅ Full |

### User Features
| Route | Test File | Coverage |
|-------|-----------|----------|
| `/api/search` | `search.test.ts` | ✅ Full |
| `/api/notes` | `notes.test.ts` | ✅ Full |
| `/api/profile` | `profile.test.ts` | ✅ Full |
| `/api/progress` | `progress.test.ts` | ✅ Full |
| `/api/notifications` | `notifications.test.ts` | ✅ Full |
| `/api/certificates` | `certificates.test.ts` | ✅ Full |
| `/api/quizzes` | `quizzes.test.ts` | ✅ Full |
| `/api/newsletter/subscribe` | `newsletter.test.ts` | ✅ Full |

### Community
| Route | Test File | Coverage |
|-------|-----------|----------|
| `/api/community/forum/*` | `community/forum.test.ts` | ✅ Partial |
| `/api/community/threads/*` | `community/threads.test.ts` | ✅ Partial |
| `/api/community/spaces/*` | `community/spaces.test.ts` | ✅ Partial |

### Security
| Route | Test File | Coverage |
|-------|-----------|----------|
| Webhook signatures | `security/webhook-signatures.test.ts` | ✅ Full |
| CSRF protection | `security/csrf-and-rate-limit.test.ts` | ✅ Full |
| XSS prevention | `security/xss-prevention.test.ts` | ✅ Full |

---

## Part 2: Routes WITHOUT Test Coverage ❌

### CRITICAL — No Tests

| Route | Priority | Reason |
|-------|----------|--------|
| `/api/studio/courses` | HIGH | Core content creation |
| `/api/studio/courses/[id]` | HIGH | Course editing |
| `/api/studio/courses/[id]/chapters` | HIGH | Chapter management |
| `/api/studio/chapters/[id]/lessons` | HIGH | Lesson creation |
| `/api/studio/lessons/[id]` | HIGH | Lesson editing |
| `/api/studio/lessons/reorder` | MEDIUM | Lesson ordering |
| `/api/video/mux/create-upload` | HIGH | Video uploads |
| `/api/admin/mux/upload` | HIGH | Admin video uploads |
| `/api/admin/mux/webhook` | HIGH | Video processing |

### HIGH PRIORITY — Missing Tests

| Route | Description | Impact |
|-------|-------------|--------|
| `/api/admin/email-programs` | Email campaign CRUD | Email marketing |
| `/api/admin/email-programs/[id]` | Single program | Email marketing |
| `/api/admin/email-programs/[id]/test` | Test send | Email QA |
| `/api/admin/email-programs/[id]/approve` | Publish | Email go-live |
| `/api/admin/email-automations` | Automation CRUD | Drip sequences |
| `/api/admin/email-automations/[id]` | Single automation | Drip sequences |
| `/api/admin/email-automations/[id]/activate` | Go live | Drip sequences |
| `/api/admin/email-automations/[id]/enroll` | Manual enrollment | Drip sequences |
| `/api/admin/placements` | Offer placements | Revenue |
| `/api/admin/placements/reorder` | Placement order | UX |

### MEDIUM PRIORITY — Missing Tests

| Route | Description | Impact |
|-------|-------------|--------|
| `/api/files/upload-url` | Get presigned URL | File uploads |
| `/api/files/register` | Register uploaded file | File tracking |
| `/api/files/signed-url` | Get download URL | File downloads |
| `/api/uploads/presign` | S3 presign | File uploads |
| `/api/uploads/complete` | Complete upload | File uploads |
| `/api/r2/presign` | R2 presign | File uploads |
| `/api/r2/download` | R2 download | File downloads |
| `/api/admin/resource-folders` | Resource folders | Community |
| `/api/admin/chat-channels` | Chat channels | Community |
| `/api/admin/moderation` | Content moderation | Community |
| `/api/admin/moderation/warnings` | User warnings | Moderation |

### LOW PRIORITY — Missing Tests

| Route | Description | Impact |
|-------|-------------|--------|
| `/api/cron/email-scheduler` | Cron job | Background tasks |
| `/api/cron/automation-scheduler` | Automation cron | Background tasks |
| `/api/cron/certificate-email` | Cert email cron | Background tasks |
| `/api/emails/announcement-blast` | Blast email | Announcements |
| `/api/admin/analytics/export` | Analytics CSV | Reporting |
| `/api/resources/download` | Resource download | Community |
| `/api/video-progress` | Video tracking | Analytics |
| `/api/lessons/[id]/mux-token` | Mux playback | Video |

---

## Part 3: Test Gap Analysis by Feature Area

### 3.1 Course Studio — 0% Coverage

**Routes without tests:**
```
/api/studio/courses (GET, POST)
/api/studio/courses/[id] (GET, PATCH, DELETE)
/api/studio/courses/[id]/chapters (GET, POST)
/api/studio/chapters/[id]/lessons (GET, POST)
/api/studio/lessons/[id] (GET, PATCH, DELETE)
/api/studio/lessons/reorder (POST)
```

**Required tests:**
- Course CRUD operations
- Chapter CRUD operations
- Lesson CRUD with autosave
- Reordering functionality
- Authorization (admin only)
- Validation (required fields)

**Test file needed:** `__tests__/api/studio/courses.test.ts`

---

### 3.2 Email System — 30% Coverage

**Routes without tests:**
```
/api/admin/email-programs (GET, POST)
/api/admin/email-programs/[id] (GET, PATCH, DELETE)
/api/admin/email-programs/[id]/test (POST)
/api/admin/email-programs/[id]/approve (POST)
/api/admin/email-programs/[id]/versions (GET, POST)
/api/admin/email-automations (GET, POST)
/api/admin/email-automations/[id] (GET, PATCH, DELETE)
/api/admin/email-automations/[id]/activate (POST)
/api/admin/email-automations/[id]/enroll (POST)
/api/admin/email-automations/[id]/steps (GET, POST)
/api/admin/automation-steps/[id] (PATCH, DELETE)
```

**Required tests:**
- Program CRUD
- Version history
- Test email sending
- Approval workflow
- Automation CRUD
- Step management
- Enrollment logic
- Scheduler integration

**Test files needed:**
- `__tests__/api/admin/email-programs.test.ts`
- `__tests__/api/admin/email-automations.test.ts`

---

### 3.3 File Storage — 0% Coverage (E2E)

**Routes without tests:**
```
/api/files/upload-url (POST)
/api/files/register (POST)
/api/files/signed-url (POST)
/api/uploads/presign (POST)
/api/uploads/complete (POST)
/api/r2/presign (POST)
/api/r2/download (GET)
```

**Required tests:**
- Presigned URL generation
- Upload completion handling
- Download URL expiry
- File type validation
- Size limit enforcement
- Path traversal prevention

**Test files needed:**
- `__tests__/api/files.test.ts` (enhance existing)
- `e2e/file-uploads.spec.ts`

---

### 3.4 Video (Mux) — 25% Coverage

**Routes without tests:**
```
/api/video/mux/create-upload (POST)
/api/admin/mux/upload (POST)
/api/admin/mux/webhook (POST)
/api/lessons/[id]/mux-token (GET)
/api/video-progress (POST)
```

**Required tests:**
- Upload URL creation
- Webhook signature validation
- Asset ready handling
- Asset error handling
- Signed token generation
- Progress tracking

**Test files needed:**
- `__tests__/api/mux.test.ts` (enhance)
- `__tests__/api/video-progress.test.ts`

---

### 3.5 Moderation — 50% Coverage

**Routes without tests (unit):**
```
/api/admin/moderation (POST)
/api/admin/moderation/warnings (GET, POST)
/api/admin/community/threads/[threadId] (PATCH, DELETE)
```

**Required tests:**
- Hide/show actions
- Pin/unpin actions
- Lock/unlock actions
- Warning creation
- Warning escalation
- Suspension logic

**Test file needed:** `__tests__/api/admin/moderation.test.ts` (enhance)

---

## Part 4: Recommended Test Implementation

### Week 1 — Critical Path

| Priority | Test File | Routes Covered | Est. Hours |
|----------|-----------|----------------|------------|
| P0 | `studio/courses.test.ts` | 6 studio routes | 8 |
| P0 | `video/mux.test.ts` (enhance) | 5 video routes | 6 |
| P0 | `files.test.ts` (enhance) | 7 file routes | 6 |

### Week 2 — Email & Automation

| Priority | Test File | Routes Covered | Est. Hours |
|----------|-----------|----------------|------------|
| P1 | `admin/email-programs.test.ts` | 5 program routes | 6 |
| P1 | `admin/email-automations.test.ts` | 6 automation routes | 6 |
| P1 | `cron/schedulers.test.ts` | 3 cron routes | 4 |

### Week 3 — Community & Moderation

| Priority | Test File | Routes Covered | Est. Hours |
|----------|-----------|----------------|------------|
| P2 | `admin/moderation.test.ts` | 3 moderation routes | 4 |
| P2 | `admin/chat-channels.test.ts` | 2 channel routes | 3 |
| P2 | `admin/resource-folders.test.ts` | 2 folder routes | 3 |

---

## Part 5: Test Template

### Unit Test Template

```typescript
// __tests__/api/studio/courses.test.ts

import { createMocks } from 'node-mocks-http';
import { GET, POST, PATCH, DELETE } from '@/app/api/studio/courses/route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
}));

describe('/api/studio/courses', () => {
  describe('GET', () => {
    it('returns 401 for unauthenticated requests', async () => {
      // Test implementation
    });

    it('returns 403 for non-admin users', async () => {
      // Test implementation
    });

    it('returns courses for admin users', async () => {
      // Test implementation
    });
  });

  describe('POST', () => {
    it('creates a new course', async () => {
      // Test implementation
    });

    it('validates required fields', async () => {
      // Test implementation
    });
  });
});
```

---

## Appendix A: Route-to-Test Mapping

| Route Pattern | HTTP Methods | Test File | Status |
|---------------|--------------|-----------|--------|
| `/api/stripe/checkout` | POST | `stripe-checkout.test.ts` | ✅ |
| `/api/stripe/webhook` | POST | `stripe-webhook.test.ts` | ✅ |
| `/api/admin/courses` | GET, POST | `admin/courses.test.ts` | ✅ |
| `/api/admin/courses/[id]` | GET, PATCH, DELETE | `admin/courses.test.ts` | ✅ |
| `/api/studio/courses` | GET, POST | — | ❌ |
| `/api/studio/courses/[id]` | GET, PATCH, DELETE | — | ❌ |
| `/api/admin/email-programs` | GET, POST | — | ❌ |
| `/api/admin/email-automations` | GET, POST | — | ❌ |
| `/api/files/*` | Various | `r2-storage.test.ts` | ⚠️ Partial |
| `/api/admin/mux/*` | Various | `mux.test.ts` | ⚠️ Partial |

---

## Appendix B: Coverage Targets

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| API Routes Tested | 56% | 90% | 34% |
| Critical Routes | 75% | 100% | 25% |
| Admin Routes | 45% | 85% | 40% |
| User Routes | 70% | 90% | 20% |

---

*Document generated: January 19, 2026*
