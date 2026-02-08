-- Portal28 Academy - App Marketplace Extension
-- Extends the existing widgets system to support a full app marketplace
-- with versioning, ratings, installation tracking, and third-party integrations

-- =========================
-- Extend widgets table for marketplace functionality
-- =========================
do $$
begin
  -- Add marketplace-specific columns if not exists
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'author') then
    alter table public.widgets add column author text default 'Portal28';
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'version') then
    alter table public.widgets add column version text default '1.0.0';
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'install_count') then
    alter table public.widgets add column install_count integer default 0;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'rating_avg') then
    alter table public.widgets add column rating_avg numeric(3,2) default 0.00;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'rating_count') then
    alter table public.widgets add column rating_count integer default 0;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'dependencies') then
    alter table public.widgets add column dependencies jsonb default '[]'::jsonb;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'screenshots') then
    alter table public.widgets add column screenshots jsonb default '[]'::jsonb;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'changelog') then
    alter table public.widgets add column changelog jsonb default '[]'::jsonb;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'metadata') then
    alter table public.widgets add column metadata jsonb default '{}'::jsonb;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'widgets' and column_name = 'updated_at') then
    alter table public.widgets add column updated_at timestamptz not null default now();
  end if;
end $$;

-- Create index for marketplace browsing
create index if not exists idx_widgets_category_status on public.widgets(category, status);
create index if not exists idx_widgets_rating on public.widgets(rating_avg desc, rating_count desc);
create index if not exists idx_widgets_installs on public.widgets(install_count desc);

-- =========================
-- App Installations (tracks which users have installed which apps)
-- =========================
create table if not exists public.app_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  widget_key text not null,

  -- Installation metadata
  installed_at timestamptz not null default now(),
  version_at_install text not null,

  -- Configuration (app-specific settings)
  config jsonb default '{}'::jsonb,

  -- Status tracking
  status text not null default 'active', -- active|inactive|uninstalled
  last_used_at timestamptz,

  -- OAuth/API credentials (encrypted in production)
  credentials jsonb default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, widget_key)
);

create index if not exists idx_app_installations_user on public.app_installations(user_id, status);
create index if not exists idx_app_installations_widget on public.app_installations(widget_key, status);

-- =========================
-- App Ratings & Reviews
-- =========================
create table if not exists public.app_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  widget_key text not null,

  -- Rating data
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text,

  -- Helpful votes
  helpful_count integer default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, widget_key)
);

create index if not exists idx_app_ratings_widget on public.app_ratings(widget_key, created_at desc);
create index if not exists idx_app_ratings_user on public.app_ratings(user_id);

-- =========================
-- App Usage Analytics
-- =========================
create table if not exists public.app_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  widget_key text not null,

  -- Event tracking
  event_type text not null, -- installed|uninstalled|opened|configured|action
  event_data jsonb default '{}'::jsonb,

  -- Context
  user_agent text,
  ip_address inet,

  created_at timestamptz not null default now()
);

create index if not exists idx_app_usage_widget on public.app_usage_events(widget_key, created_at desc);
create index if not exists idx_app_usage_user on public.app_usage_events(user_id, created_at desc);
create index if not exists idx_app_usage_type on public.app_usage_events(event_type, created_at desc);

-- =========================
-- App Webhooks (for third-party integrations)
-- =========================
create table if not exists public.app_webhooks (
  id uuid primary key default gen_random_uuid(),
  widget_key text not null,

  -- Webhook configuration
  event_type text not null, -- installed|uninstalled|configured|data_sync
  webhook_url text not null,
  secret text not null, -- for signature verification

  -- Status
  is_active boolean default true,
  last_triggered_at timestamptz,
  failure_count integer default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_webhooks_widget on public.app_webhooks(widget_key, is_active);

-- =========================
-- RLS Policies
-- =========================
alter table public.app_installations enable row level security;
alter table public.app_ratings enable row level security;
alter table public.app_usage_events enable row level security;
alter table public.app_webhooks enable row level security;

-- App Installations: users see only their own
drop policy if exists "Users can view own app installations" on public.app_installations;
create policy "Users can view own app installations"
  on public.app_installations for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own app installations" on public.app_installations;
create policy "Users can insert own app installations"
  on public.app_installations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own app installations" on public.app_installations;
create policy "Users can update own app installations"
  on public.app_installations for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own app installations" on public.app_installations;
create policy "Users can delete own app installations"
  on public.app_installations for delete
  using (auth.uid() = user_id);

-- App Ratings: public read, users can write own
drop policy if exists "Anyone can view app ratings" on public.app_ratings;
create policy "Anyone can view app ratings"
  on public.app_ratings for select
  using (true);

drop policy if exists "Users can insert own app ratings" on public.app_ratings;
create policy "Users can insert own app ratings"
  on public.app_ratings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own app ratings" on public.app_ratings;
create policy "Users can update own app ratings"
  on public.app_ratings for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own app ratings" on public.app_ratings;
create policy "Users can delete own app ratings"
  on public.app_ratings for delete
  using (auth.uid() = user_id);

-- App Usage Events: users see only their own
drop policy if exists "Users can view own app usage events" on public.app_usage_events;
create policy "Users can view own app usage events"
  on public.app_usage_events for select
  using (auth.uid() = user_id);

drop policy if exists "Service can insert app usage events" on public.app_usage_events;
create policy "Service can insert app usage events"
  on public.app_usage_events for insert
  with check (true);

-- App Webhooks: no public access (admin only via service key)
-- No RLS policies needed as admin will use service key

-- =========================
-- Functions
-- =========================

-- Update widget rating stats when a rating is added/updated
create or replace function update_widget_rating_stats()
returns trigger as $$
begin
  update public.widgets
  set
    rating_avg = (
      select round(avg(rating)::numeric, 2)
      from public.app_ratings
      where widget_key = NEW.widget_key
    ),
    rating_count = (
      select count(*)
      from public.app_ratings
      where widget_key = NEW.widget_key
    ),
    updated_at = now()
  where key = NEW.widget_key;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger to update rating stats
drop trigger if exists app_ratings_update_stats on public.app_ratings;
create trigger app_ratings_update_stats
  after insert or update or delete on public.app_ratings
  for each row
  execute function update_widget_rating_stats();

-- Increment install count when app is installed
create or replace function increment_widget_install_count()
returns trigger as $$
begin
  if NEW.status = 'active' and (TG_OP = 'INSERT' or OLD.status != 'active') then
    update public.widgets
    set
      install_count = install_count + 1,
      updated_at = now()
    where key = NEW.widget_key;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger to increment install count
drop trigger if exists app_installations_increment_count on public.app_installations;
create trigger app_installations_increment_count
  after insert or update on public.app_installations
  for each row
  execute function increment_widget_install_count();

-- Track app usage event
create or replace function track_app_event(
  p_widget_key text,
  p_event_type text,
  p_event_data jsonb default '{}'::jsonb
)
returns uuid as $$
declare
  v_event_id uuid;
begin
  insert into public.app_usage_events (user_id, widget_key, event_type, event_data)
  values (auth.uid(), p_widget_key, p_event_type, p_event_data)
  returning id into v_event_id;

  -- Update last_used_at for installations
  if p_event_type in ('opened', 'action') then
    update public.app_installations
    set
      last_used_at = now(),
      updated_at = now()
    where user_id = auth.uid() and widget_key = p_widget_key;
  end if;

  return v_event_id;
end;
$$ language plpgsql security definer;

-- Check if user has app installed
create or replace function has_app_installed(
  p_user_id uuid,
  p_widget_key text
)
returns boolean as $$
begin
  return exists (
    select 1 from public.app_installations
    where user_id = p_user_id
      and widget_key = p_widget_key
      and status = 'active'
  );
end;
$$ language plpgsql security definer;

-- Get user's installed apps
create or replace function get_user_installed_apps(p_user_id uuid)
returns table(
  widget_key text,
  widget_name text,
  version text,
  installed_at timestamptz,
  last_used_at timestamptz,
  config jsonb
) as $$
begin
  return query
  select
    i.widget_key,
    w.name,
    i.version_at_install,
    i.installed_at,
    i.last_used_at,
    i.config
  from public.app_installations i
  join public.widgets w on w.key = i.widget_key
  where i.user_id = p_user_id
    and i.status = 'active'
  order by i.last_used_at desc nulls last, i.installed_at desc;
end;
$$ language plpgsql security definer;

-- =========================
-- Triggers for updated_at
-- =========================
drop trigger if exists app_installations_updated_at on public.app_installations;
create trigger app_installations_updated_at
  before update on public.app_installations
  for each row
  execute function update_updated_at_column();

drop trigger if exists app_ratings_updated_at on public.app_ratings;
create trigger app_ratings_updated_at
  before update on public.app_ratings
  for each row
  execute function update_updated_at_column();

drop trigger if exists widgets_updated_at on public.widgets;
create trigger widgets_updated_at
  before update on public.widgets
  for each row
  execute function update_updated_at_column();

drop trigger if exists app_webhooks_updated_at on public.app_webhooks;
create trigger app_webhooks_updated_at
  before update on public.app_webhooks
  for each row
  execute function update_updated_at_column();

-- =========================
-- Seed marketplace apps (extending existing widgets)
-- =========================

-- Update existing widgets with marketplace metadata
update public.widgets
set
  author = 'Portal28',
  version = '1.0.0',
  metadata = jsonb_build_object(
    'is_core', true,
    'is_removable', false,
    'official', true
  )
where author is null;

-- Add sample third-party apps to demonstrate marketplace
insert into public.widgets (
  key,
  name,
  route,
  description,
  icon,
  category,
  status,
  access_policy,
  saleswall_type,
  display_order,
  author,
  version,
  dependencies,
  screenshots,
  changelog,
  metadata
) values
  (
    'stripe-analytics',
    'Stripe Analytics',
    '/app/marketplace/stripe-analytics',
    'Advanced analytics and insights for your Stripe revenue',
    '💳',
    'tools',
    'active',
    '{"level": "AUTH"}',
    'none',
    100,
    'Portal28 Labs',
    '1.0.0',
    '[]'::jsonb,
    '[]'::jsonb,
    '[{"version": "1.0.0", "date": "2026-02-08", "changes": ["Initial release"]}]'::jsonb,
    '{"is_core": false, "is_removable": true, "official": true, "requires_config": true}'::jsonb
  ),
  (
    'email-designer',
    'Email Designer',
    '/app/marketplace/email-designer',
    'Visual email template builder with drag-and-drop',
    '📧',
    'tools',
    'active',
    '{"level": "AUTH"}',
    'none',
    101,
    'Portal28 Labs',
    '1.2.0',
    '[]'::jsonb,
    '[]'::jsonb,
    '[{"version": "1.2.0", "date": "2026-02-01", "changes": ["Added mobile preview", "Fixed alignment bugs"]}, {"version": "1.0.0", "date": "2026-01-15", "changes": ["Initial release"]}]'::jsonb,
    '{"is_core": false, "is_removable": true, "official": true, "requires_config": false}'::jsonb
  ),
  (
    'zapier-integration',
    'Zapier Integration',
    '/app/marketplace/zapier',
    'Connect Portal28 with 5000+ apps via Zapier',
    '⚡',
    'tools',
    'coming_soon',
    '{"anyOf": [{"level": "MEMBERSHIP", "tiers": ["member", "vip"]}]}',
    'membership',
    102,
    'Zapier Inc.',
    '0.9.0',
    '[]'::jsonb,
    '[]'::jsonb,
    '[{"version": "0.9.0", "date": "2026-02-05", "changes": ["Beta release"]}]'::jsonb,
    '{"is_core": false, "is_removable": true, "official": false, "third_party": true, "requires_oauth": true}'::jsonb
  )
on conflict (key) do nothing;

-- =========================
-- Comments
-- =========================
comment on table public.app_installations is 'Tracks which users have installed which apps/widgets';
comment on table public.app_ratings is 'User ratings and reviews for marketplace apps';
comment on table public.app_usage_events is 'Analytics events for app usage tracking';
comment on table public.app_webhooks is 'Webhook configurations for third-party app integrations';
comment on column public.widgets.dependencies is 'Array of widget keys this app depends on';
comment on column public.widgets.screenshots is 'Array of screenshot URLs for marketplace listing';
comment on column public.widgets.changelog is 'Version history with changes';
comment on column public.widgets.metadata is 'Flexible metadata for app-specific configuration';
