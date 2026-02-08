-- Batch Email Campaigns (feat-231)
-- Adds batch email campaign functionality with segment selection, template builder, and send tracking

-- Email Campaigns table (one-time batch sends, separate from scheduled programs)
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),

  -- Basic info
  name text not null,
  description text,

  -- Content
  subject text not null,
  preview_text text,
  html_content text not null,
  plain_text text,

  -- Segmentation
  segment_type text not null default 'all' check (segment_type in ('all', 'leads', 'customers', 'course_students', 'custom')),
  segment_filter jsonb default '{}', -- Custom filters for segment_type='custom'

  -- Status tracking
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),

  -- Scheduling
  scheduled_for timestamptz,

  -- Sending
  sent_at timestamptz,
  started_sending_at timestamptz,
  completed_sending_at timestamptz,

  -- Stats (computed from sends)
  total_recipients integer default 0,
  total_sent integer default 0,
  total_delivered integer default 0,
  total_bounced integer default 0,
  total_failed integer default 0,

  -- Engagement tracking
  total_opens integer default 0,
  unique_opens integer default 0,
  total_clicks integer default 0,
  unique_clicks integer default 0,

  -- Resend integration
  resend_batch_id text,

  -- Error tracking
  error_message text,

  -- Metadata
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campaign Sends (individual send records for batch campaigns)
create table if not exists public.email_campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,

  -- Recipient
  email text not null,
  user_id uuid references public.users(id),

  -- Send details
  resend_email_id text,

  -- Delivery tracking
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'delivered', 'bounced', 'failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,

  -- Engagement tracking
  opened_at timestamptz,
  first_opened_at timestamptz,
  open_count integer default 0,

  clicked_at timestamptz,
  first_clicked_at timestamptz,
  click_count integer default 0,

  -- Error tracking
  error_message text,
  bounce_reason text,

  created_at timestamptz not null default now()
);

-- Campaign Templates (reusable email templates)
create table if not exists public.email_campaign_templates (
  id uuid primary key default gen_random_uuid(),

  -- Template info
  name text not null,
  description text,
  category text, -- 'announcement', 'promotion', 'newsletter', etc.

  -- Content
  subject text not null,
  preview_text text,
  html_content text not null,
  plain_text text,

  -- Variables for personalization
  variables jsonb default '[]', -- e.g., ['name', 'course_name', 'discount_code']

  -- Metadata
  is_active boolean default true,
  usage_count integer default 0,

  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campaign Segments (saved audience segments)
create table if not exists public.email_campaign_segments (
  id uuid primary key default gen_random_uuid(),

  -- Segment info
  name text not null,
  description text,

  -- Segment definition
  segment_type text not null check (segment_type in ('all', 'leads', 'customers', 'course_students', 'custom')),
  filter_rules jsonb not null default '{}',

  -- Cached count (refreshed periodically)
  cached_count integer default 0,
  count_last_updated_at timestamptz,

  -- Metadata
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.email_campaigns enable row level security;
alter table public.email_campaign_sends enable row level security;
alter table public.email_campaign_templates enable row level security;
alter table public.email_campaign_segments enable row level security;

-- RLS Policies - Admin only access

-- email_campaigns
create policy "Admins can view campaigns" on public.email_campaigns
for select using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

create policy "Admins can create campaigns" on public.email_campaigns
for insert with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

create policy "Admins can update campaigns" on public.email_campaigns
for update using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

create policy "Admins can delete campaigns" on public.email_campaigns
for delete using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- email_campaign_sends
create policy "Admins can view campaign sends" on public.email_campaign_sends
for select using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- email_campaign_templates
create policy "Admins can manage templates" on public.email_campaign_templates
for all using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- email_campaign_segments
create policy "Admins can manage segments" on public.email_campaign_segments
for all using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- Indexes for performance
create index if not exists idx_email_campaigns_status on public.email_campaigns(status);
create index if not exists idx_email_campaigns_scheduled on public.email_campaigns(scheduled_for) where status = 'scheduled';
create index if not exists idx_email_campaigns_created_by on public.email_campaigns(created_by);

create index if not exists idx_campaign_sends_campaign on public.email_campaign_sends(campaign_id);
create index if not exists idx_campaign_sends_email on public.email_campaign_sends(email);
create index if not exists idx_campaign_sends_status on public.email_campaign_sends(status);
create index if not exists idx_campaign_sends_resend_id on public.email_campaign_sends(resend_email_id);

create index if not exists idx_campaign_templates_active on public.email_campaign_templates(is_active);
create index if not exists idx_campaign_templates_category on public.email_campaign_templates(category);

-- Auto-update updated_at triggers
create trigger email_campaigns_updated_at
  before update on public.email_campaigns
  for each row
  execute function update_updated_at_column();

create trigger email_campaign_templates_updated_at
  before update on public.email_campaign_templates
  for each row
  execute function update_updated_at_column();

create trigger email_campaign_segments_updated_at
  before update on public.email_campaign_segments
  for each row
  execute function update_updated_at_column();

-- Function to calculate segment count
create or replace function public.calculate_campaign_segment_count(
  p_segment_type text,
  p_filter_rules jsonb default '{}'
)
returns integer as $$
declare
  v_count integer;
begin
  case p_segment_type
    when 'all' then
      -- All contacts (email_contacts table or users with emails)
      select count(distinct email) into v_count
      from public.email_contacts
      where is_subscribed = true;

    when 'leads' then
      -- Contacts who are not customers
      select count(distinct ec.email) into v_count
      from public.email_contacts ec
      where ec.is_subscribed = true
      and not exists (
        select 1 from public.orders o
        where o.email = ec.email
        and o.status = 'succeeded'
      );

    when 'customers' then
      -- Users who have completed at least one purchase
      select count(distinct o.email) into v_count
      from public.orders o
      where o.status = 'succeeded';

    when 'course_students' then
      -- Users who have access to specific course (course_id in filter_rules)
      select count(distinct e.user_id) into v_count
      from public.entitlements e
      join auth.users u on u.id = e.user_id
      where e.course_id = (p_filter_rules->>'course_id')::uuid
      and u.email is not null;

    when 'custom' then
      -- Custom segment - default to 0 for now
      v_count := 0;

    else
      v_count := 0;
  end case;

  return coalesce(v_count, 0);
end;
$$ language plpgsql security definer;

-- Function to get campaign recipients
create or replace function public.get_campaign_recipients(
  p_campaign_id uuid
)
returns table (
  email text,
  user_id uuid,
  name text
) as $$
declare
  v_campaign record;
begin
  -- Get campaign details
  select segment_type, segment_filter into v_campaign
  from public.email_campaigns
  where id = p_campaign_id;

  if v_campaign is null then
    return;
  end if;

  -- Return recipients based on segment type
  case v_campaign.segment_type
    when 'all' then
      return query
      select
        ec.email,
        ec.user_id,
        coalesce(ec.name, split_part(ec.email, '@', 1)) as name
      from public.email_contacts ec
      where ec.is_subscribed = true;

    when 'leads' then
      return query
      select
        ec.email,
        ec.user_id,
        coalesce(ec.name, split_part(ec.email, '@', 1)) as name
      from public.email_contacts ec
      where ec.is_subscribed = true
      and not exists (
        select 1 from public.orders o
        where o.email = ec.email
        and o.status = 'succeeded'
      );

    when 'customers' then
      return query
      select distinct
        o.email,
        o.user_id,
        coalesce(o.buyer_name, split_part(o.email, '@', 1)) as name
      from public.orders o
      where o.status = 'succeeded'
      and o.email is not null;

    when 'course_students' then
      return query
      select distinct
        u.email,
        e.user_id,
        coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as name
      from public.entitlements e
      join auth.users u on u.id = e.user_id
      where e.course_id = (v_campaign.segment_filter->>'course_id')::uuid
      and u.email is not null;

    else
      -- Custom or unknown - return empty
      return;
  end case;
end;
$$ language plpgsql security definer;

-- Comments for documentation
comment on table public.email_campaigns is 'One-time batch email campaigns with segment targeting';
comment on table public.email_campaign_sends is 'Individual send records for batch campaigns';
comment on table public.email_campaign_templates is 'Reusable email templates for campaigns';
comment on table public.email_campaign_segments is 'Saved audience segments for targeting';
