-- Notifications System
-- Provides in-app notifications for various user actions and events

-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- comment|reply|announcement|course_update|admin_message|certificate
  title text not null,
  message text not null,
  link text, -- optional link to related resource
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb, -- additional context data
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Create index for efficient queries
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read) where is_read = false;

-- Create notification_preferences table
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  email_on_comment boolean not null default true,
  email_on_reply boolean not null default true,
  email_on_announcement boolean not null default true,
  email_on_course_update boolean not null default true,
  in_app_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

-- RLS Policies for notifications
-- Users can only read their own notifications
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

-- Users can only update their own notifications (for marking as read)
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- Only system/admins can create notifications (will be done via service key or admin role check)
create policy "notifications_insert_admin" on public.notifications
  for insert with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- RLS Policies for notification_preferences
-- Users can read their own preferences
create policy "notification_preferences_select_own" on public.notification_preferences
  for select using (auth.uid() = user_id);

-- Users can update their own preferences
create policy "notification_preferences_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id);

-- Users can insert their own preferences
create policy "notification_preferences_insert_own" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

-- Function to get unread notification count for a user
create or replace function get_unread_notification_count(p_user_id uuid)
returns bigint
language sql
security definer
as $$
  select count(*)
  from public.notifications
  where user_id = p_user_id
  and is_read = false;
$$;

-- Function to mark notification as read
create or replace function mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.notifications
  set is_read = true, read_at = now()
  where id = p_notification_id
  and user_id = auth.uid();
end;
$$;

-- Function to mark all notifications as read for a user
create or replace function mark_all_notifications_read()
returns void
language plpgsql
security definer
as $$
begin
  update public.notifications
  set is_read = true, read_at = now()
  where user_id = auth.uid()
  and is_read = false;
end;
$$;

-- Trigger to update notification_preferences updated_at
create or replace function update_notification_preferences_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function update_notification_preferences_timestamp();
