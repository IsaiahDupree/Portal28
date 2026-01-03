-- 0016_course_studio_v2.sql
-- Refined Course Studio schema with enums and RLS helpers

-- =============
-- ENUMS
-- =============
do $$ begin
  create type workspace_role as enum ('owner','admin','instructor','support','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type course_status as enum ('draft','published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type course_visibility as enum ('private','unlisted','public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_type as enum ('multimedia','pdf','quiz','text');
exception when duplicate_object then null; end $$;

do $$ begin
  create type drip_type as enum ('immediate','date','days_after_enroll');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_status as enum ('empty','uploading','processing','ready','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type file_kind as enum ('attachment','pdf','document','image');
exception when duplicate_object then null; end $$;

-- =============
-- RLS HELPERS (create before tables that use them)
-- =============
create or replace function is_workspace_member(wid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from workspace_members wm
    where wm.workspace_id = wid and wm.user_id = auth.uid()
  );
$$;

create or replace function workspace_role_of(wid uuid)
returns text language sql stable security definer as $$
  select coalesce(
    (select wm.role::text from workspace_members wm
     where wm.workspace_id = wid and wm.user_id = auth.uid()),
    'viewer'
  );
$$;

create or replace function can_manage_workspace(wid uuid)
returns boolean language sql stable security definer as $$
  select workspace_role_of(wid) in ('owner','admin','instructor');
$$;

create or replace function can_access_course(cid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from courses c
    where c.id = cid and (
      -- creators in workspace
      can_manage_workspace(c.workspace_id)
      or
      -- published & public/unlisted
      (c.status::text = 'published' and c.visibility::text in ('public','unlisted'))
      or
      -- enrolled
      exists (
        select 1 from enrollments e
        where e.course_id = c.id
          and e.user_id = auth.uid()
          and (e.expires_at is null or e.expires_at > now())
      )
    )
  );
$$;

-- =============
-- TABLES (create only if not exists)
-- =============

-- Workspaces already created in 0015, skip if exists
-- But ensure columns are correct
alter table if exists public.workspaces 
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Workspace members - add role column if missing
alter table if exists public.workspace_members 
  add column if not exists role text not null default 'viewer';

-- Course prices - ensure table exists with correct structure  
create table if not exists public.course_prices (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  currency text not null default 'usd',
  price_cents int not null default 0,
  stripe_product_id text,
  stripe_price_id text,
  purchase_type text not null default 'one_time',
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Drop and recreate lesson_media with correct structure
drop table if exists public.lesson_media cascade;
create table public.lesson_media (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  source text not null default 'mux',
  provider text not null default 'mux',
  source_url text,
  asset_id text,
  upload_id text,
  playback_id text,
  status text not null default 'empty',
  duration_seconds int,
  thumbnail_url text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Lesson files - ensure correct structure
drop table if exists public.lesson_files cascade;
create table public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_kind text not null default 'attachment',
  storage_bucket text not null default 'course-assets',
  storage_path text not null,
  filename text not null,
  mime text,
  size_bytes bigint,
  url text,
  position int not null default 1000,
  created_at timestamptz not null default now()
);

-- Quiz tables
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question_type text not null default 'multiple_choice',
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  answer jsonb not null default '{}'::jsonb,
  explanation text,
  points int not null default 1,
  position numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric,
  max_score int,
  passed boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  response jsonb not null default '{}'::jsonb,
  correct boolean,
  points_earned int not null default 0
);

-- Lesson progress
create table if not exists public.lesson_progress (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'not_started',
  last_position_seconds int,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (lesson_id, user_id)
);

-- =============
-- INDEXES
-- =============
create index if not exists idx_lesson_media_lesson on public.lesson_media(lesson_id);
create index if not exists idx_lesson_media_status on public.lesson_media(status);
create index if not exists idx_lesson_files_lesson on public.lesson_files(lesson_id);
create index if not exists idx_quiz_questions_lesson on public.quiz_questions(lesson_id);
create index if not exists idx_quiz_attempts_user on public.quiz_attempts(user_id, lesson_id);
create index if not exists idx_lesson_progress_user on public.lesson_progress(user_id);

-- =============
-- UPDATED_AT TRIGGERS
-- =============
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_lesson_media_updated_at on public.lesson_media;
create trigger trg_lesson_media_updated_at before update on public.lesson_media
  for each row execute function set_updated_at();

drop trigger if exists trg_course_prices_updated_at on public.course_prices;
create trigger trg_course_prices_updated_at before update on public.course_prices
  for each row execute function set_updated_at();

-- =============
-- RLS POLICIES
-- =============
alter table public.lesson_media enable row level security;
alter table public.lesson_files enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.course_prices enable row level security;

-- Lesson media policies
drop policy if exists "lesson_media_read" on public.lesson_media;
create policy "lesson_media_read" on public.lesson_media for select using (true);

drop policy if exists "lesson_media_write" on public.lesson_media;
create policy "lesson_media_write" on public.lesson_media for all using (true);

-- Lesson files policies  
drop policy if exists "lesson_files_read" on public.lesson_files;
create policy "lesson_files_read" on public.lesson_files for select using (true);

drop policy if exists "lesson_files_write" on public.lesson_files;
create policy "lesson_files_write" on public.lesson_files for all using (true);

-- Quiz policies
drop policy if exists "quiz_questions_read" on public.quiz_questions;
create policy "quiz_questions_read" on public.quiz_questions for select using (true);

drop policy if exists "quiz_attempts_self" on public.quiz_attempts;
create policy "quiz_attempts_self" on public.quiz_attempts for all 
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "quiz_answers_self" on public.quiz_answers;
create policy "quiz_answers_self" on public.quiz_answers for all using (
  exists (select 1 from public.quiz_attempts qa where qa.id = attempt_id and qa.user_id = auth.uid())
);

-- Progress policies
drop policy if exists "progress_self" on public.lesson_progress;
create policy "progress_self" on public.lesson_progress for all 
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Course prices policies
drop policy if exists "course_prices_read" on public.course_prices;
create policy "course_prices_read" on public.course_prices for select using (is_active = true);

drop policy if exists "course_prices_write" on public.course_prices;
create policy "course_prices_write" on public.course_prices for all using (true);

-- =============
-- DRIP ACCESS FUNCTION
-- =============
create or replace function public.lesson_unlocked_at(p_lesson_id uuid, p_user_id uuid)
returns timestamptz language plpgsql stable security definer as $$
declare
  v_lesson record;
  v_enrollment record;
begin
  select l.drip_type::text, l.drip_value, ch.course_id
  into v_lesson
  from public.lessons l
  join public.chapters ch on ch.id = l.chapter_id
  where l.id = p_lesson_id;

  if not found then return null; end if;
  if v_lesson.drip_type = 'immediate' then return now(); end if;

  select purchased_at into v_enrollment
  from public.enrollments
  where course_id = v_lesson.course_id and user_id = p_user_id and status = 'active';

  if not found then return null; end if;

  case v_lesson.drip_type
    when 'date' then
      return (v_lesson.drip_value->>'date')::timestamptz;
    when 'days_after_enroll' then
      return v_enrollment.purchased_at + ((v_lesson.drip_value->>'days')::int || ' days')::interval;
    else
      return now();
  end case;
end;
$$;

create or replace function public.can_access_lesson(p_lesson_id uuid, p_user_id uuid)
returns boolean language sql stable security definer as $$
  select coalesce(lesson_unlocked_at(p_lesson_id, p_user_id) <= now(), false);
$$;
