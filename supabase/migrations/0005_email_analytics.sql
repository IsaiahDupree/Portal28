-- Portal28 Academy - Email Analytics & Tracking Schema
-- Flodesk + Instantly-style tracking: opens, clicks, replies, bot detection

-- Enhance email_sends with more tracking fields
alter table public.email_sends
  add column if not exists resend_email_id text,
  add column if not exists message_id text,
  add column if not exists tags jsonb default '{}',
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz,
  add column if not exists open_count integer default 0,
  add column if not exists click_count integer default 0,
  add column if not exists human_click_count integer default 0,
  add column if not exists is_replied boolean default false;

-- Create index for resend_email_id lookups
create index if not exists idx_email_sends_resend_id on public.email_sends(resend_email_id);

-- Enhanced email_events table for detailed tracking
drop table if exists public.email_events cascade;
create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  send_id uuid references public.email_sends(id) on delete cascade,
  email text not null references public.email_contacts(email) on delete set null,
  
  -- Event details
  event_type text not null, -- sent, delivered, opened, clicked, bounced, complained, unsubscribed, replied
  resend_email_id text,
  
  -- Tracking metadata
  clicked_link text,
  user_agent text,
  ip_address text,
  
  -- Bot detection
  is_suspected_bot boolean default false,
  bot_detection_reason text,
  
  -- Bounce/complaint details
  bounce_type text,
  bounce_reason text,
  
  -- Raw payload for debugging
  raw_payload jsonb,
  
  created_at timestamptz not null default now()
);

-- Indexes for analytics queries
create index idx_email_events_type on public.email_events(event_type);
create index idx_email_events_email on public.email_events(email);
create index idx_email_events_send on public.email_events(send_id);
create index idx_email_events_created on public.email_events(created_at);
create index idx_email_events_resend on public.email_events(resend_email_id);

-- Email threads for reply tracking (Instantly-style)
create table if not exists public.email_threads (
  id uuid primary key default gen_random_uuid(),
  contact_email text not null references public.email_contacts(email) on delete set null,
  
  -- Thread metadata
  subject text,
  status text not null default 'open' check (status in ('open', 'closed', 'archived')),
  
  -- Counts
  message_count integer default 0,
  inbound_count integer default 0,
  outbound_count integer default 0,
  
  -- Timestamps
  first_message_at timestamptz,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_email_threads_contact on public.email_threads(contact_email);
create index idx_email_threads_status on public.email_threads(status);

-- Email messages (individual messages in threads)
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.email_threads(id) on delete cascade,
  send_id uuid references public.email_sends(id) on delete set null,
  
  -- Message details
  direction text not null check (direction in ('inbound', 'outbound')),
  resend_email_id text,
  message_id text, -- From email headers
  in_reply_to text,
  
  -- Content
  subject text,
  from_address text,
  to_address text,
  text_content text,
  html_content text,
  headers jsonb,
  
  -- Status
  status text default 'received' check (status in ('received', 'read', 'replied', 'archived')),
  
  created_at timestamptz not null default now()
);

create index idx_email_messages_thread on public.email_messages(thread_id);
create index idx_email_messages_direction on public.email_messages(direction);

-- Contact engagement scores (computed)
create table if not exists public.contact_engagement (
  email text primary key references public.email_contacts(email) on delete cascade,
  
  -- Engagement metrics
  total_sends integer default 0,
  total_delivered integer default 0,
  total_opens integer default 0,
  total_clicks integer default 0,
  total_human_clicks integer default 0,
  total_replies integer default 0,
  total_unsubscribes integer default 0,
  total_bounces integer default 0,
  total_complaints integer default 0,
  
  -- Engagement score (clicks=3, replies=5, opens=1)
  engagement_score integer default 0,
  
  -- Timeline
  first_send_at timestamptz,
  last_send_at timestamptz,
  first_open_at timestamptz,
  last_open_at timestamptz,
  first_click_at timestamptz,
  last_click_at timestamptz,
  first_reply_at timestamptz,
  last_reply_at timestamptz,
  last_engaged_at timestamptz,
  
  updated_at timestamptz not null default now()
);

-- Program/sequence analytics (rollups for fast dashboards)
create table if not exists public.email_program_stats (
  program_id uuid primary key references public.email_programs(id) on delete cascade,
  
  -- Counts
  total_sends integer default 0,
  total_delivered integer default 0,
  total_opened integer default 0,
  total_clicked integer default 0,
  total_human_clicked integer default 0,
  total_replied integer default 0,
  total_bounced integer default 0,
  total_complained integer default 0,
  total_unsubscribed integer default 0,
  
  -- Rates (stored as decimals, e.g., 0.25 = 25%)
  delivery_rate decimal(5,4) default 0,
  open_rate decimal(5,4) default 0,
  click_rate decimal(5,4) default 0,
  human_click_rate decimal(5,4) default 0,
  reply_rate decimal(5,4) default 0,
  bounce_rate decimal(5,4) default 0,
  complaint_rate decimal(5,4) default 0,
  unsubscribe_rate decimal(5,4) default 0,
  
  -- Bot stats
  suspected_bot_clicks integer default 0,
  
  -- Last computed
  computed_at timestamptz not null default now()
);

-- Link tracking (for link-level analytics)
create table if not exists public.email_link_clicks (
  id uuid primary key default gen_random_uuid(),
  send_id uuid references public.email_sends(id) on delete cascade,
  program_id uuid references public.email_programs(id) on delete cascade,
  version_id uuid references public.email_versions(id) on delete cascade,
  
  -- Link details
  original_url text not null,
  link_text text,
  link_position integer, -- Position in email (1st link, 2nd link, etc.)
  
  -- Click counts
  total_clicks integer default 0,
  unique_clicks integer default 0,
  human_clicks integer default 0,
  bot_clicks integer default 0,
  
  created_at timestamptz not null default now()
);

create index idx_link_clicks_program on public.email_link_clicks(program_id);
create index idx_link_clicks_url on public.email_link_clicks(original_url);

-- Email attribution for Stripe revenue tracking
alter table public.orders
  add column if not exists email_send_id uuid references public.email_sends(id),
  add column if not exists email_program_id uuid references public.email_programs(id),
  add column if not exists email_campaign text;

-- Add attributed_revenue to program stats
alter table public.email_program_stats
  add column if not exists attributed_revenue_cents integer default 0,
  add column if not exists attributed_orders integer default 0;

-- Enable RLS
alter table public.email_events enable row level security;
alter table public.email_threads enable row level security;
alter table public.email_messages enable row level security;
alter table public.contact_engagement enable row level security;
alter table public.email_program_stats enable row level security;
alter table public.email_link_clicks enable row level security;

-- Auto-update updated_at triggers
create trigger email_threads_updated_at
  before update on public.email_threads
  for each row
  execute function update_updated_at_column();

create trigger contact_engagement_updated_at
  before update on public.contact_engagement
  for each row
  execute function update_updated_at_column();
