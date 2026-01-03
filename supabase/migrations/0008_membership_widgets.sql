-- Portal28 Academy - Membership + Widget Paywalls Schema
-- Supports: courses, membership tiers, widgets with access policies

-- =============================================================================
-- MEMBERSHIP PLANS
-- =============================================================================

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique, -- 'free', 'member', 'vip'
  name text not null,
  description text,
  
  -- Stripe pricing
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  
  -- Display
  price_monthly_cents integer,
  price_yearly_cents integer,
  features jsonb default '[]', -- Array of feature strings
  is_default boolean default false, -- Default tier for new signups
  display_order integer default 0,
  
  -- Status
  status text not null default 'active' check (status in ('active', 'hidden', 'archived')),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed default tiers
insert into public.membership_plans (tier, name, description, is_default, display_order, features) values
  ('free', 'Free Account', 'Access to free resources and community basics', true, 0, '["Access to free resources", "Community read-only", "Newsletter"]'),
  ('member', 'Member', 'Full access to the Portal28 vault', false, 1, '["All free features", "Template library", "Community access", "Monthly office hours", "Member-only content"]'),
  ('vip', 'VIP', 'Premium access with coaching and reviews', false, 2, '["All member features", "Ad account reviews", "1:1 coaching calls", "Priority support", "Early access to new content"]')
on conflict (tier) do nothing;

-- =============================================================================
-- SUBSCRIPTIONS (Stripe-synced)
-- =============================================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Stripe data
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  stripe_price_id text,
  
  -- Tier info
  tier text not null references public.membership_plans(tier),
  
  -- Status (synced from Stripe)
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  
  -- Billing period
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  
  -- Trial
  trial_start timestamptz,
  trial_end timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_subscriptions_stripe_sub on public.subscriptions(stripe_subscription_id);
create index idx_subscriptions_status on public.subscriptions(status);

-- =============================================================================
-- ENTITLEMENTS (unified: courses + membership + widgets)
-- =============================================================================

-- Drop old entitlements if exists and recreate with new schema
-- Note: In production, you'd want to migrate data first
alter table if exists public.entitlements 
  add column if not exists scope_type text default 'course',
  add column if not exists scope_id text,
  add column if not exists source text default 'stripe_course',
  add column if not exists starts_at timestamptz default now(),
  add column if not exists ends_at timestamptz;

-- Update existing rows to have proper scope_type and scope_id
update public.entitlements 
set scope_type = 'course', 
    scope_id = course_id::text,
    source = 'stripe_course'
where scope_type is null or scope_type = '';

-- Create index for entitlement lookups
create index if not exists idx_entitlements_scope on public.entitlements(user_id, scope_type, scope_id);
create index if not exists idx_entitlements_email_scope on public.entitlements(email, scope_type, scope_id);

-- =============================================================================
-- WIDGETS REGISTRY
-- =============================================================================

create table if not exists public.widgets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, -- slug: 'templates', 'community', 'office-hours'
  name text not null,
  description text,
  
  -- Routing
  route text not null, -- '/app/templates'
  icon text, -- Icon name or emoji
  
  -- Access control (the heart of it)
  -- Examples:
  -- {"level": "PUBLIC"}
  -- {"level": "AUTH"}
  -- {"level": "MEMBERSHIP", "tiers": ["member", "vip"]}
  -- {"level": "COURSE", "courseSlugs": ["fb-ads-101"]}
  -- {"anyOf": [{"level": "MEMBERSHIP", "tiers": ["member"]}, {"level": "COURSE", "courseSlugs": ["fb-ads-101"]}]}
  access_policy jsonb not null default '{"level": "AUTH"}',
  
  -- Sales wall config (what to show when locked)
  saleswall_type text default 'none' check (saleswall_type in ('none', 'membership', 'course', 'custom')),
  saleswall_config jsonb default '{}', -- { priceIds: [], courseIds: [], message: "" }
  
  -- Display
  display_order integer default 0,
  category text, -- 'learn', 'community', 'tools'
  badge text, -- 'new', 'popular', 'member-only'
  
  -- Status
  status text not null default 'active' check (status in ('active', 'hidden', 'coming_soon', 'archived')),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed default widgets
insert into public.widgets (key, name, description, route, icon, access_policy, saleswall_type, category, display_order) values
  ('dashboard', 'Dashboard', 'Your learning hub overview', '/app', '📊', '{"level": "AUTH"}', 'none', 'core', 0),
  ('courses', 'My Courses', 'Access your purchased courses', '/app/courses', '🎓', '{"level": "AUTH"}', 'none', 'learn', 1),
  ('templates', 'Template Library', 'Ad templates, swipe files, and frameworks', '/app/templates', '📝', '{"level": "MEMBERSHIP", "tiers": ["member", "vip"]}', 'membership', 'tools', 2),
  ('community', 'Community', 'Connect with other Portal28 members', '/app/community', '👥', '{"level": "MEMBERSHIP", "tiers": ["member", "vip"]}', 'membership', 'community', 3),
  ('office-hours', 'Office Hours', 'Monthly live Q&A with Sarah', '/app/office-hours', '🎙️', '{"level": "MEMBERSHIP", "tiers": ["member", "vip"]}', 'membership', 'community', 4),
  ('resources', 'Free Resources', 'Guides, checklists, and starter materials', '/app/resources', '📚', '{"level": "AUTH"}', 'none', 'learn', 5),
  ('reviews', 'Ad Reviews', 'Get your ads reviewed by Sarah', '/app/reviews', '🔍', '{"level": "MEMBERSHIP", "tiers": ["vip"]}', 'membership', 'tools', 6),
  ('coaching', '1:1 Coaching', 'Book a coaching call', '/app/coaching', '💬', '{"level": "MEMBERSHIP", "tiers": ["vip"]}', 'membership', 'community', 7)
on conflict (key) do nothing;

-- =============================================================================
-- PAYWALL EVENTS (for analytics)
-- =============================================================================

create table if not exists public.paywall_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  
  -- Event details
  event_type text not null, -- 'view', 'click_upgrade', 'start_checkout', 'complete'
  widget_key text,
  paywall_type text, -- 'membership', 'course'
  
  -- Offer shown
  offer_tier text,
  offer_price_id text,
  offer_course_id uuid,
  
  -- Outcome
  converted boolean default false,
  
  -- Meta
  source text, -- 'widget_lock', 'banner', 'thank_you_upsell', 'email'
  utm_params jsonb,
  
  created_at timestamptz not null default now()
);

create index idx_paywall_events_user on public.paywall_events(user_id);
create index idx_paywall_events_type on public.paywall_events(event_type);
create index idx_paywall_events_widget on public.paywall_events(widget_key);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

alter table public.membership_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.widgets enable row level security;
alter table public.paywall_events enable row level security;

-- Membership plans: public read
create policy "Anyone can view active membership plans"
  on public.membership_plans for select
  using (status = 'active');

-- Subscriptions: users see own, admins see all
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Widgets: public read for active
create policy "Anyone can view active widgets"
  on public.widgets for select
  using (status in ('active', 'coming_soon'));

-- Paywall events: users see own
create policy "Users can view own paywall events"
  on public.paywall_events for select
  using (auth.uid() = user_id);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get user's active subscription tier
create or replace function get_user_tier(p_user_id uuid)
returns text as $$
declare
  v_tier text;
begin
  select tier into v_tier
  from public.subscriptions
  where user_id = p_user_id
    and status in ('active', 'trialing')
  order by 
    case tier when 'vip' then 1 when 'member' then 2 else 3 end
  limit 1;
  
  return coalesce(v_tier, 'free');
end;
$$ language plpgsql security definer;

-- Check if user has entitlement
create or replace function has_entitlement(
  p_user_id uuid,
  p_scope_type text,
  p_scope_id text
)
returns boolean as $$
begin
  return exists (
    select 1 from public.entitlements
    where user_id = p_user_id
      and scope_type = p_scope_type
      and scope_id = p_scope_id
      and status = 'active'
      and (ends_at is null or ends_at > now())
  );
end;
$$ language plpgsql security definer;

-- Get all user entitlements
create or replace function get_user_entitlements(p_user_id uuid)
returns table (
  scope_type text,
  scope_id text,
  source text
) as $$
begin
  return query
  select e.scope_type, e.scope_id, e.source
  from public.entitlements e
  where e.user_id = p_user_id
    and e.status = 'active'
    and (e.ends_at is null or e.ends_at > now());
end;
$$ language plpgsql security definer;

-- Triggers for updated_at
create trigger membership_plans_updated_at
  before update on public.membership_plans
  for each row
  execute function update_updated_at_column();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function update_updated_at_column();

create trigger widgets_updated_at
  before update on public.widgets
  for each row
  execute function update_updated_at_column();
