-- Lesson Notes (private to user, visible to admin)
create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

-- Lesson Comments (public)
create table if not exists public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comment Likes
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.lesson_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(comment_id, user_id)
);

-- Indexes for performance
create index if not exists idx_lesson_notes_user_lesson on public.lesson_notes(user_id, lesson_id);
create index if not exists idx_lesson_comments_lesson on public.lesson_comments(lesson_id);
create index if not exists idx_comment_likes_comment on public.comment_likes(comment_id);

-- RLS Policies for lesson_notes
alter table public.lesson_notes enable row level security;

drop policy if exists "Users can view own notes" on public.lesson_notes;
create policy "Users can view own notes" on public.lesson_notes
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own notes" on public.lesson_notes;
create policy "Users can insert own notes" on public.lesson_notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own notes" on public.lesson_notes;
create policy "Users can update own notes" on public.lesson_notes
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own notes" on public.lesson_notes;
create policy "Users can delete own notes" on public.lesson_notes
  for delete using (auth.uid() = user_id);

-- Admin can view all notes
drop policy if exists "Admins can view all notes" on public.lesson_notes;
create policy "Admins can view all notes" on public.lesson_notes
  for select using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for lesson_comments
alter table public.lesson_comments enable row level security;

drop policy if exists "Anyone can view comments" on public.lesson_comments;
create policy "Anyone can view comments" on public.lesson_comments
  for select using (true);

drop policy if exists "Users can insert comments" on public.lesson_comments;
create policy "Users can insert comments" on public.lesson_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own comments" on public.lesson_comments;
create policy "Users can update own comments" on public.lesson_comments
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.lesson_comments;
create policy "Users can delete own comments" on public.lesson_comments
  for delete using (auth.uid() = user_id);

-- RLS Policies for comment_likes
alter table public.comment_likes enable row level security;

drop policy if exists "Anyone can view likes" on public.comment_likes;
create policy "Anyone can view likes" on public.comment_likes
  for select using (true);

drop policy if exists "Users can insert likes" on public.comment_likes;
create policy "Users can insert likes" on public.comment_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own likes" on public.comment_likes;
create policy "Users can delete own likes" on public.comment_likes
  for delete using (auth.uid() = user_id);
