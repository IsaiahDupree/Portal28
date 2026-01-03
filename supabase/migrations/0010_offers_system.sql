-- Portal28 Academy - Offers System
-- Unified checkout for courses, memberships, and bundles

-- =============================================================================
-- OFFERS (the "product cards" that can be placed anywhere)
-- =============================================================================

create table if not exists public.offers (
  key text primary key,
  kind text not null check (kind in ('membership', 'course', 'bundle')),
  title text not null,
  subtitle text,
  badge text, -- 'Popular', 'Best Value', 'New'
  cta_text text not null default 'Continue',
  price_label text, -- '$29/mo'
  compare_at_label text, -- '$49/mo' (strikethrough)
  bullets jsonb not null default '[]'::jsonb, -- ["Feature 1", "Feature 2"]
  
  -- Kind-specific payload:
  -- membership: { "tier": "member", "interval": "monthly" }
  -- course: { "courseSlug": "fb-ads-101" }
  -- bundle: { "courseSlug": "fb-ads-101", "tier": "member", "trialDays": 30 }
  payload jsonb not null default '{}'::jsonb,
  
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- OFFER PLACEMENTS (where offers appear)
-- =============================================================================

create table if not exists public.offer_placements (
  placement_key text not null, -- 'widget:templates', 'course:fb-ads-101', 'pricing-page'
  offer_key text not null references public.offers(key) on delete cascade,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (placement_key, offer_key)
);

create index idx_offer_placements_key on public.offer_placements(placement_key, sort_order);

-- =============================================================================
-- CHECKOUT ATTEMPTS (for analytics + Meta CAPI matching)
-- =============================================================================

create table if not exists public.checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  offer_key text not null references public.offers(key) on delete set null,
  event_id text not null, -- Meta dedup ID
  placement_key text,
  anon_session_id text,
  user_id uuid,
  
  -- Meta CAPI matching fields
  meta_fbp text, -- _fbp cookie
  meta_fbc text, -- _fbc cookie
  client_ip text,
  client_ua text,
  
  -- Stripe session
  stripe_session_id text,
  
  status text not null default 'created' check (status in ('created', 'redirected', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index idx_checkout_attempts_event on public.checkout_attempts(event_id);
create index idx_checkout_attempts_offer on public.checkout_attempts(offer_key, created_at);
create index idx_checkout_attempts_status on public.checkout_attempts(status, created_at);

-- =============================================================================
-- OFFER IMPRESSIONS (for conversion analytics)
-- =============================================================================

create table if not exists public.offer_impressions (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null,
  offer_key text not null,
  user_id uuid,
  anon_session_id text,
  created_at timestamptz not null default now()
);

create index idx_offer_impressions_lookup on public.offer_impressions(placement_key, offer_key, created_at);

-- =============================================================================
-- META EVENTS LOG (for debugging CAPI)
-- =============================================================================

create table if not exists public.meta_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_name text not null,
  source text not null default 'capi', -- 'capi' or 'pixel'
  offer_key text,
  order_id uuid,
  payload jsonb,
  response_status int,
  response_body text,
  created_at timestamptz not null default now()
);

create index idx_meta_events_lookup on public.meta_events(event_id, event_name);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

alter table public.offers enable row level security;
alter table public.offer_placements enable row level security;
alter table public.checkout_attempts enable row level security;
alter table public.offer_impressions enable row level security;
alter table public.meta_events enable row level security;

-- Offers: public read for active
create policy "Anyone can view active offers"
  on public.offers for select
  using (is_active = true);

-- Offer placements: public read for active
create policy "Anyone can view active offer placements"
  on public.offer_placements for select
  using (is_active = true);

-- Checkout attempts: users see own
create policy "Users can view own checkout attempts"
  on public.checkout_attempts for select
  using (auth.uid() = user_id);

-- Impressions: insert only (no reads for regular users)
create policy "Anyone can insert impressions"
  on public.offer_impressions for insert
  with check (true);

-- Meta events: admin only (no policy needed, service role only)

-- =============================================================================
-- SEED DEFAULT OFFERS
-- =============================================================================

insert into public.offers (key, kind, title, subtitle, badge, cta_text, price_label, compare_at_label, bullets, payload)
values
  ('member-monthly', 'membership', 'Membership (Monthly)', 'Full access to the Portal28 vault', 'Popular', 'Join Now', '$29/mo', null,
    '["Template library", "Community access", "Monthly office hours", "Member-only content"]'::jsonb,
    '{"tier": "member", "interval": "monthly"}'::jsonb),
    
  ('member-yearly', 'membership', 'Membership (Yearly)', 'Full access — save 2 months', 'Best Value', 'Join Now', '$290/yr', '$348/yr',
    '["Template library", "Community access", "Monthly office hours", "Member-only content", "2 months free"]'::jsonb,
    '{"tier": "member", "interval": "yearly"}'::jsonb),
    
  ('vip-monthly', 'membership', 'VIP (Monthly)', 'Premium access with coaching', null, 'Go VIP', '$99/mo', null,
    '["All member features", "Ad account reviews", "1:1 coaching calls", "Priority support"]'::jsonb,
    '{"tier": "vip", "interval": "monthly"}'::jsonb)
on conflict (key) do nothing;

-- Seed default placements
insert into public.offer_placements (placement_key, offer_key, sort_order)
values
  ('widget:templates', 'member-monthly', 0),
  ('widget:templates', 'member-yearly', 1),
  ('widget:community', 'member-monthly', 0),
  ('widget:community', 'member-yearly', 1),
  ('pricing-page', 'member-monthly', 0),
  ('pricing-page', 'member-yearly', 1),
  ('pricing-page', 'vip-monthly', 2)
on conflict (placement_key, offer_key) do nothing;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

create trigger offers_updated_at
  before update on public.offers
  for each row
  execute function update_updated_at_column();
