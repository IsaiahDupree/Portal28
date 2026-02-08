-- Student Groups/Cohorts (feat-232)
-- Allows organizing students into groups for bulk enrollment and analytics

-- Student Groups table
create table if not exists public.student_groups (
  id uuid primary key default gen_random_uuid(),

  -- Basic info
  name text not null,
  description text,
  slug text unique not null,

  -- Association
  course_id uuid references public.courses(id) on delete cascade,
  created_by uuid references public.users(id),

  -- Settings
  is_active boolean default true,
  auto_enroll boolean default false, -- Automatically enroll members in course

  -- Dates
  start_date timestamptz,
  end_date timestamptz,

  -- Stats (cached)
  member_count integer default 0,
  active_member_count integer default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Group Members table
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),

  group_id uuid not null references public.student_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,

  -- Enrollment
  enrolled_by uuid references public.users(id), -- Admin who enrolled them
  enrolled_at timestamptz not null default now(),

  -- Status
  is_active boolean default true,
  removed_at timestamptz,

  -- Stats (denormalized for faster queries)
  course_progress_percentage integer default 0,
  lessons_completed integer default 0,
  last_active_at timestamptz,

  created_at timestamptz not null default now(),

  -- Ensure unique membership
  unique(group_id, user_id)
);

-- Group Activity Log
create table if not exists public.group_activity_log (
  id uuid primary key default gen_random_uuid(),

  group_id uuid not null references public.student_groups(id) on delete cascade,

  -- Activity details
  action text not null, -- 'member_added', 'member_removed', 'access_granted', 'access_revoked', 'email_sent'
  actor_id uuid references public.users(id),
  target_user_id uuid references public.users(id),

  -- Metadata
  details jsonb default '{}',

  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.student_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_activity_log enable row level security;

-- RLS Policies - Admin only access

-- student_groups
create policy "Admins can manage groups" on public.student_groups
for all using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- group_members
create policy "Admins can manage group members" on public.group_members
for all using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- Users can view their own group memberships
create policy "Users can view own group memberships" on public.group_members
for select using (user_id = auth.uid());

-- group_activity_log
create policy "Admins can view group activity" on public.group_activity_log
for select using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- Indexes for performance
create index if not exists idx_student_groups_course on public.student_groups(course_id);
create index if not exists idx_student_groups_slug on public.student_groups(slug);
create index if not exists idx_student_groups_active on public.student_groups(is_active);

create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_active on public.group_members(is_active);

create index if not exists idx_group_activity_group on public.group_activity_log(group_id);
create index if not exists idx_group_activity_created on public.group_activity_log(created_at);

-- Auto-update updated_at triggers
create trigger student_groups_updated_at
  before update on public.student_groups
  for each row
  execute function update_updated_at_column();

-- Function to update group member count
create or replace function public.update_group_member_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.student_groups
    set member_count = member_count + 1,
        active_member_count = active_member_count + case when NEW.is_active then 1 else 0 end
    where id = NEW.group_id;
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    if OLD.is_active != NEW.is_active then
      update public.student_groups
      set active_member_count = active_member_count + case when NEW.is_active then 1 else -1 end
      where id = NEW.group_id;
    end if;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.student_groups
    set member_count = member_count - 1,
        active_member_count = active_member_count - case when OLD.is_active then 1 else 0 end
    where id = OLD.group_id;
    return OLD;
  end if;
end;
$$ language plpgsql;

-- Trigger to update member count
create trigger update_group_member_count_trigger
  after insert or update or delete on public.group_members
  for each row
  execute function public.update_group_member_count();

-- Function to bulk enroll users in a group
create or replace function public.bulk_enroll_in_group(
  p_group_id uuid,
  p_user_ids uuid[],
  p_enrolled_by uuid
)
returns table (
  enrolled_count integer,
  already_enrolled_count integer
) as $$
declare
  v_enrolled integer := 0;
  v_already_enrolled integer := 0;
  v_user_id uuid;
begin
  foreach v_user_id in array p_user_ids
  loop
    -- Try to insert, if conflict then it's already enrolled
    begin
      insert into public.group_members (group_id, user_id, enrolled_by)
      values (p_group_id, v_user_id, p_enrolled_by);
      v_enrolled := v_enrolled + 1;
    exception when unique_violation then
      v_already_enrolled := v_already_enrolled + 1;
    end;
  end loop;

  return query select v_enrolled, v_already_enrolled;
end;
$$ language plpgsql security definer;

-- Function to get group analytics
create or replace function public.get_group_analytics(p_group_id uuid)
returns jsonb as $$
declare
  v_result jsonb;
  v_course_id uuid;
begin
  -- Get the course_id for this group
  select course_id into v_course_id
  from public.student_groups
  where id = p_group_id;

  select jsonb_build_object(
    'total_members', count(distinct gm.user_id),
    'active_members', count(distinct case when gm.is_active then gm.user_id end),
    'avg_progress', coalesce(avg(gm.course_progress_percentage), 0),
    'total_lessons_completed', coalesce(sum(gm.lessons_completed), 0),
    'members_completed', count(distinct case when gm.course_progress_percentage >= 100 then gm.user_id end),
    'completion_rate', case
      when count(distinct gm.user_id) > 0
      then (count(distinct case when gm.course_progress_percentage >= 100 then gm.user_id end)::numeric / count(distinct gm.user_id) * 100)
      else 0
    end,
    'avg_lessons_per_member', case
      when count(distinct gm.user_id) > 0
      then coalesce(sum(gm.lessons_completed)::numeric / count(distinct gm.user_id), 0)
      else 0
    end,
    'last_active', max(gm.last_active_at)
  ) into v_result
  from public.group_members gm
  where gm.group_id = p_group_id;

  return v_result;
end;
$$ language plpgsql stable security definer;

-- Function to grant course access to all group members
create or replace function public.grant_group_access_to_course(
  p_group_id uuid,
  p_course_id uuid,
  p_granted_by uuid
)
returns integer as $$
declare
  v_count integer := 0;
  v_member record;
begin
  for v_member in
    select user_id
    from public.group_members
    where group_id = p_group_id
    and is_active = true
  loop
    -- Create entitlement if it doesn't exist
    insert into public.entitlements (user_id, course_id, created_by)
    values (v_member.user_id, p_course_id, p_granted_by)
    on conflict (user_id, course_id) do nothing;

    v_count := v_count + 1;
  end loop;

  -- Log activity
  insert into public.group_activity_log (group_id, action, actor_id, details)
  values (p_group_id, 'access_granted', p_granted_by, jsonb_build_object('course_id', p_course_id, 'count', v_count));

  return v_count;
end;
$$ language plpgsql security definer;

-- Function to generate unique slug
create or replace function public.generate_group_slug(p_name text)
returns text as $$
declare
  v_slug text;
  v_counter integer := 0;
begin
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);

  -- Check if slug exists, if so append number
  while exists (select 1 from public.student_groups where slug = v_slug) loop
    v_counter := v_counter + 1;
    v_slug := v_slug || '-' || v_counter::text;
  end loop;

  return v_slug;
end;
$$ language plpgsql;

-- Comments for documentation
comment on table public.student_groups is 'Student groups/cohorts for organizing students';
comment on table public.group_members is 'Members of student groups';
comment on table public.group_activity_log is 'Activity log for group actions';
comment on function public.bulk_enroll_in_group is 'Bulk enroll users into a group';
comment on function public.get_group_analytics is 'Get analytics for a specific group';
comment on function public.grant_group_access_to_course is 'Grant course access to all active group members';
