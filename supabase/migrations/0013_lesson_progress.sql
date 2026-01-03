-- Portal28 Academy - Lesson Completion Tracking
-- Track user progress through courses

-- =============================================================================
-- LESSON PROGRESS TABLE
-- =============================================================================

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  
  -- Progress tracking
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  progress_percent int not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  
  -- Video tracking (optional)
  video_position_seconds int default 0,
  video_duration_seconds int,
  
  -- Timestamps
  started_at timestamptz,
  completed_at timestamptz,
  last_accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(user_id, lesson_id)
);

create index idx_lesson_progress_user on public.lesson_progress(user_id, course_id);
create index idx_lesson_progress_course on public.lesson_progress(course_id, lesson_id);

-- =============================================================================
-- COURSE PROGRESS VIEW (aggregated per course)
-- =============================================================================

create or replace view public.course_progress as
select 
  lp.user_id,
  lp.course_id,
  count(distinct lp.lesson_id) as lessons_started,
  count(distinct case when lp.status = 'completed' then lp.lesson_id end) as lessons_completed,
  (select count(*) from public.lessons l 
   join public.modules m on l.module_id = m.id 
   where m.course_id = lp.course_id) as total_lessons,
  round(
    count(distinct case when lp.status = 'completed' then lp.lesson_id end)::numeric / 
    nullif((select count(*) from public.lessons l 
            join public.modules m on l.module_id = m.id 
            where m.course_id = lp.course_id), 0) * 100, 
    0
  )::int as completion_percent,
  max(lp.last_accessed_at) as last_accessed_at
from public.lesson_progress lp
group by lp.user_id, lp.course_id;

-- =============================================================================
-- ORDER BUMPS TABLE
-- =============================================================================

create table if not exists public.order_bumps (
  id uuid primary key default gen_random_uuid(),
  trigger_offer_key text not null references public.offers(key) on delete cascade,
  bump_offer_key text not null references public.offers(key) on delete cascade,
  
  headline text not null default 'Wait! Add this to your order',
  description text,
  discount_percent int check (discount_percent >= 0 and discount_percent <= 100),
  
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  
  unique(trigger_offer_key, bump_offer_key)
);

-- =============================================================================
-- POST-PURCHASE UPSELLS
-- =============================================================================

create table if not exists public.upsells (
  id uuid primary key default gen_random_uuid(),
  trigger_offer_key text not null references public.offers(key) on delete cascade,
  upsell_offer_key text not null references public.offers(key) on delete cascade,
  
  headline text not null default 'One-time offer!',
  description text,
  discount_percent int check (discount_percent >= 0 and discount_percent <= 100),
  expires_minutes int default 30, -- Time limit for the upsell
  
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  
  unique(trigger_offer_key, upsell_offer_key)
);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

alter table public.lesson_progress enable row level security;
alter table public.order_bumps enable row level security;
alter table public.upsells enable row level security;

-- Lesson progress: users can read/write own
create policy "Users can view own lesson progress"
  on public.lesson_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own lesson progress"
  on public.lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lesson progress"
  on public.lesson_progress for update
  using (auth.uid() = user_id);

-- Order bumps: public read for active
create policy "Anyone can view active order bumps"
  on public.order_bumps for select
  using (is_active = true);

-- Upsells: public read for active
create policy "Anyone can view active upsells"
  on public.upsells for select
  using (is_active = true);

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

create trigger lesson_progress_updated_at
  before update on public.lesson_progress
  for each row
  execute function update_updated_at_column();
