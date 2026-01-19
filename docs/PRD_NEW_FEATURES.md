# Portal28 Academy — New Features PRD

> **Document Version:** 1.0  
> **Created:** January 19, 2026  
> **Status:** Draft  
> **Phase:** Post-MVP Enhancements

---

## Overview

This PRD defines new features identified through gap analysis that are not covered in the original PRD. These features address monetization, user experience, operations, and compliance needs.

---

## Feature Group A: Revenue & Monetization

### A1: Trial-to-Paid Conversion Tracking

**Priority:** HIGH  
**Effort:** Medium (8-12 hours)  
**Dependencies:** Subscriptions system (implemented)

#### Problem Statement
Currently no visibility into trial→paid conversion rates per plan, making it difficult to optimize pricing and trial length.

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| A1-001 | Track trial start events with plan details | P0 |
| A1-002 | Track trial conversion events (trial→active) | P0 |
| A1-003 | Track trial cancellation events | P0 |
| A1-004 | Calculate conversion rate by plan | P0 |
| A1-005 | Dashboard widget showing trial metrics | P1 |
| A1-006 | Time-to-conversion metric | P2 |

#### Data Model

```sql
-- Add to subscription_history or new table
CREATE TABLE trial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  subscription_id UUID REFERENCES subscriptions,
  plan_tier TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'trial_start', 'trial_converted', 'trial_cancelled'
  trial_days INTEGER,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Success Metrics
- Track 100% of trial events
- Dashboard shows conversion rates within 24 hours of events

---

### A2: Revenue Attribution by Source

**Priority:** HIGH  
**Effort:** Medium (6-10 hours)  
**Dependencies:** Attribution system (implemented), Orders table

#### Problem Statement
Cannot calculate ROAS (Return on Ad Spend) because orders are not linked to UTM sources in analytics.

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| A2-001 | Orders store utm_source, utm_medium, utm_campaign | P0 |
| A2-002 | Query revenue by attribution source | P0 |
| A2-003 | Dashboard showing revenue by source | P0 |
| A2-004 | Export revenue attribution report | P1 |
| A2-005 | Compare sources over time periods | P2 |

#### Implementation Notes
- Orders table already has UTM columns
- Need SQL function `get_revenue_by_source(days)`
- Add to analytics dashboard

---

### A3: Refund Reason Tracking

**Priority:** MEDIUM  
**Effort:** Low (4-6 hours)  
**Dependencies:** Stripe webhooks (implemented)

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| A3-001 | Capture refund reason from Stripe | P0 |
| A3-002 | Store reason in orders table | P0 |
| A3-003 | Admin can add manual reason note | P1 |
| A3-004 | Aggregate refund reasons in dashboard | P1 |

#### Data Model

```sql
ALTER TABLE orders ADD COLUMN refund_reason TEXT;
ALTER TABLE orders ADD COLUMN refund_notes TEXT;
```

---

### A4: Payment Retry Logic

**Priority:** MEDIUM  
**Effort:** Medium (6-8 hours)  
**Dependencies:** Subscriptions, Stripe webhooks

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| A4-001 | Handle `invoice.payment_failed` webhook | P0 |
| A4-002 | Send payment failed email to customer | P0 |
| A4-003 | Track retry attempts | P1 |
| A4-004 | Dunning email sequence (Day 1, 3, 7) | P1 |
| A4-005 | Grace period before access revocation | P0 |

---

### A5: Affiliate System

**Priority:** MEDIUM  
**Effort:** High (20-30 hours)  
**Dependencies:** Orders, Stripe

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| A5-001 | Affiliate registration form | P0 |
| A5-002 | Generate unique affiliate links | P0 |
| A5-003 | Track referral clicks | P0 |
| A5-004 | Attribute orders to affiliates | P0 |
| A5-005 | Calculate commissions (configurable %) | P0 |
| A5-006 | Affiliate dashboard (earnings, clicks) | P0 |
| A5-007 | Payout request system | P1 |
| A5-008 | Admin payout management | P1 |
| A5-009 | Cookie attribution window (30 days) | P0 |

#### Data Model

```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  code TEXT UNIQUE NOT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 20.00,
  status TEXT DEFAULT 'pending', -- pending, approved, suspended
  payout_email TEXT,
  payout_method TEXT, -- paypal, stripe, bank
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates,
  visitor_id TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  order_id UUID REFERENCES orders,
  converted_at TIMESTAMPTZ,
  commission_cents INTEGER
);

CREATE TABLE affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates,
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, paid, failed
  requested_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  payout_reference TEXT
);
```

---

## Feature Group B: User Experience

### B1: Course Prerequisites

**Priority:** MEDIUM  
**Effort:** Medium (8-12 hours)  
**Dependencies:** Courses, Entitlements

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| B1-001 | Define prerequisite courses per course | P0 |
| B1-002 | Check prerequisites before enrollment | P0 |
| B1-003 | Show "Complete X first" message | P0 |
| B1-004 | Admin UI to set prerequisites | P0 |
| B1-005 | Allow prerequisite override by admin | P1 |

#### Data Model

```sql
CREATE TABLE course_prerequisites (
  course_id UUID REFERENCES courses,
  prerequisite_course_id UUID REFERENCES courses,
  is_required BOOLEAN DEFAULT true,
  PRIMARY KEY (course_id, prerequisite_course_id)
);
```

---

### B2: Bookmark Lessons

**Priority:** LOW  
**Effort:** Low (4-6 hours)  
**Dependencies:** Lessons, Users

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| B2-001 | Bookmark button on lesson page | P0 |
| B2-002 | View bookmarked lessons list | P0 |
| B2-003 | Remove bookmark | P0 |
| B2-004 | Sort by date bookmarked | P2 |

#### Data Model

```sql
CREATE TABLE lesson_bookmarks (
  user_id UUID REFERENCES auth.users,
  lesson_id UUID REFERENCES lessons,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
```

---

### B3: Learning Streaks

**Priority:** MEDIUM  
**Effort:** Medium (8-10 hours)  
**Dependencies:** Lesson progress

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| B3-001 | Track daily lesson completions | P0 |
| B3-002 | Calculate current streak | P0 |
| B3-003 | Display streak on dashboard | P0 |
| B3-004 | Streak badges (7, 30, 100 days) | P1 |
| B3-005 | Streak reminder emails | P2 |

#### Data Model

```sql
CREATE TABLE learning_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_started_at DATE
);
```

---

### B4: Dark Mode

**Priority:** LOW  
**Effort:** Low (4-6 hours)  
**Dependencies:** Tailwind CSS

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| B4-001 | Theme toggle in header | P0 |
| B4-002 | Persist preference in localStorage | P0 |
| B4-003 | Respect system preference | P1 |
| B4-004 | All components support dark mode | P0 |

---

## Feature Group C: Admin & Operations

### C1: Admin Audit Log UI

**Priority:** MEDIUM  
**Effort:** Low (4-6 hours)  
**Dependencies:** admin_actions table (exists)

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| C1-001 | View admin actions in dashboard | P0 |
| C1-002 | Filter by action type | P0 |
| C1-003 | Filter by admin user | P0 |
| C1-004 | Filter by date range | P1 |
| C1-005 | Export audit log | P2 |

---

### C2: Bulk User Import

**Priority:** MEDIUM  
**Effort:** Medium (6-8 hours)  
**Dependencies:** Users, Entitlements

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| C2-001 | CSV upload form | P0 |
| C2-002 | Preview import before processing | P0 |
| C2-003 | Create users with email | P0 |
| C2-004 | Grant course entitlements | P0 |
| C2-005 | Send welcome emails (optional) | P1 |
| C2-006 | Import error report | P0 |

#### CSV Format

```csv
email,first_name,course_slugs,send_email
john@example.com,John,"course-1,course-2",true
jane@example.com,Jane,course-1,false
```

---

### C3: Course Duplication

**Priority:** MEDIUM  
**Effort:** Medium (4-6 hours)  
**Dependencies:** Courses, Modules, Lessons

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| C3-001 | "Duplicate" button on course edit | P0 |
| C3-002 | Copy course with new slug | P0 |
| C3-003 | Copy all modules and lessons | P0 |
| C3-004 | Set status to draft | P0 |
| C3-005 | Option to copy enrollments | P2 |

---

### C4: Soft Delete & Restore

**Priority:** MEDIUM  
**Effort:** Medium (6-8 hours)  
**Dependencies:** All content tables

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| C4-001 | Add `deleted_at` column to tables | P0 |
| C4-002 | Filter deleted records in queries | P0 |
| C4-003 | "Trash" view in admin | P0 |
| C4-004 | Restore deleted items | P0 |
| C4-005 | Permanent delete after 30 days | P1 |

---

## Feature Group D: Community Enhancements

### D1: Member Directory

**Priority:** MEDIUM  
**Effort:** Medium (6-8 hours)  
**Dependencies:** Profiles, Community spaces

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| D1-001 | Searchable member list | P0 |
| D1-002 | Filter by membership tier | P0 |
| D1-003 | View member profile | P0 |
| D1-004 | Privacy controls (opt-out) | P0 |

---

### D2: Direct Messaging (DMs)

**Priority:** MEDIUM  
**Effort:** High (12-16 hours)  
**Dependencies:** Profiles, Realtime

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| D2-001 | Start conversation with member | P0 |
| D2-002 | Real-time message delivery | P0 |
| D2-003 | Conversation list | P0 |
| D2-004 | Unread count indicator | P0 |
| D2-005 | Block user | P1 |
| D2-006 | Report abuse | P1 |

#### Data Model

```sql
CREATE TABLE dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dm_participants (
  conversation_id UUID REFERENCES dm_conversations,
  user_id UUID REFERENCES auth.users,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES dm_conversations,
  sender_id UUID REFERENCES auth.users,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Feature Group E: Analytics & Compliance

### E1: Email Revenue Attribution

**Priority:** HIGH  
**Effort:** Medium (6-8 hours)  
**Dependencies:** Email programs, Orders

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| E1-001 | Track clicks from email to purchase | P0 |
| E1-002 | Attribute revenue to email program | P0 |
| E1-003 | Show revenue in email analytics | P0 |
| E1-004 | Compare program effectiveness | P1 |

---

### E2: GDPR Data Export

**Priority:** MEDIUM  
**Effort:** Medium (8-10 hours)  
**Dependencies:** All user-related tables

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| E2-001 | User requests data export | P0 |
| E2-002 | Generate JSON/CSV of user data | P0 |
| E2-003 | Include all personal data | P0 |
| E2-004 | Secure download link (24hr expiry) | P0 |
| E2-005 | Admin can trigger export | P1 |
| E2-006 | Delete user data (right to erasure) | P0 |

#### Data Included
- Profile information
- Orders and payments
- Course progress
- Community posts
- Email preferences
- Login history

---

### E3: A/B Testing Framework

**Priority:** MEDIUM  
**Effort:** High (16-20 hours)  
**Dependencies:** Offers, Analytics

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| E3-001 | Create A/B test with variants | P0 |
| E3-002 | Random variant assignment | P0 |
| E3-003 | Track conversions per variant | P0 |
| E3-004 | Statistical significance calculation | P0 |
| E3-005 | Auto-select winner | P2 |

---

## Implementation Roadmap

### Phase 1 (Weeks 1-2): Revenue Features
- A2: Revenue Attribution by Source
- A3: Refund Reason Tracking
- E1: Email Revenue Attribution

### Phase 2 (Weeks 3-4): Operations
- C1: Admin Audit Log UI
- C3: Course Duplication
- C4: Soft Delete & Restore

### Phase 3 (Weeks 5-6): User Experience
- B3: Learning Streaks
- B4: Dark Mode
- B1: Course Prerequisites

### Phase 4 (Weeks 7-8): Community
- D1: Member Directory
- D2: Direct Messaging

### Backlog
- A1: Trial Conversion Tracking
- A4: Payment Retry Logic
- A5: Affiliate System
- C2: Bulk User Import
- E2: GDPR Data Export
- E3: A/B Testing Framework

---

## Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Revenue Attribution | Orders with UTM data | 80% |
| Learning Streaks | Users with 7+ day streak | 20% |
| Member Directory | Profile opt-in rate | 70% |
| Course Prerequisites | Prerequisite completion | 90% |

---

*Document created: January 19, 2026*
