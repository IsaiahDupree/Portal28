-- Lesson Bookmarks (private to user)
-- Feature: feat-223 (Bookmarking & Notes)
-- Users can bookmark lessons for quick access later

create table if not exists public.lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

-- Indexes for performance
create index if not exists idx_lesson_bookmarks_user on public.lesson_bookmarks(user_id);
create index if not exists idx_lesson_bookmarks_lesson on public.lesson_bookmarks(lesson_id);
create index if not exists idx_lesson_bookmarks_created on public.lesson_bookmarks(created_at desc);

-- RLS Policies for lesson_bookmarks
alter table public.lesson_bookmarks enable row level security;

drop policy if exists "Users can view own bookmarks" on public.lesson_bookmarks;
create policy "Users can view own bookmarks" on public.lesson_bookmarks
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own bookmarks" on public.lesson_bookmarks;
create policy "Users can insert own bookmarks" on public.lesson_bookmarks
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own bookmarks" on public.lesson_bookmarks;
create policy "Users can delete own bookmarks" on public.lesson_bookmarks
  for delete using (auth.uid() = user_id);

-- Admin can view all bookmarks (for analytics)
drop policy if exists "Admins can view all bookmarks" on public.lesson_bookmarks;
create policy "Admins can view all bookmarks" on public.lesson_bookmarks
  for select using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
