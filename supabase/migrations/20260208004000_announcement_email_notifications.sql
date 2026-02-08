-- Announcement Email Notifications (feat-080)
-- Adds email notification functionality to announcements

-- Add email notification columns to announcements table
alter table public.announcements add column if not exists send_email boolean not null default false;
alter table public.announcements add column if not exists email_sent_at timestamptz;
alter table public.announcements add column if not exists email_recipients_count int default 0;

-- Email unsubscribe tracking table
create table if not exists public.email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  unsubscribe_type text not null default 'all', -- all|announcements|replies|marketing
  space_id uuid references public.community_spaces(id) on delete cascade,
  unsubscribed_at timestamptz not null default now(),

  -- Validation
  constraint valid_unsubscribe_type check (unsubscribe_type in ('all', 'announcements', 'replies', 'marketing', 'transactional')),
  constraint unique_user_space_type unique (user_id, space_id, unsubscribe_type)
);

-- Email notification preferences table
create table if not exists public.email_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid references public.community_spaces(id) on delete cascade,
  announcements_enabled boolean not null default true,
  replies_enabled boolean not null default true,
  digest_enabled boolean not null default false,
  digest_frequency text not null default 'weekly', -- daily|weekly|monthly
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Validation
  constraint valid_digest_frequency check (digest_frequency in ('daily', 'weekly', 'monthly')),
  constraint unique_user_space unique (user_id, space_id)
);

-- Enable RLS
alter table public.email_unsubscribes enable row level security;
alter table public.email_preferences enable row level security;

-- RLS Policies for email_unsubscribes

-- Users can view their own unsubscribes
create policy "Users can view own unsubscribes" on public.email_unsubscribes
for select using (user_id = auth.uid() or email = (select email from auth.users where id = auth.uid()));

-- Users can create their own unsubscribes
create policy "Users can create unsubscribes" on public.email_unsubscribes
for insert with check (user_id = auth.uid() or email = (select email from auth.users where id = auth.uid()));

-- Admins can view all unsubscribes
create policy "Admins can view all unsubscribes" on public.email_unsubscribes
for select using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- RLS Policies for email_preferences

-- Users can view their own preferences
create policy "Users can view own preferences" on public.email_preferences
for select using (user_id = auth.uid());

-- Users can create their own preferences
create policy "Users can create own preferences" on public.email_preferences
for insert with check (user_id = auth.uid());

-- Users can update their own preferences
create policy "Users can update own preferences" on public.email_preferences
for update using (user_id = auth.uid());

-- Admins can view all preferences
create policy "Admins can view all preferences" on public.email_preferences
for select using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- Indexes for performance
create index if not exists idx_email_unsubscribes_user_id on public.email_unsubscribes(user_id);
create index if not exists idx_email_unsubscribes_email on public.email_unsubscribes(email);
create index if not exists idx_email_unsubscribes_type on public.email_unsubscribes(unsubscribe_type);
create index if not exists idx_email_preferences_user_id on public.email_preferences(user_id);
create index if not exists idx_email_preferences_space_id on public.email_preferences(space_id);
create index if not exists idx_announcements_send_email on public.announcements(send_email, email_sent_at);

-- Function to check if user has unsubscribed
create or replace function public.is_unsubscribed(
  p_user_id uuid,
  p_email text,
  p_unsubscribe_type text,
  p_space_id uuid default null
)
returns boolean as $$
begin
  return exists (
    select 1 from public.email_unsubscribes
    where (user_id = p_user_id or email = p_email)
    and (unsubscribe_type = p_unsubscribe_type or unsubscribe_type = 'all')
    and (p_space_id is null or space_id = p_space_id or space_id is null)
  );
end;
$$ language plpgsql security definer;

-- Function to get email recipients for announcement
create or replace function public.get_announcement_email_recipients(p_announcement_id uuid)
returns table (
  user_id uuid,
  email text,
  name text
) as $$
declare
  v_space_id uuid;
begin
  -- Get the space_id for this announcement
  select space_id into v_space_id
  from public.announcements
  where id = p_announcement_id;

  if v_space_id is null then
    return;
  end if;

  -- Return all community members who:
  -- 1. Are members of the space
  -- 2. Are not banned
  -- 3. Have not unsubscribed from announcements
  -- 4. Have announcements enabled in preferences (or no preference set)
  return query
  select distinct
    cm.user_id,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as name
  from public.community_members cm
  join auth.users u on u.id = cm.user_id
  where cm.space_id = v_space_id
  and cm.is_banned = false
  and u.email is not null
  -- Check not unsubscribed
  and not exists (
    select 1 from public.email_unsubscribes eu
    where (eu.user_id = cm.user_id or eu.email = u.email)
    and (eu.unsubscribe_type = 'announcements' or eu.unsubscribe_type = 'all')
    and (eu.space_id = v_space_id or eu.space_id is null)
  )
  -- Check preferences (default to enabled if no preference)
  and (
    not exists (
      select 1 from public.email_preferences ep
      where ep.user_id = cm.user_id
      and ep.space_id = v_space_id
    )
    or exists (
      select 1 from public.email_preferences ep
      where ep.user_id = cm.user_id
      and ep.space_id = v_space_id
      and ep.announcements_enabled = true
    )
  );
end;
$$ language plpgsql security definer;

-- Function to update updated_at timestamp
create or replace function public.handle_email_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for email_preferences updated_at
drop trigger if exists email_preferences_updated_at on public.email_preferences;
create trigger email_preferences_updated_at
  before update on public.email_preferences
  for each row
  execute function public.handle_email_preferences_updated_at();

-- Comments for documentation
comment on table public.email_unsubscribes is 'Tracks users who have unsubscribed from various email types';
comment on table public.email_preferences is 'User preferences for email notifications per space';
comment on column public.announcements.send_email is 'Whether to send email notifications for this announcement';
comment on column public.announcements.email_sent_at is 'Timestamp when emails were sent';
comment on column public.announcements.email_recipients_count is 'Number of emails sent';
