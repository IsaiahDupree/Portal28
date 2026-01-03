-- Portal28 Academy - Course Hub + Membership + Widget Paywalls
-- Clean schema following user's 6-segment PRD

-- =========================
-- Membership plans (subscription tiers)
-- =========================
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  tier text unique not null, -- e.g. "member", "vip"
  name text not null,
  description text,
  stripe_price_id_monthly text not null,
  stripe_price_id_yearly text,
  is_active boolean not null default true,
  display_order integer default 0,
  features jsonb default '[]',
  created_at timestamptz not null default now()
);

-- Seed default membership plans
insert into public.membership_plans (tier, name, description, stripe_price_id_monthly, display_order, features) values
  ('member', 'Member', 'Full access to the Portal28 vault', 'price_member_monthly', 1, '["Template library", "Community access", "Monthly office hours", "Member-only content"]'),
  ('vip', 'VIP', 'Premium access with coaching and reviews', 'price_vip_monthly', 2, '["All member features", "Ad account reviews", "1:1 coaching calls", "Priority support"]')
on conflict (tier) do nothing;

-- =========================
-- Subscriptions (membership status synced from Stripe)
-- =========================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tier text not null, -- "member"|"vip"
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null, -- active|trialing|past_due|canceled|incomplete|unpaid
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subs_user on public.subscriptions(user_id, updated_at desc);
create index if not exists idx_subs_stripe_sub on public.subscriptions(stripe_subscription_id);

-- =========================
-- Entitlements (unified access layer)
-- scope_type: course | membership_tier | widget
-- scope_key: course slug, tier name, widget key
-- =========================

-- Add new columns to existing entitlements table if it exists
do $$
begin
  -- Add scope_type column if not exists
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'entitlements' and column_name = 'scope_type') then
    alter table public.entitlements add column scope_type text;
  end if;
  
  -- Add scope_key column if not exists
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'entitlements' and column_name = 'scope_key') then
    alter table public.entitlements add column scope_key text;
  end if;
  
  -- Add source column if not exists
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'entitlements' and column_name = 'source') then
    alter table public.entitlements add column source text default 'stripe_course';
  end if;
  
  -- Add starts_at column if not exists
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'entitlements' and column_name = 'starts_at') then
    alter table public.entitlements add column starts_at timestamptz default now();
  end if;
  
  -- Add ends_at column if not exists
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'entitlements' and column_name = 'ends_at') then
    alter table public.entitlements add column ends_at timestamptz;
  end if;
end $$;

-- Migrate existing course entitlements to new format
update public.entitlements 
set scope_type = 'course',
    scope_key = (select slug from public.courses where courses.id = entitlements.course_id limit 1),
    source = 'stripe_course'
where scope_type is null and course_id is not null;

-- Create unique index for entitlement lookups (if not exists)
create unique index if not exists idx_entitlements_unique 
  on public.entitlements(user_id, scope_type, scope_key) 
  where scope_type is not null and scope_key is not null;

create index if not exists idx_entitlements_user_scope 
  on public.entitlements(user_id, scope_type, scope_key);

-- =========================
-- Widgets registry + access rules + paywall configuration
-- =========================
create table if not exists public.widgets (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,          -- e.g. "templates", "community"
  name text not null,
  route text not null,               -- e.g. "/app/templates"
  description text,
  icon text,                         -- emoji or icon name
  category text,                     -- 'learn', 'community', 'tools'
  status text not null default 'active', -- active|hidden|coming_soon
  
  -- Access control (the heart of it)
  -- { "level":"PUBLIC"|"AUTH" } OR
  -- { "anyOf":[ {level:"MEMBERSHIP", tiers:["member"]}, {level:"COURSE", courseSlugs:["fb-ads-101"]} ] }
  access_policy jsonb not null default '{"level": "AUTH"}',
  
  -- Sales wall config
  saleswall_type text not null default 'none', -- none|membership|course|hybrid
  saleswall_config jsonb not null default '{}'::jsonb, -- { priceIds:[], courseSlugs:[] }
  
  display_order integer default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_widgets_status on public.widgets(status);

-- Seed default widgets
insert into public.widgets (key, name, route, description, icon, category, access_policy, saleswall_type, display_order) values
  ('dashboard', 'Dashboard', '/app', 'Your learning hub overview', '📊', 'core', '{"level": "AUTH"}', 'none', 0),
  ('courses', 'My Courses', '/app/courses', 'Access your purchased courses', '🎓', 'learn', '{"level": "AUTH"}', 'none', 1),
  ('resources', 'Free Resources', '/app/resources', 'Guides, checklists, and starter materials', '📚', 'learn', '{"level": "AUTH"}', 'none', 2),
  ('templates', 'Template Library', '/app/templates', 'Ad templates, swipe files, and frameworks', '📝', 'tools', '{"anyOf": [{"level": "MEMBERSHIP", "tiers": ["member", "vip"]}]}', 'membership', 3),
  ('community', 'Community', '/app/community', 'Connect with other Portal28 members', '👥', 'community', '{"anyOf": [{"level": "MEMBERSHIP", "tiers": ["member", "vip"]}]}', 'membership', 4),
  ('office-hours', 'Office Hours', '/app/office-hours', 'Monthly live Q&A with Sarah', '🎙️', 'community', '{"anyOf": [{"level": "MEMBERSHIP", "tiers": ["member", "vip"]}]}', 'membership', 5),
  ('reviews', 'Ad Reviews', '/app/reviews', 'Get your ads reviewed by Sarah', '🔍', 'tools', '{"anyOf": [{"level": "MEMBERSHIP", "tiers": ["vip"]}]}', 'membership', 6),
  ('coaching', '1:1 Coaching', '/app/coaching', 'Book a coaching call', '💬', 'community', '{"anyOf": [{"level": "MEMBERSHIP", "tiers": ["vip"]}]}', 'membership', 7)
on conflict (key) do nothing;

-- =========================
-- Paywall events (for analytics)
-- =========================
create table if not exists public.paywall_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  event_type text not null, -- 'view', 'click_upgrade', 'start_checkout', 'complete'
  widget_key text,
  paywall_type text, -- 'membership', 'course', 'hybrid'
  offer_tier text,
  offer_price_id text,
  offer_course_slug text,
  converted boolean default false,
  source text, -- 'widget_lock', 'banner', 'thank_you_upsell', 'email', 'pricing_page'
  utm_params jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_paywall_events_user on public.paywall_events(user_id);
create index if not exists idx_paywall_events_type on public.paywall_events(event_type, created_at);

-- =========================
-- RLS Policies
-- =========================
alter table public.membership_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.widgets enable row level security;
alter table public.paywall_events enable row level security;

-- Membership plans: public read for active
drop policy if exists "Anyone can view active membership plans" on public.membership_plans;
create policy "Anyone can view active membership plans"
  on public.membership_plans for select
  using (status = 'active');

-- Subscriptions: users see own
drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Widgets: public read for active
drop policy if exists "Anyone can view active widgets" on public.widgets;
create policy "Anyone can view active widgets"
  on public.widgets for select
  using (status in ('active', 'coming_soon'));

-- Paywall events: users see own
drop policy if exists "Users can view own paywall events" on public.paywall_events;
create policy "Users can view own paywall events"
  on public.paywall_events for select
  using (auth.uid() = user_id);

-- =========================
-- Helper functions
-- =========================

-- Get user's active subscription tier (returns highest tier if multiple)
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

-- Check if user has a specific entitlement (drop first to change param names)
drop function if exists has_entitlement(uuid, text, text);
create or replace function has_entitlement(
  p_user_id uuid,
  p_scope_type text,
  p_scope_key text
)
returns boolean as $$
begin
  return exists (
    select 1 from public.entitlements
    where user_id = p_user_id
      and scope_type = p_scope_type
      and (scope_key = p_scope_key or scope_id = p_scope_key)
      and status = 'active'
      and (ends_at is null or ends_at > now())
  );
end;
$$ language plpgsql security definer;

-- Triggers (with IF NOT EXISTS pattern using DO block)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'subscriptions_updated_at') then
    create trigger subscriptions_updated_at
      before update on public.subscriptions
      for each row
      execute function update_updated_at_column();
  end if;
end $$;
