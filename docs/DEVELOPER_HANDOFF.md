# Portal28 Academy — Developer Handoff Document

> **Document Version:** 1.0  
> **Last Updated:** January 13, 2026  
> **Project:** Portal28.academy  
> **Owner:** Sarah Ashley

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Technology Stack](#technology-stack)
3. [Port Configuration](#port-configuration)
4. [Environment Variables](#environment-variables)
5. [Project Structure](#project-structure)
6. [Database Schema](#database-schema)
7. [API Routes Reference](#api-routes-reference)
8. [Third-Party Integrations](#third-party-integrations)
9. [Development Workflows](#development-workflows)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd Portal28
npm install

# 2. Setup environment
cp .env.example .env.local

# 3. Start local Supabase (requires Docker)
npm run db:start

# 4. Run migrations and seed
npm run db:reset

# 5. Start dev server
npm run dev

# 6. Open app
open http://localhost:2828
```

---

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.2.x | React framework (App Router) |
| **React** | 18.3.x | UI library |
| **TypeScript** | 5.5.x | Type safety |
| **Node.js** | 18+ | Runtime (required) |

### Database & Auth

| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase** | Latest | Postgres DB + Auth + Realtime |
| **PostgreSQL** | 15 | Database |
| **Supabase Auth** | - | Magic link authentication |
| **Row Level Security** | - | Data access control |

### Payments & Email

| Technology | Version | Purpose |
|------------|---------|---------|
| **Stripe** | 16.12.x | Payments + subscriptions |
| **Resend** | 4.0.x | Transactional email |
| **Svix** | 1.24.x | Webhook verification |

### Media & Storage

| Technology | Version | Purpose |
|------------|---------|---------|
| **Mux** | 12.8.x | Video hosting |
| **Cloudflare R2** | - | File storage (S3-compatible) |

### Tracking & Analytics

| Technology | Purpose |
|------------|---------|
| **Meta Pixel** | Client-side tracking |
| **Meta CAPI** | Server-side conversion tracking |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.4.x | Utility-first CSS |
| **Radix UI** | Various | Headless components |
| **Lucide React** | 0.562.x | Icons |
| **shadcn/ui** | - | Component library |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Jest** | 29.7.x | Unit/integration tests |
| **Playwright** | 1.40.x | E2E tests |
| **Testing Library** | 14.2.x | React testing |

---

## Port Configuration

### Application Ports

| Service | Port | URL | Notes |
|---------|------|-----|-------|
| **Next.js App** | `2828` | http://localhost:2828 | Main application |
| **Supabase API** | `28321` | http://127.0.0.1:28321 | REST/GraphQL API |
| **Supabase DB** | `28322` | - | PostgreSQL |
| **Supabase Studio** | `28323` | http://localhost:28323 | DB admin UI |
| **Inbucket (Email)** | `28324` | http://localhost:28324 | Local email testing |
| **SMTP** | `28325` | - | Outgoing email |
| **POP3** | `28326` | - | Email retrieval |
| **Analytics** | `28327` | - | (disabled by default) |
| **DB Pooler** | `28329` | - | Connection pooling |
| **Shadow DB** | `28320` | - | Migration shadow |

### Port Management Commands

```bash
# Check if port 2828 is available
npm run port:check

# Kill process on port 2828
npm run port:kill

# Full port status report
npm run port:status

# Health check all services
npm run port:health

# Force start (kills existing and starts)
npm run dev:force
```

### Why Port 2828?

The project uses port `2828` (instead of default 3000) to avoid conflicts with other Next.js projects. This is configured in:
- `package.json` scripts
- `playwright.config.ts`
- `supabase/config.toml` (auth redirect URLs)

---

## Environment Variables

### Required Variables

```bash
# === SITE ===
NEXT_PUBLIC_SITE_URL=http://localhost:2828  # Production: https://portal28.academy

# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:28321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# === STRIPE ===
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# === META TRACKING ===
NEXT_PUBLIC_META_PIXEL_ID=<pixel-id>
META_CAPI_ACCESS_TOKEN=<capi-token>
META_API_VERSION=v20.0

# === RESEND (EMAIL) ===
RESEND_API_KEY=re_xxx
RESEND_FROM="Portal28 Academy <hello@updates.portal28.academy>"
RESEND_WEBHOOK_SECRET=whsec_xxx
RESEND_AUDIENCE_ID=<audience-id>

# === CRON ===
CRON_SECRET=<random-secret>

# === MUX (VIDEO) ===
MUX_TOKEN_ID=<token-id>
MUX_TOKEN_SECRET=<token-secret>
MUX_WEBHOOK_SECRET=<webhook-secret>

# === S3/R2 STORAGE ===
S3_ACCESS_KEY_ID=<access-key>
S3_SECRET_ACCESS_KEY=<secret-key>
S3_BUCKET_NAME=portal28-files
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_REGION=auto
```

### Local Development Values

For local development, Supabase keys are pre-filled in `.env.example`:

```bash
# These are default local Supabase keys (safe to commit)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:28321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Project Structure

```
Portal28/
├── app/                          # Next.js App Router
│   ├── (learn)/                  # Learning routes group
│   ├── (public)/                 # Public pages group
│   ├── actions/                  # Server actions
│   ├── admin/                    # Admin dashboard
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── community/            # Community management
│   │   ├── courses/              # Course CRUD
│   │   ├── email-analytics/      # Email stats
│   │   ├── email-programs/       # Drip campaigns
│   │   ├── moderation/           # Content moderation
│   │   ├── offers/               # Offers management
│   │   ├── studio/               # Course studio editor
│   │   ├── layout.tsx            # Admin layout
│   │   └── page.tsx              # Admin dashboard
│   ├── api/                      # API Routes
│   │   ├── admin/                # Admin APIs
│   │   │   ├── community/        # Community admin
│   │   │   ├── courses/          # Course CRUD
│   │   │   ├── email-programs/   # Email program CRUD
│   │   │   ├── lessons/          # Lesson CRUD
│   │   │   ├── moderation/       # Moderation actions
│   │   │   ├── modules/          # Module CRUD
│   │   │   └── offers/           # Offer CRUD
│   │   ├── attribution/          # UTM tracking
│   │   ├── comments/             # Lesson comments
│   │   ├── community/            # Community APIs
│   │   │   ├── announcements/
│   │   │   ├── forum/
│   │   │   ├── replies/
│   │   │   ├── resources/
│   │   │   └── threads/
│   │   ├── cron/                 # Scheduled jobs
│   │   ├── emails/               # Email sending
│   │   ├── files/                # File management
│   │   ├── newsletter/           # Newsletter subscribe
│   │   ├── notes/                # Lesson notes
│   │   ├── offers/               # Offer impressions
│   │   ├── progress/             # Lesson progress
│   │   ├── quiz/                 # Quiz system
│   │   ├── resend/               # Resend webhooks
│   │   ├── stripe/               # Stripe integration
│   │   │   ├── checkout/         # Generic checkout
│   │   │   ├── course-checkout/  # Course purchase
│   │   │   ├── customer-portal/  # Stripe portal
│   │   │   ├── membership-checkout/
│   │   │   ├── offer-checkout/   # Offer purchase
│   │   │   └── webhook/          # Stripe webhooks
│   │   ├── studio/               # Studio APIs
│   │   ├── uploads/              # File uploads
│   │   ├── video/                # Video APIs
│   │   └── webhooks/             # Generic webhooks
│   ├── app/                      # Student area (protected)
│   │   ├── community/            # Community features
│   │   │   ├── w/[widgetKey]/    # Widget routing
│   │   │   └── layout.tsx        # Community layout
│   │   ├── courses/[slug]/       # Course access
│   │   ├── lesson/[id]/          # Lesson player
│   │   ├── layout.tsx            # App layout
│   │   └── page.tsx              # Student dashboard
│   ├── auth/                     # Auth callbacks
│   ├── courses/                  # Public course pages
│   ├── forgot-password/
│   ├── login/
│   ├── logout/
│   ├── preview/                  # Course preview
│   ├── reset-password/
│   ├── signup/
│   ├── verify-email/
│   ├── attrib-capture.tsx        # Attribution capture
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
│
├── components/                   # React Components
│   ├── admin/                    # Admin forms
│   ├── community/                # Community widgets
│   │   ├── AnnouncementsApp.tsx
│   │   ├── ChatApp.tsx
│   │   ├── ForumApp.tsx
│   │   ├── ResourcesApp.tsx
│   │   └── WidgetPaywall.tsx
│   ├── courses/                  # Course components
│   ├── emails/                   # Email templates
│   ├── layout/                   # Layout components
│   ├── offers/                   # Offer cards
│   ├── progress/                 # Progress tracking
│   ├── studio/                   # Course studio
│   └── ui/                       # shadcn/ui components
│
├── lib/                          # Shared Libraries
│   ├── access/                   # Access control helpers
│   ├── attribution/              # UTM/fbclid handling
│   ├── auth/                     # Auth helpers
│   ├── community/                # Community helpers
│   │   └── feed.ts               # Activity feed
│   ├── db/                       # Database queries
│   ├── email/                    # Email utilities
│   │   ├── resend.ts             # Resend client
│   │   ├── scheduler.ts          # Email scheduler
│   │   ├── sendCourseAccessEmail.ts
│   │   └── sendLeadWelcome.ts
│   ├── entitlements/             # Access control
│   │   ├── hasAccess.ts
│   │   └── linkEntitlements.ts
│   ├── meta/                     # Meta tracking
│   │   ├── capi.ts               # CAPI client
│   │   ├── capiTrack.ts          # Track events
│   │   └── MetaPixel.tsx         # Pixel component
│   ├── offers/                   # Offers system
│   │   └── getOffers.ts
│   ├── progress/                 # Progress tracking
│   ├── storage/                  # S3/R2 storage
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Middleware client
│   ├── drip.ts                   # Drip email logic
│   ├── stripe.ts                 # Stripe client
│   └── utils.ts                  # General utilities
│
├── supabase/                     # Supabase Config
│   ├── migrations/               # SQL migrations (18 files)
│   │   ├── 0001_init.sql
│   │   ├── 0002_email.sql
│   │   ├── 0003_admin.sql
│   │   ├── 0004_email_scheduler.sql
│   │   ├── 0005_email_analytics.sql
│   │   ├── 0006_email_analytics_functions.sql
│   │   ├── 0007_daily_metrics.sql
│   │   ├── 0008_membership_widgets.sql
│   │   ├── 0009_membership_widgets_v2.sql
│   │   ├── 0010_offers_system.sql
│   │   ├── 0011_community.sql
│   │   ├── 0012_whop_community.sql
│   │   ├── 0013_lesson_progress.sql
│   │   ├── 0014_lesson_notes_comments.sql
│   │   ├── 0015_course_studio.sql
│   │   ├── 0016_course_studio_v2.sql
│   │   ├── 0017_preview_tokens.sql
│   │   └── 20260103_add_subscriptions_and_reports.sql
│   ├── config.toml               # Supabase local config
│   ├── seed.sql                  # Seed data
│   └── seed_community.sql        # Community seed data
│
├── __tests__/                    # Jest Tests
│   ├── api/                      # API tests
│   ├── components/               # Component tests
│   ├── lib/                      # Library tests
│   └── fixtures/                 # Test fixtures
│
├── e2e/                          # Playwright E2E Tests
│   ├── fixtures/                 # E2E fixtures
│   └── *.spec.ts                 # Test specs
│
├── scripts/                      # Utility Scripts
│   ├── create-admin-user.ts      # Create admin
│   ├── health-check.ts           # Service health
│   ├── port-manager.sh           # Port management
│   └── test-video-upload.ts      # Video upload test
│
├── docs/                         # Documentation
│   ├── PRD.md                    # Product requirements
│   ├── PRD_ASSESSMENT.md         # Implementation status
│   ├── TDD_TEST_SUITE.md         # Test specifications
│   └── DEVELOPER_HANDOFF.md      # This document
│
├── config/                       # App config
├── middleware.ts                 # Next.js middleware
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
├── jest.config.js                # Jest config
├── playwright.config.ts          # Playwright config
├── vercel.json                   # Vercel deployment
└── package.json                  # Dependencies
```

---

## Database Schema

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | `id`, `email`, `role` |
| `courses` | Course catalog | `id`, `slug`, `status`, `stripe_price_id` |
| `modules` | Course modules | `id`, `course_id`, `sort_order` |
| `lessons` | Course lessons | `id`, `module_id`, `video_url`, `downloads` |
| `orders` | Purchase records | `id`, `user_id`, `course_id`, `status` |
| `entitlements` | Access grants | `id`, `user_id`, `course_id`, `status` |
| `attribution` | UTM tracking | `id`, `user_id`, `fbclid`, `utm_*` |

### Email Tables

| Table | Purpose |
|-------|---------|
| `email_contacts` | Contact records |
| `email_events` | Delivery events |
| `email_sends` | Send log |
| `email_programs` | Drip campaigns |
| `email_program_steps` | Campaign steps |
| `email_enrollments` | Program enrollments |

### Offers Tables

| Table | Purpose |
|-------|---------|
| `offers` | Offer definitions |
| `offer_placements` | Where offers appear |
| `checkout_attempts` | Checkout tracking |
| `offer_impressions` | View tracking |

### Community Tables

| Table | Purpose |
|-------|---------|
| `community_spaces` | Community containers |
| `community_members` | Membership |
| `forum_categories` | Forum sections |
| `forum_threads` | Discussion threads |
| `forum_posts` | Thread replies |
| `announcements` | Admin announcements |
| `resource_folders` | File folders |
| `resource_items` | Files/links/notes |
| `chat_channels` | Chat rooms |
| `chat_messages` | Chat messages |

### Membership Tables

| Table | Purpose |
|-------|---------|
| `membership_plans` | Plan definitions |
| `subscriptions` | Active subscriptions |
| `widgets` | Available widgets |
| `membership_widgets` | Widget assignments |

### Progress Tables

| Table | Purpose |
|-------|---------|
| `lesson_progress` | Completion tracking |
| `lesson_notes` | User notes |
| `lesson_comments` | Discussion |

---

## API Routes Reference

### Public APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/attribution` | POST | Save UTM/fbclid |
| `/api/newsletter/subscribe` | POST | Email signup |

### Stripe APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/stripe/checkout` | POST | Generic checkout |
| `/api/stripe/course-checkout` | POST | Course purchase |
| `/api/stripe/membership-checkout` | POST | Subscription |
| `/api/stripe/offer-checkout` | POST | Offer purchase |
| `/api/stripe/customer-portal` | POST | Billing portal |
| `/api/stripe/webhook` | POST | Stripe webhooks |

### Admin APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/courses` | GET/POST | Course CRUD |
| `/api/admin/courses/[id]` | GET/PUT/DELETE | Single course |
| `/api/admin/modules` | POST | Create module |
| `/api/admin/modules/[id]` | PUT/DELETE | Module ops |
| `/api/admin/lessons/[id]` | PUT/DELETE | Lesson ops |
| `/api/admin/offers/upsert` | POST | Create/update offer |
| `/api/admin/email-programs/*` | Various | Email campaigns |
| `/api/admin/community/*` | Various | Community admin |
| `/api/admin/moderation/*` | Various | Content mod |

### Community APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/community/forum/*` | Various | Forum CRUD |
| `/api/community/threads` | GET/POST | Threads |
| `/api/community/replies` | POST | Post replies |
| `/api/community/announcements` | GET | Get announcements |
| `/api/community/resources` | GET | Get resources |

### User APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/progress` | GET/POST | Lesson progress |
| `/api/notes` | GET/POST/DELETE | Lesson notes |
| `/api/comments` | GET/POST | Lesson comments |

### Webhook APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/stripe/webhook` | POST | Stripe events |
| `/api/resend/webhook` | POST | Email events |
| `/api/webhooks/mux` | POST | Video events |

### Cron APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/cron/scheduler` | GET | Email scheduler |

---

## Third-Party Integrations

### Supabase

**Dashboard:** https://supabase.com/dashboard

**Local Setup:**
```bash
npm run db:start    # Start Docker containers
npm run db:studio   # Open Studio UI
npm run db:reset    # Reset + migrate + seed
```

**Production Setup:**
1. Create project at supabase.com
2. Copy URL and keys to `.env.local`
3. Run `npm run db:push` to apply migrations

---

### Stripe

**Dashboard:** https://dashboard.stripe.com

**Local Webhook Testing:**
```bash
npm run stripe:listen
# Copy webhook secret to STRIPE_WEBHOOK_SECRET
```

**Webhook Events Handled:**
- `checkout.session.completed` → Grant access
- `payment_intent.succeeded` → Update order
- `charge.refunded` → Revoke access
- `customer.subscription.*` → Subscription management

**Products Setup:**
1. Create products in Stripe Dashboard
2. Create prices (one-time or recurring)
3. Copy `price_id` to course/offer records

---

### Meta (Facebook)

**Business Manager:** https://business.facebook.com

**Pixel Setup:**
1. Create Pixel in Events Manager
2. Copy Pixel ID to `NEXT_PUBLIC_META_PIXEL_ID`

**CAPI Setup:**
1. Generate access token in Events Manager
2. Copy to `META_CAPI_ACCESS_TOKEN`

**Events Tracked:**
- `PageView` — All pages
- `ViewContent` — Course pages
- `Lead` — Newsletter signup
- `InitiateCheckout` — Buy button click
- `Purchase` — Successful payment (CAPI)

---

### Resend

**Dashboard:** https://resend.com/dashboard

**Setup:**
1. Verify sending domain
2. Set SPF + DKIM records
3. Create API key → `RESEND_API_KEY`
4. Create Audience → `RESEND_AUDIENCE_ID`
5. Configure webhook → `RESEND_WEBHOOK_SECRET`

**Emails Sent:**
- Welcome email (newsletter signup)
- Course access email (purchase)
- Drip campaign emails

---

### Mux (Video)

**Dashboard:** https://dashboard.mux.com

**Setup:**
1. Create access token
2. Copy ID → `MUX_TOKEN_ID`
3. Copy secret → `MUX_TOKEN_SECRET`
4. Configure webhook → `MUX_WEBHOOK_SECRET`

---

### Cloudflare R2 (Storage)

**Dashboard:** https://dash.cloudflare.com

**Setup:**
1. Create R2 bucket
2. Generate API token with R2 permissions
3. Configure:
   - `S3_ENDPOINT` = `https://<account>.r2.cloudflarestorage.com`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_BUCKET_NAME`

---

## Development Workflows

### Daily Development

```bash
# Start everything
npm run db:start          # Supabase (first time/after reboot)
npm run dev               # Next.js app
npm run stripe:listen     # Stripe webhooks (separate terminal)
```

### Database Changes

```bash
# Create new migration
npm run db:migration:new my_migration_name

# Edit the new file in supabase/migrations/

# Apply migrations
npm run db:reset          # Local: reset + migrate
npm run db:push           # Production: push to remote
```

### Creating Admin User

```bash
# Option 1: SQL
UPDATE users SET role = 'admin' WHERE email = 'you@domain.com';

# Option 2: Script
npx ts-node scripts/create-admin-user.ts
```

### Running Tests

```bash
# Unit + Integration
npm run test              # Run all
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# E2E
npm run test:e2e          # Headless
npm run test:e2e:ui       # With UI
```

---

## Deployment

### Vercel (Recommended)

1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

**Cron Jobs:**
Configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/scheduler",
    "schedule": "*/5 * * * *"
  }]
}
```

### Production Checklist

- [ ] Supabase project created
- [ ] Migrations pushed (`npm run db:push`)
- [ ] Stripe products/prices created
- [ ] Stripe webhook endpoint registered
- [ ] Meta Pixel + CAPI configured
- [ ] Resend domain verified
- [ ] Mux account configured
- [ ] R2 bucket created
- [ ] All env vars set in Vercel
- [ ] Custom domain configured

---

## Testing

### Test Structure

```
__tests__/           # Jest (unit + integration)
├── api/             # API route tests
├── components/      # Component tests
├── lib/             # Library tests
└── fixtures/        # Mock data

e2e/                 # Playwright (E2E)
├── fixtures/        # E2E helpers
└── *.spec.ts        # Test files
```

### Running Specific Tests

```bash
# Jest
npm run test -- __tests__/lib/auth/
npm run test -- --testNamePattern="hasAccess"

# Playwright
npx playwright test auth.spec.ts
npx playwright test --grep "magic link"
```

### Coverage Requirements

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
}
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 2828
npm run port:status

# Kill the process
npm run port:kill

# Or force start
npm run dev:force
```

### Supabase Won't Start

```bash
# Check Docker is running
docker ps

# Restart Supabase
npm run db:stop
npm run db:start

# Full reset
supabase stop --no-backup
npm run db:start
```

### Stripe Webhooks Not Working

```bash
# Make sure listener is running
npm run stripe:listen

# Check the webhook secret matches
echo $STRIPE_WEBHOOK_SECRET

# Test with Stripe CLI
stripe trigger checkout.session.completed
```

### Auth Issues

1. Check Supabase is running: http://localhost:28323
2. Check redirect URLs in `supabase/config.toml`
3. Magic links appear in Inbucket: http://localhost:28324

### Database Migrations Failed

```bash
# Check migration syntax
npm run db:diff

# Reset and try again
npm run db:reset

# Check logs in Supabase Studio
npm run db:studio
```

---

## Key Contacts & Resources

### Documentation

| Resource | Location |
|----------|----------|
| PRD | `docs/PRD.md` |
| Implementation Status | `docs/PRD_ASSESSMENT.md` |
| Test Suite | `docs/TDD_TEST_SUITE.md` |
| This Document | `docs/DEVELOPER_HANDOFF.md` |

### External Docs

| Service | URL |
|---------|-----|
| Next.js | https://nextjs.org/docs |
| Supabase | https://supabase.com/docs |
| Stripe | https://stripe.com/docs |
| Resend | https://resend.com/docs |
| Mux | https://docs.mux.com |
| Tailwind | https://tailwindcss.com/docs |

---

## Summary

### What's Built (MVP Complete)

- ✅ Public pages (home, courses, sales pages)
- ✅ Magic link authentication
- ✅ Stripe checkout + webhooks
- ✅ Entitlement-based access control
- ✅ Course delivery (video, downloads)
- ✅ Admin CMS (courses, modules, lessons)
- ✅ Meta Pixel + CAPI tracking
- ✅ Resend email integration
- ✅ Offers system
- ✅ Community features (forums, chat, resources)
- ✅ Email campaigns/drip

### What's Remaining

- ⚠️ Order bumps (not implemented)
- ⚠️ Bundle product page UI
- ⚠️ Coupon admin UI
- ⚠️ Events calendar (Phase 2)
- ⚠️ Coaching bookings (Phase 2)

---

*Document generated: January 13, 2026*
