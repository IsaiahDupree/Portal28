-- Portal28 Academy - Admin & Meta Event ID Updates
-- Run this in Supabase SQL Editor after 0002_email.sql

-- Add meta_event_id to orders for Meta CAPI deduplication
alter table public.orders
  add column if not exists meta_event_id text;

-- Add index for meta_event_id lookups
create index if not exists idx_orders_meta_event_id on public.orders(meta_event_id);

-- Add hero_image and price columns to courses if not present
alter table public.courses
  add column if not exists hero_image_url text,
  add column if not exists price_cents integer;

-- Create admin actions log (optional but useful for auditing)
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id),
  action text not null, -- created_course, updated_course, published_course, etc.
  target_type text, -- course, module, lesson
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.admin_actions enable row level security;

-- Admin can read their own actions
create policy "Admins can read actions"
  on public.admin_actions for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin can insert actions
create policy "Admins can insert actions"
  on public.admin_actions for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
