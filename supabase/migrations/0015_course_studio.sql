-- =============================================
-- Course Studio Data Model
-- Supports: Multi-tenant workspaces, courses, chapters, lessons,
-- media processing, quizzes, drip rules, and progress tracking
-- =============================================

-- Workspaces (multi-tenant support)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  logo_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'instructor', 'support')),
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

-- Update courses table to support studio features
alter table public.courses add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.courses add column if not exists hero_image_url text;
alter table public.courses add column if not exists visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public'));
alter table public.courses add column if not exists created_by uuid references auth.users(id);
alter table public.courses add column if not exists settings jsonb not null default '{}'::jsonb;

-- Chapters (ordered groups within courses)
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 1000,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chapters_course_position on public.chapters(course_id, position);

-- Update lessons table with studio features
alter table public.lessons add column if not exists chapter_id uuid references public.chapters(id) on delete cascade;
alter table public.lessons add column if not exists lesson_type text not null default 'multimedia' check (lesson_type in ('multimedia', 'pdf', 'quiz', 'text'));
alter table public.lessons add column if not exists position integer not null default 1000;
alter table public.lessons add column if not exists drip_type text not null default 'immediate' check (drip_type in ('immediate', 'date', 'days_after_enroll'));
alter table public.lessons add column if not exists drip_value text; -- timestamp for date, integer for days
alter table public.lessons add column if not exists content_doc jsonb not null default '{}'::jsonb;
alter table public.lessons add column if not exists is_published boolean not null default true;
alter table public.lessons add column if not exists is_preview boolean not null default false;
alter table public.lessons add column if not exists duration_minutes integer;

create index if not exists idx_lessons_chapter_position on public.lessons(chapter_id, position);

-- Lesson media (video, embeds with processing status)
create table if not exists public.lesson_media (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  media_kind text not null check (media_kind in ('video', 'audio', 'image')),
  source text not null check (source in ('upload', 'embed')),
  provider text check (provider in ('mux', 'cloudflare', 'youtube', 'vimeo', 'loom', 'wistia', 'bunny')),
  source_url text,
  asset_id text,
  playback_id text,
  playback_url text,
  status text not null default 'empty' check (status in ('empty', 'uploading', 'processing', 'ready', 'failed')),
  duration_seconds integer,
  thumbnail_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lesson_media_lesson on public.lesson_media(lesson_id);
create index if not exists idx_lesson_media_status on public.lesson_media(status);

-- Lesson files (attachments, PDFs)
create table if not exists public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_kind text not null check (file_kind in ('attachment', 'pdf', 'document', 'image', 'other')),
  storage_key text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  url text not null,
  position integer not null default 1000,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_files_lesson on public.lesson_files(lesson_id);

-- Quiz questions
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'short_answer', 'matching')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  answer jsonb not null default '{}'::jsonb,
  explanation text,
  points integer not null default 1,
  position integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quiz_questions_lesson on public.quiz_questions(lesson_id, position);

-- Quiz attempts
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score decimal(5,2),
  max_score integer,
  passed boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists idx_quiz_attempts_user_lesson on public.quiz_attempts(user_id, lesson_id);

-- Quiz answers
create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean,
  points_earned integer not null default 0
);

-- Course pricing (Stripe integration)
create table if not exists public.course_prices (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  stripe_product_id text,
  stripe_price_id text,
  price_cents integer not null,
  currency text not null default 'usd',
  purchase_type text not null check (purchase_type in ('one_time', 'subscription')),
  interval text check (interval in ('month', 'year')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_prices_course on public.course_prices(course_id);

-- Enrollments (replaces/extends orders for course access)
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'stripe' check (source in ('stripe', 'manual', 'gift', 'membership', 'free')),
  order_id uuid references public.orders(id),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'refunded', 'cancelled')),
  unique(course_id, user_id)
);

create index if not exists idx_enrollments_user on public.enrollments(user_id);
create index if not exists idx_enrollments_course on public.enrollments(course_id);

-- Preview tokens (for sharing drafts)
create table if not exists public.preview_tokens (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_preview_tokens_token on public.preview_tokens(token);

-- =============================================
-- RLS Policies
-- =============================================

-- Workspaces
alter table public.workspaces enable row level security;

drop policy if exists "Users can view workspaces they belong to" on public.workspaces;
create policy "Users can view workspaces they belong to" on public.workspaces
  for select using (
    owner_user_id = auth.uid() or
    exists (select 1 from public.workspace_members where workspace_id = id and user_id = auth.uid())
  );

drop policy if exists "Owners can update their workspaces" on public.workspaces;
create policy "Owners can update their workspaces" on public.workspaces
  for update using (owner_user_id = auth.uid());

drop policy if exists "Users can create workspaces" on public.workspaces;
create policy "Users can create workspaces" on public.workspaces
  for insert with check (owner_user_id = auth.uid());

-- Workspace members
alter table public.workspace_members enable row level security;

drop policy if exists "Members can view workspace members" on public.workspace_members;
create policy "Members can view workspace members" on public.workspace_members
  for select using (
    exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid())
  );

-- Chapters
alter table public.chapters enable row level security;

drop policy if exists "Anyone can view published chapters" on public.chapters;
create policy "Anyone can view published chapters" on public.chapters
  for select using (is_published = true);

drop policy if exists "Instructors can manage chapters" on public.chapters;
create policy "Instructors can manage chapters" on public.chapters
  for all using (
    exists (
      select 1 from public.courses c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where c.id = course_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin', 'instructor')
    )
  );

-- Lesson media
alter table public.lesson_media enable row level security;

drop policy if exists "Anyone can view ready media" on public.lesson_media;
create policy "Anyone can view ready media" on public.lesson_media
  for select using (status = 'ready');

drop policy if exists "Instructors can manage media" on public.lesson_media;
create policy "Instructors can manage media" on public.lesson_media
  for all using (
    exists (
      select 1 from public.lessons l
      join public.chapters ch on ch.id = l.chapter_id
      join public.courses c on c.id = ch.course_id
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where l.id = lesson_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin', 'instructor')
    )
  );

-- Lesson files
alter table public.lesson_files enable row level security;

drop policy if exists "Anyone can view lesson files" on public.lesson_files;
create policy "Anyone can view lesson files" on public.lesson_files
  for select using (true);

drop policy if exists "Instructors can manage files" on public.lesson_files;
create policy "Instructors can manage files" on public.lesson_files
  for all using (
    exists (
      select 1 from public.lessons l
      join public.chapters ch on ch.id = l.chapter_id
      join public.courses c on c.id = ch.course_id
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where l.id = lesson_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin', 'instructor')
    )
  );

-- Quiz questions
alter table public.quiz_questions enable row level security;

drop policy if exists "Anyone can view quiz questions" on public.quiz_questions;
create policy "Anyone can view quiz questions" on public.quiz_questions
  for select using (true);

-- Quiz attempts
alter table public.quiz_attempts enable row level security;

drop policy if exists "Users can view own attempts" on public.quiz_attempts;
create policy "Users can view own attempts" on public.quiz_attempts
  for select using (user_id = auth.uid());

drop policy if exists "Users can create attempts" on public.quiz_attempts;
create policy "Users can create attempts" on public.quiz_attempts
  for insert with check (user_id = auth.uid());

-- Quiz answers
alter table public.quiz_answers enable row level security;

drop policy if exists "Users can view own answers" on public.quiz_answers;
create policy "Users can view own answers" on public.quiz_answers
  for select using (
    exists (select 1 from public.quiz_attempts qa where qa.id = attempt_id and qa.user_id = auth.uid())
  );

-- Course prices
alter table public.course_prices enable row level security;

drop policy if exists "Anyone can view active prices" on public.course_prices;
create policy "Anyone can view active prices" on public.course_prices
  for select using (is_active = true);

-- Enrollments
alter table public.enrollments enable row level security;

drop policy if exists "Users can view own enrollments" on public.enrollments;
create policy "Users can view own enrollments" on public.enrollments
  for select using (user_id = auth.uid());

drop policy if exists "Admins can view all enrollments" on public.enrollments;
create policy "Admins can view all enrollments" on public.enrollments
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Preview tokens
alter table public.preview_tokens enable row level security;

drop policy if exists "Creators can manage preview tokens" on public.preview_tokens;
create policy "Creators can manage preview tokens" on public.preview_tokens
  for all using (created_by = auth.uid());

-- =============================================
-- Helper Functions
-- =============================================

-- Check if user has access to a lesson (enrolled + drip unlocked)
create or replace function public.can_access_lesson(p_lesson_id uuid, p_user_id uuid)
returns boolean as $$
declare
  v_lesson record;
  v_enrollment record;
  v_unlocked_at timestamptz;
begin
  -- Get lesson info
  select l.*, ch.course_id
  into v_lesson
  from public.lessons l
  join public.chapters ch on ch.id = l.chapter_id
  where l.id = p_lesson_id;

  if not found then
    return false;
  end if;

  -- Check if preview lesson
  if v_lesson.is_preview then
    return true;
  end if;

  -- Get enrollment
  select * into v_enrollment
  from public.enrollments
  where course_id = v_lesson.course_id
    and user_id = p_user_id
    and status = 'active'
    and (expires_at is null or expires_at > now());

  if not found then
    return false;
  end if;

  -- Check drip rules
  case v_lesson.drip_type
    when 'immediate' then
      return true;
    when 'date' then
      v_unlocked_at := v_lesson.drip_value::timestamptz;
      return now() >= v_unlocked_at;
    when 'days_after_enroll' then
      v_unlocked_at := v_enrollment.purchased_at + (v_lesson.drip_value::integer || ' days')::interval;
      return now() >= v_unlocked_at;
    else
      return true;
  end case;
end;
$$ language plpgsql security definer;

-- Get lesson unlock date for a user
create or replace function public.get_lesson_unlock_date(p_lesson_id uuid, p_user_id uuid)
returns timestamptz as $$
declare
  v_lesson record;
  v_enrollment record;
begin
  select l.*, ch.course_id
  into v_lesson
  from public.lessons l
  join public.chapters ch on ch.id = l.chapter_id
  where l.id = p_lesson_id;

  if not found then
    return null;
  end if;

  if v_lesson.is_preview or v_lesson.drip_type = 'immediate' then
    return now();
  end if;

  select * into v_enrollment
  from public.enrollments
  where course_id = v_lesson.course_id
    and user_id = p_user_id
    and status = 'active';

  if not found then
    return null;
  end if;

  case v_lesson.drip_type
    when 'date' then
      return v_lesson.drip_value::timestamptz;
    when 'days_after_enroll' then
      return v_enrollment.purchased_at + (v_lesson.drip_value::integer || ' days')::interval;
    else
      return now();
  end case;
end;
$$ language plpgsql security definer;

-- Auto-create chapter + lesson when course is created via studio
-- Note: This is optional - courses created via old admin/seed don't need chapters
create or replace function public.auto_create_first_chapter()
returns trigger as $$
declare
  v_chapter_id uuid;
begin
  -- Only create chapter if this course was created via studio (has workspace_id or created_by)
  if new.workspace_id is not null or new.created_by is not null then
    -- Create first chapter
    insert into public.chapters (course_id, title, position)
    values (new.id, 'Chapter 1', 1000)
    returning id into v_chapter_id;

    -- Create first lesson
    insert into public.lessons (chapter_id, module_id, title, position, lesson_type)
    values (v_chapter_id, new.id, 'Lesson 1', 1000, 'multimedia');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Only create trigger if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trigger_auto_create_first_chapter') then
    create trigger trigger_auto_create_first_chapter
      after insert on public.courses
      for each row execute function public.auto_create_first_chapter();
  end if;
end $$;
