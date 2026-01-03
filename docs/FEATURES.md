# Portal28 Features Documentation

## Recently Added Features (January 2026)

### 1. Enrollment Analytics Dashboard

**Route:** `/admin/analytics/enrollments`

**Purpose:** Provides detailed analytics for course enrollments, membership subscriptions, and revenue metrics.

#### Features:
- **Course Enrollment Stats**
  - View enrollment counts per course
  - See active vs total enrollments
  - Track course status (published/draft)

- **Membership Stats**
  - Separate tracking for membership products
  - Active member counts
  - Subscription status overview

- **MRR (Monthly Recurring Revenue)**
  - Real-time MRR calculation from active subscriptions
  - Supports monthly and yearly subscription intervals
  - Automatic conversion of yearly to monthly equivalent

- **Renewal Timeline**
  - View upcoming renewals in next 30 days
  - See member name, email, renewal date
  - Days until renewal indicator
  - Identify canceling subscriptions

- **At-Risk Subscriptions**
  - Highlight members who set cancel_at_period_end
  - Calculate potential MRR churn
  - Quick visibility into retention risks

#### Database Tables Used:
- `courses` - Course catalog with is_membership flag
- `entitlements` - User course access records
- `subscriptions` - Membership subscription tracking
- `users` - User information for display

---

### 2. Content Moderation System

**Route:** `/admin/moderation`

**Purpose:** Admin tools for reviewing and moderating community content including forum threads and replies.

#### Features:
- **Thread Moderation**
  - View all forum threads with author info
  - Hide/show threads (soft delete)
  - Pin/unpin important threads
  - Lock/unlock to prevent new replies
  - Delete threads permanently

- **Reply Moderation**
  - View all forum replies with thread context
  - Hide/show individual replies
  - Delete replies permanently

- **Content Reports**
  - Review user-flagged content
  - Dismiss false reports
  - Hide reported content and resolve report
  - Track resolution status and admin who resolved

- **Moderation Stats**
  - Pending reports count
  - Hidden content count
  - Total threads and replies

#### Database Tables Used:
- `forum_threads` - With moderation columns (is_hidden, is_pinned, is_locked)
- `forum_replies` - With is_hidden column
- `content_reports` - User reports for admin review
- `admin_actions` - Audit log of moderation actions

#### API Endpoints:
- `POST /api/admin/moderation` - Perform moderation actions
  - Actions: hide, show, pin, unpin, lock, unlock, delete, dismiss_report, hide_reported_content

---

### 3. Supabase Port Configuration

**Changed:** All Supabase Docker ports moved to 283xx range

| Service | Old Port | New Port |
|---------|----------|----------|
| API | 54321 | 28321 |
| Database | 54322 | 28322 |
| Studio | 54323 | 28323 |
| Mailpit | 54324 | 28324 |

**Purpose:** Avoid conflicts with other Supabase projects running on the same machine.

---

### 4. Updated Admin Dashboard

**Route:** `/admin`

**Changes:**
- Added quick action cards for new features
- Direct links to:
  - Enrollment Analytics (course & membership stats)
  - Content Moderation (review & manage posts)
  - Sales Analytics (offers, checkouts, conversions)

---

## Database Schema Updates

### New Tables

#### `subscriptions`
```sql
- id UUID PRIMARY KEY
- user_id UUID (FK to auth.users)
- stripe_subscription_id TEXT
- stripe_customer_id TEXT
- status TEXT (active, canceled, past_due, trialing)
- price_cents INTEGER
- interval TEXT (month, year)
- current_period_start TIMESTAMPTZ
- current_period_end TIMESTAMPTZ
- cancel_at_period_end BOOLEAN
- canceled_at TIMESTAMPTZ
- created_at, updated_at TIMESTAMPTZ
```

#### `content_reports`
```sql
- id UUID PRIMARY KEY
- reporter_id UUID (FK to auth.users)
- content_type TEXT (thread, reply, comment)
- content_id UUID
- reason TEXT
- details TEXT
- status TEXT (pending, resolved, dismissed)
- resolved_by UUID
- resolved_at TIMESTAMPTZ
- created_at TIMESTAMPTZ
```

### Modified Tables

#### `courses`
- Added: `is_membership BOOLEAN DEFAULT false`

#### `forum_threads`
- Added: `is_hidden BOOLEAN DEFAULT false`
- Added: `is_pinned BOOLEAN DEFAULT false`
- Added: `is_locked BOOLEAN DEFAULT false`

#### `forum_replies`
- Added: `is_hidden BOOLEAN DEFAULT false`

---

## Component Architecture

### Admin Components

```
components/admin/
├── ModerationActions.tsx    # Dropdown menu for moderation actions
```

### Admin Pages

```
app/admin/
├── page.tsx                          # Dashboard with quick actions
├── analytics/
│   ├── page.tsx                      # Sales analytics
│   └── enrollments/
│       └── page.tsx                  # Enrollment & MRR dashboard
├── moderation/
│   └── page.tsx                      # Content moderation interface
```

### API Routes

```
app/api/admin/
├── moderation/
│   └── route.ts                      # Moderation action handler
```

---

## Testing Coverage

E2E tests should cover:
1. Admin authentication and access control
2. Enrollment analytics page load and data display
3. Moderation page functionality
4. Moderation API actions (hide, pin, lock, delete)
5. Report handling workflow
