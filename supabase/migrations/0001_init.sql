-- Portal28 Academy Database Schema
-- Run this in Supabase SQL Editor

-- Users table (app-level profile; auth users live in Supabase Auth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  status text not null default 'draft', -- draft|published
  hero_image text,
  stripe_price_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  video_url text,
  content_html text,
  downloads jsonb not null default '[]'::jsonb
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  stripe_session_id text unique,
  stripe_payment_intent text,
  amount int,
  currency text,
  status text not null default 'pending', -- pending|paid|refunded
  meta_event_id text, -- for Meta dedup
  created_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  status text not null default 'active', -- active|revoked
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.attribution (
  id uuid primary key default gen_random_uuid(),
  anon_id text,
  user_id uuid references auth.users(id) on delete set null,
  landing_page text,
  fbclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.attribution enable row level security;

-- RLS Policies

-- users: user can read/update their own profile
create policy "users_select_own" on public.users
for select using (auth.uid() = id);

create policy "users_update_own" on public.users
for update using (auth.uid() = id);

-- courses: published is public read
create policy "courses_public_read_published" on public.courses
for select using (status = 'published');

-- modules: public read (course access enforced in app)
create policy "modules_public_read" on public.modules
for select using (true);

-- lessons: public read (course access enforced in app)
create policy "lessons_public_read" on public.lessons
for select using (true);

-- orders: user can read own
create policy "orders_select_own" on public.orders
for select using (auth.uid() = user_id);

-- entitlements: user can read own
create policy "entitlements_select_own" on public.entitlements
for select using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_courses_slug on public.courses(slug);
create index if not exists idx_courses_status on public.courses(status);
create index if not exists idx_modules_course_id on public.modules(course_id);
create index if not exists idx_lessons_module_id on public.lessons(module_id);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_stripe_session on public.orders(stripe_session_id);
create index if not exists idx_entitlements_user_id on public.entitlements(user_id);
create index if not exists idx_entitlements_course_id on public.entitlements(course_id);
