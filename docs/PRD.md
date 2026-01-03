# Portal28.academy — Product Requirements Document

> **Owner:** Sarah Ashley  
> **Version:** 1.0 (MVP)  
> **Last Updated:** January 2026

---

## Product Vision

Portal28.academy is a clean, conversion-optimized course storefront + member area where Sarah can:

- Run Facebook ads to proven landing pages
- Convert with Stripe Checkout
- Deliver courses instantly (and track conversions reliably with Pixel + CAPI)

**North Star:** "Run ads → track true conversions → sell courses → deliver instantly → re-market intelligently."

---

## Phase Plan

### Phase 0 — MVP (2–4 weeks build)

**Goal:** Sell 1–3 courses and track conversions correctly.

**Includes:**
- Public pages: Home, Course sales page(s), About, FAQ, Terms/Privacy
- Course catalog (simple)
- Auth: email magic link
- Purchase: Stripe Checkout (one-time payments)
- Access control: only purchasers can view course content
- Course player: modules/lessons, video embed, downloads
- Admin-lite: create/edit course, modules, lessons, publish/unpublish
- Ads tracking: Meta Pixel + Conversions API (CAPI) with dedup
- Email: Resend integration (welcome + course access emails)

**Excludes (for now):**
- Community/chat
- Memberships/subscriptions
- Bundles
- Quizzes/certificates
- Drip scheduling
- Affiliates
- Multi-instructor

### Phase 1 — Growth

**Goal:** Increase AOV + LTV.

- Bundles, order bumps, upsells
- Coupons, limited-time offers
- Email sequences (abandoned checkout, onboarding, completion nudges)
- Basic analytics dashboard for funnel + cohorts

### Phase 2 — Platform (Whop-like modular)

**Goal:** Turn the "academy" into an extensible experience.

- "Apps" system: Community, Events, Files, Coaching bookings, Templates vault, etc.
- App marketplace later (optional)
- Multiple spaces/experiences per offer (like Whop "products")

---

## Users & Roles

| Role | Description |
|------|-------------|
| **Visitor** | Arrives from Facebook ad, browses sales pages, purchases course |
| **Student** | Logs in, watches lessons, downloads resources |
| **Admin** | Creates courses & lessons, sees purchases + enrollments, manages content |

---

## Core User Flows

### Flow A — Ad → Sales page → Checkout → Access

1. Visitor lands on a sales page (UTM + fbclid captured)
2. Pixel fires (PageView, ViewContent)
3. Click "Buy" → InitiateCheckout fires
4. Stripe Checkout completes
5. Webhook confirms payment
6. User gets instant access + welcome email
7. Purchase event sent via CAPI (with dedup)

### Flow B — Login & Learning

1. Student uses magic link
2. Sees "My Courses"
3. Enters course → watches lessons → marks complete (optional MVP)

### Flow C — Admin Publishing

1. Admin creates course → modules → lessons
2. Uploads downloads, sets video URL, sets Stripe price link
3. Publishes

---

## Functional Requirements (MVP)

### Public Site
- SEO-friendly landing pages
- Course sales pages (rich sections, testimonials, curriculum outline)
- Email capture form (Lead event)

### Auth
- Email magic link
- Optional: Google login later

### Payments (Stripe)
- One-time purchase per course
- Checkout includes: product name, price, success/cancel URLs
- Webhooks handle: `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`
- Customer record + receipts handled by Stripe

### Entitlements (Access Control)
- After successful webhook: grant access to course
- If refunded: revoke access (or flag)

### Course Delivery
- Course outline view (modules/lessons)
- Lesson page:
  - Video embed (Mux/Vimeo/YouTube unlisted)
  - Downloads
  - Next/prev navigation
- Mobile-friendly UI

### Admin-lite CMS
- CRUD: Courses, Modules, Lessons
- Publish toggle
- Attach Stripe price / product IDs to a course

### Analytics & Ads Tracking (Core)
- Meta Pixel on client
- CAPI on server for key events
- Capture and persist:
  - `utm_source/utm_campaign/utm_content/utm_term`
  - `fbclid`
  - `external_id` (internal user id)
- Dedup strategy:
  - Generate `event_id` client-side for checkout events
  - Pass it through to server + store it
  - Send same `event_id` to Meta via CAPI

---

## Facebook Ads Event Plan (MVP)

### Client-side Pixel Events
| Event | Trigger |
|-------|---------|
| PageView | All pages |
| ViewContent | Course page view |
| Lead | Email captured |
| InitiateCheckout | Checkout button click |
| Purchase | (optional) Success page |

### Server-side CAPI Events
| Event | Trigger |
|-------|---------|
| Purchase | From Stripe webhook (source of truth) |
| Lead | From server if email captured server-side |
| CompleteRegistration | (optional) When account created |

**Why this matters:** Stripe is the source of truth. CAPI ensures Meta optimization isn't wrecked by browser blocking.

---

## Success Metrics (MVP)

| Metric | Description |
|--------|-------------|
| Purchase conversion rate | LP → Purchase |
| Cost per purchase | Meta |
| Checkout initiation rate | LP → InitiateCheckout |
| Refund rate | Refunds / Purchases |
| Lesson engagement | % students who start/finish first module |
| Email opt-in rate | Lead events |

---

## Non-Functional Requirements

- **Fast:** <2s load on landing pages
- **Secure:** Signed webhooks, RBAC admin access, least-privilege secrets
- **Reliable:** Idempotent webhook handling (no double-grants)
- **Privacy:** Cookie consent banner if needed; hashed PII for CAPI

---

## Architecture

### High-Level System

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js (App Router) on Vercel |
| **Backend** | Next.js API routes |
| **Database** | Postgres (Supabase) |
| **Storage** | S3/R2 for downloads, Mux/Vimeo for video |
| **Payments** | Stripe Checkout + Webhooks |
| **Tracking** | Meta Pixel (browser) + CAPI (server) |
| **Email** | Resend (welcome + receipts via Stripe) |

### Core Components Diagram

```
Browser
→ Next.js pages (Pixel fires)
→ Checkout redirect (Stripe)

Stripe
→ Webhook → Backend endpoint
→ Backend writes purchase + entitlement
→ Backend sends CAPI Purchase event to Meta

Database
└── users / courses / lessons / entitlements / orders / tracking
```

---

## Data Model (MVP)

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users |
| email | text | unique |
| role | text | student/admin |
| created_at | timestamptz | |

### courses
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | |
| slug | text | unique |
| description | text | |
| status | text | draft/published |
| hero_image | text | |
| stripe_price_id | text | |
| created_at | timestamptz | |

### modules
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| course_id | uuid | FK → courses |
| title | text | |
| sort_order | int | |

### lessons
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| module_id | uuid | FK → modules |
| title | text | |
| sort_order | int | |
| video_url | text | |
| content_html | text | |
| downloads | jsonb | [] |

### orders
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| course_id | uuid | FK → courses |
| user_id | uuid | FK → auth.users |
| email | text | |
| stripe_session_id | text | unique |
| stripe_payment_intent | text | |
| amount | int | |
| currency | text | |
| status | text | pending/paid/refunded |
| meta_event_id | text | for dedup |
| created_at | timestamptz | |

### entitlements
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| course_id | uuid | FK → courses |
| user_id | uuid | FK → auth.users |
| email | text | |
| status | text | active/revoked |
| granted_at | timestamptz | |
| revoked_at | timestamptz | |

### attribution
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| anon_id | text | |
| user_id | uuid | FK → auth.users |
| landing_page | text | |
| fbclid | text | |
| utm_source | text | |
| utm_medium | text | |
| utm_campaign | text | |
| utm_content | text | |
| utm_term | text | |
| created_at | timestamptz | |

---

## Key Implementation Details

### Stripe Webhook Handling
1. Verify signature
2. Make it idempotent (store event id; ignore duplicates)
3. On `checkout.session.completed`:
   - Find or create user by email
   - Create order
   - Grant entitlement

### Meta CAPI Sending
Fire Purchase from webhook path with:
- `event_name` = Purchase
- `event_time` = now
- `event_id` = stored event_id (dedup)
- `custom_data`: value, currency, content_ids/course_id
- `user_data`: hashed email, client_ip, user_agent (when available)

### Attribution Capture
1. On landing page: store UTM + fbclid in first-party cookie/localStorage
2. POST to server to persist attribution
3. Attach attribution to user/order when known

---

## MVP Pages

| Path | Description |
|------|-------------|
| `/` | Home |
| `/courses` | Catalog |
| `/courses/[slug]` | Sales page |
| `/login` | Auth |
| `/app` | Student dashboard |
| `/app/courses/[slug]` | Course outline |
| `/app/lesson/[id]` | Lesson player |
| `/admin` | Admin CMS (role-gated) |

---

## Recommended Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js + Vercel |
| Database/Auth | Supabase Postgres |
| Payments | Stripe Checkout + Webhooks |
| Video | Mux (recommended) or Vimeo |
| Downloads | Cloudflare R2 |
| Tracking | Meta Pixel + CAPI |
| Email | Resend |

---

## Expansion-Ready Design (Whop-style)

When ready to go modular, add an "App" layer:

### apps
| Column | Type |
|--------|------|
| id | uuid |
| key | text (community/events/files/coaching) |
| name | text |
| status | text |

### installed_apps
| Column | Type |
|--------|------|
| id | uuid |
| course_id | uuid |
| app_id | uuid |
| config_json | jsonb |
| enabled | boolean |

### app_routes
| Column | Type |
|--------|------|
| app_id | uuid |
| path | text |
| nav_label | text |
| permissions | text |

This lets Portal28 become "a container" where Sarah turns on features per course or membership.

---

## Email System (Resend)

### MVP Email Outcomes

1. **Welcome Email** — Sent on newsletter signup
   - "You're in" confirmation
   - What to expect next
   - Stores UTM + fbclid on the contact for later attribution

2. **Course Access Email** — Sent on Stripe purchase
   - Receipt + login link / access link
   - Getting started steps
   - Marks contact as customer

### Email Data Model

#### email_contacts
| Column | Type | Notes |
|--------|------|-------|
| email | text | PK |
| first_name | text | |
| last_name | text | |
| source | text | fb_ads, site_form, purchase |
| utm_* | text | Attribution fields |
| fbclid | text | |
| is_customer | boolean | |
| unsubscribed | boolean | |
| suppressed | boolean | Bounced/complained |
| resend_contact_id | text | |

#### email_events
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email | text | |
| event_type | text | delivered, opened, clicked, bounced, complained |
| resend_email_id | text | |
| payload | jsonb | |

#### email_sends
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email | text | |
| template | text | course_access, welcome, newsletter |
| resend_email_id | text | |
| status | text | sent, failed |

### Email API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/newsletter/subscribe` | Creates contact in DB + Resend, sends welcome email |
| `POST /api/resend/webhook` | Receives delivery events, updates suppression status |

### Resend Setup Checklist

- [ ] Verify sending domain (e.g., `updates.portal28.academy`)
- [ ] Set SPF + DKIM records
- [ ] Create API key → `RESEND_API_KEY`
- [ ] Create Audience → `RESEND_AUDIENCE_ID`
- [ ] Configure webhook secret → `RESEND_WEBHOOK_SECRET`

### Scale-Up (Phase 1+)

- Segments (Leads vs Customers vs Completed Course)
- Topics (Newsletter vs Course Announcements vs Promotions)
- Behavior-triggered drips (opened/clicked/no-show)
- Bounce + complaint automation via Resend Webhooks

---

## Launch Checklist

### Meta (Facebook Ads)
- [ ] Domain verified in Meta Business Manager
- [ ] Pixel installed and firing correctly
- [ ] CAPI access token generated
- [ ] Verify Purchase event dedup in Meta Events Manager

### Stripe
- [ ] Stripe products/prices created
- [ ] Webhook endpoint registered in Stripe dashboard
- [ ] Stripe tax settings configured
- [ ] Test purchase flow end-to-end

### Resend (Email)
- [ ] Sending domain verified with SPF/DKIM
- [ ] API key configured
- [ ] Webhook endpoint registered
- [ ] Test welcome email flow
- [ ] Test course access email flow

### Legal & Compliance
- [ ] Terms of Service page live
- [ ] Privacy Policy page live
- [ ] Cookie consent banner (if required)

---

## Phase 1 — Growth Features

### Offers System

The Offers system provides a unified way to sell courses, memberships, and bundles through configurable "offer cards" that can be placed anywhere in the app.

#### offers
| Column | Type | Notes |
|--------|------|-------|
| key | text | PK, unique slug |
| kind | text | membership/course/bundle |
| title | text | Display title |
| subtitle | text | Secondary text |
| badge | text | "Popular", "Best Value" |
| cta_text | text | Button text |
| price_label | text | "$29/mo" |
| compare_at_label | text | Strikethrough price |
| bullets | jsonb | Feature list |
| payload | jsonb | Kind-specific config |
| is_active | boolean | |

#### offer_placements
| Column | Type | Notes |
|--------|------|-------|
| placement_key | text | "widget:templates", "course:fb-ads-101" |
| offer_key | text | FK → offers |
| sort_order | int | Display order |
| is_active | boolean | |

#### checkout_attempts
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| offer_key | text | |
| event_id | text | Meta dedup |
| placement_key | text | |
| anon_session_id | text | |
| meta_fbp | text | _fbp cookie |
| meta_fbc | text | _fbc cookie |
| client_ip | text | |
| client_ua | text | |
| status | text | created/redirected/completed |

#### offer_impressions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| placement_key | text | |
| offer_key | text | |
| anon_session_id | text | |
| created_at | timestamptz | |

### Meta CAPI Best Practices

Enhanced tracking with full user matching:
- **fbp**: Facebook browser ID cookie (`_fbp`)
- **fbc**: Facebook click ID cookie (`_fbc`)
- **client_ip**: From request headers
- **client_ua**: User agent string
- **event_id**: Dedup key (same in Pixel + CAPI)

---

## Phase 2 — Community Features (Whop-style)

### Community Architecture

Portal28 uses a widget-based "apps" system similar to Whop. Community features are widgets that can be enabled per membership tier.

### Widget Kinds
| Kind | Description |
|------|-------------|
| **forums** | Categories → threads → replies |
| **announcements** | Pinned posts, tags, email notify |
| **resources** | Folders + links/files |
| **chat** | Realtime channels (Phase 2+) |

### Community Data Model

#### community_spaces
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| slug | text | unique |
| name | text | |

#### community_members
| Column | Type | Notes |
|--------|------|-------|
| space_id | uuid | FK |
| user_id | uuid | FK |
| role | text | member/mod/admin |

#### forum_categories
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| space_id | uuid | FK |
| slug | text | |
| name | text | |
| description | text | |
| sort_order | int | |

#### forum_threads
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| space_id | uuid | FK |
| category_id | uuid | FK |
| title | text | |
| author_user_id | uuid | |
| is_pinned | boolean | |
| is_locked | boolean | |

#### forum_posts
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| thread_id | uuid | FK |
| author_user_id | uuid | |
| body | text | |

#### announcements
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| space_id | uuid | FK |
| title | text | |
| body | text | |
| tags | jsonb | |
| is_pinned | boolean | |

#### resource_folders
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| space_id | uuid | FK |
| name | text | |
| parent_id | uuid | Self-reference |
| sort_order | int | |

#### resource_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| folder_id | uuid | FK |
| kind | text | link/file/note |
| title | text | |
| url | text | For links |
| storage_path | text | For files |
| body | text | For notes |

### Community Routes

| Path | Description |
|------|-------------|
| `/app/community` | Community home (installed apps) |
| `/app/community/forums` | Forum categories |
| `/app/community/forums/[categorySlug]` | Threads list |
| `/app/community/forums/[categorySlug]/[threadId]` | Thread + posts |
| `/app/community/announcements` | Announcements feed |
| `/app/community/resources` | Resource library |

---

## Analytics Dashboard

### Offer Analytics
- **Impressions**: How many times offers are shown
- **Checkout Rate**: Impressions → InitiateCheckout
- **Purchase Rate**: Impressions → Purchase
- **By Placement**: Compare widget:templates vs course:fb-ads-101
- **By Offer**: Compare membership vs course vs bundle

### Admin Routes (Phase 1+)

| Path | Description |
|------|-------------|
| `/admin/offers` | List/create/edit offers |
| `/admin/offers/[key]` | Edit offer |
| `/admin/placements` | Manage offer placements |
| `/admin/placements/[placementKey]` | Drag/drop reorder |
| `/admin/analytics` | Conversion funnel dashboard |

---

## API Routes (Phase 1+)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/offers/impression` | POST | Log offer impressions |
| `/api/stripe/offer-checkout` | POST | Create checkout for any offer |
| `/api/admin/offers/upsert` | POST | Create/update offer |
| `/api/admin/placements/save` | POST | Save placement order |
| `/api/admin/placements/add` | POST | Add offer to placement |
| `/api/admin/placements/remove` | POST | Remove offer from placement |
