-- Portal28 Academy Email Schema
-- Run this in Supabase SQL Editor after 0001_init.sql

-- Email contacts table for newsletter + lead tracking
create table if not exists public.email_contacts (
  email text primary key,
  first_name text,
  last_name text,
  source text not null default 'site_form', -- fb_ads, site_form, purchase
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  is_customer boolean not null default false,
  unsubscribed boolean not null default false,
  suppressed boolean not null default false, -- bounced or complained
  resend_contact_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Email events table for tracking deliverability
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  event_type text not null, -- delivered, opened, clicked, bounced, complained
  resend_email_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Email sends log (optional but useful for debugging)
create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  template text not null, -- course_access, welcome, newsletter
  resend_email_id text,
  subject text,
  metadata jsonb,
  status text not null default 'sent', -- sent, failed
  error_message text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.email_contacts enable row level security;
alter table public.email_events enable row level security;
alter table public.email_sends enable row level security;

-- Indexes
create index if not exists idx_email_contacts_source on public.email_contacts(source);
create index if not exists idx_email_contacts_is_customer on public.email_contacts(is_customer);
create index if not exists idx_email_events_email on public.email_events(email);
create index if not exists idx_email_events_type on public.email_events(event_type);
create index if not exists idx_email_sends_email on public.email_sends(email);

-- Function to auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for email_contacts
create trigger email_contacts_updated_at
  before update on public.email_contacts
  for each row
  execute function update_updated_at_column();
