-- Portal28 Academy - Post-Purchase Upsell Flows
-- Adds support for one-time upsell offers shown after purchase completion

-- =============================================================================
-- UPDATE OFFERS TABLE - Add 'upsell' kind
-- =============================================================================

-- Drop existing check constraint
alter table public.offers
  drop constraint if exists offers_kind_check;

-- Add new check constraint including 'upsell'
alter table public.offers
  add constraint offers_kind_check
  check (kind in ('membership', 'course', 'bundle', 'order_bump', 'upsell'));

-- Add upsell specific fields (reuse existing fields added by order_bumps)
-- headline, description, parent_offer_key already exist from order_bumps migration

-- Add upsell-specific expiration field
alter table public.offers
  add column if not exists expires_minutes int default 30;

-- Add index for faster lookups of upsells by trigger
create index if not exists idx_offers_upsell_trigger
  on public.offers(kind, is_active, parent_offer_key)
  where kind = 'upsell';

-- Update comments
comment on column public.offers.parent_offer_key is 'For order_bump/upsell kind: the offer this should appear with. For upsells: trigger offer. For bumps: parent offer.';
comment on column public.offers.headline is 'For order_bump/upsell kind: bold headline text (e.g., "Wait! Don''t miss this exclusive offer")';
comment on column public.offers.description is 'For order_bump/upsell kind: supporting description text';
comment on column public.offers.expires_minutes is 'For upsell kind: minutes until offer expires (default 30)';

-- =============================================================================
-- UPSELL PURCHASES TABLE - Track one-click upsell purchases
-- =============================================================================

create table if not exists public.upsell_purchases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,

  -- Original order that triggered the upsell
  original_order_id uuid references public.orders(id) on delete cascade not null,

  -- Upsell offer details
  upsell_offer_key text references public.offers(key) on delete set null not null,

  -- User info
  user_id uuid references auth.users(id) on delete set null,
  email text not null,

  -- Stripe details for the upsell charge
  stripe_session_id text unique,
  stripe_payment_intent text,

  -- Purchase details
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  amount int, -- cents
  currency text,

  -- Course granted by this upsell
  course_id uuid references public.courses(id) on delete set null,

  -- Analytics
  accepted_at timestamptz, -- when user clicked "Yes"
  expires_at timestamptz, -- when offer expires
  shown_at timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists idx_upsell_purchases_original_order
  on public.upsell_purchases(original_order_id);

create index if not exists idx_upsell_purchases_user
  on public.upsell_purchases(user_id)
  where user_id is not null;

create index if not exists idx_upsell_purchases_email
  on public.upsell_purchases(email);

create index if not exists idx_upsell_purchases_status
  on public.upsell_purchases(status, created_at desc);

-- RLS Policies
alter table public.upsell_purchases enable row level security;

-- Admins can view all
create policy "Admins can view all upsell purchases"
  on public.upsell_purchases for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- Users can view their own upsell purchases
create policy "Users can view their own upsell purchases"
  on public.upsell_purchases for select
  using (
    auth.uid() = user_id
    or auth.jwt()->>'email' = email
  );

-- Service role can insert/update (via API routes)
-- No additional policy needed - service role bypasses RLS

-- =============================================================================
-- ANALYTICS - Add upsell event types to paywall_events
-- =============================================================================

comment on table public.paywall_events is
  'Tracks paywall and offer interactions. Event types: checkout_started, checkout_completed, order_bump_viewed, order_bump_added, order_bump_removed, order_bump_purchased, upsell_viewed, upsell_accepted, upsell_declined, upsell_purchased, upsell_expired';

-- =============================================================================
-- INSERT SAMPLE UPSELL OFFERS
-- =============================================================================

-- Sample upsell offer that can be shown after course purchase
insert into public.offers (key, kind, title, headline, description, badge, cta_text, price_label, compare_at_label, bullets, payload, parent_offer_key, expires_minutes, is_active)
values
  (
    'upsell-advanced-course',
    'upsell',
    'Advanced Course Upgrade',
    'Wait! Get the Advanced Course for 50% Off',
    'You''re one step away from mastering advanced techniques. This exclusive one-time offer expires in 30 minutes!',
    'ONE-TIME OFFER',
    'Yes, Upgrade Me Now!',
    '$97',
    '$197',
    '["20+ advanced video lessons", "Exclusive templates & scripts", "Private community access", "Weekly live Q&A sessions", "Lifetime access & updates"]'::jsonb,
    '{"courseSlug": "advanced-fb-ads"}'::jsonb,
    'course-fb-ads-101', -- Trigger after purchasing FB Ads 101
    30,
    true
  ),
  (
    'upsell-membership',
    'upsell',
    'Full Membership Access',
    'Unlock ALL Courses with Membership',
    'Get instant access to our entire library of 15+ courses, monthly live trainings, and exclusive member resources.',
    'BEST VALUE',
    'Yes, I Want Full Access!',
    '$47/mo',
    '$97/mo',
    '["Access to ALL current courses", "All future courses included", "Monthly live trainings", "Private member community", "Cancel anytime"]'::jsonb,
    '{"tier": "premium", "interval": "monthly"}'::jsonb,
    null, -- Can trigger after any course purchase
    30,
    true
  )
on conflict (key) do update set
  kind = excluded.kind,
  title = excluded.title,
  headline = excluded.headline,
  description = excluded.description,
  badge = excluded.badge,
  cta_text = excluded.cta_text,
  price_label = excluded.price_label,
  compare_at_label = excluded.compare_at_label,
  bullets = excluded.bullets,
  payload = excluded.payload,
  parent_offer_key = excluded.parent_offer_key,
  expires_minutes = excluded.expires_minutes,
  is_active = excluded.is_active,
  updated_at = now();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- RLS policies handle access control
-- Service role can do everything (used by API routes)
