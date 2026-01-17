-- Add nested reply support to lesson comments
-- Migration: 20260114_lesson_comment_replies.sql

-- Add parent_comment_id column for nested replies
alter table public.lesson_comments
  add column if not exists parent_comment_id uuid references public.lesson_comments(id) on delete cascade;

-- Add reply_count for efficient aggregation
alter table public.lesson_comments
  add column if not exists reply_count int not null default 0;

-- Add index for parent-child relationship queries
create index if not exists idx_lesson_comments_parent on public.lesson_comments(parent_comment_id);

-- Function to update reply count when a reply is added
create or replace function update_comment_reply_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.parent_comment_id is not null then
    update public.lesson_comments
    set reply_count = reply_count + 1
    where id = NEW.parent_comment_id;
  elsif TG_OP = 'DELETE' and OLD.parent_comment_id is not null then
    update public.lesson_comments
    set reply_count = reply_count - 1
    where id = OLD.parent_comment_id;
  end if;
  return null;
end;
$$ language plpgsql;

-- Trigger to automatically update reply counts
drop trigger if exists update_reply_count_trigger on public.lesson_comments;
create trigger update_reply_count_trigger
  after insert or delete on public.lesson_comments
  for each row
  execute function update_comment_reply_count();

-- Add admin delete policy for moderation
drop policy if exists "Admins can delete any comment" on public.lesson_comments;
create policy "Admins can delete any comment" on public.lesson_comments
  for delete using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
