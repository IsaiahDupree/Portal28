-- Events Calendar System (feat-073)
-- Enables creation of events, calendar display, event registration, and email reminders

-- Events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'webinar', -- webinar|workshop|meeting|livestream|other
  location text, -- URL for virtual events or address for physical
  location_type text not null default 'virtual', -- virtual|physical|hybrid
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null default 'America/New_York',
  max_attendees int, -- null = unlimited
  current_attendees int not null default 0,
  status text not null default 'scheduled', -- scheduled|live|completed|cancelled
  is_published boolean not null default false,
  registration_required boolean not null default true,
  reminder_sent boolean not null default false,
  reminder_hours_before int not null default 24, -- hours before event to send reminder
  cover_image_url text,
  metadata jsonb default '{}'::jsonb, -- for extensibility
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Validation
  constraint valid_times check (end_time > start_time),
  constraint valid_max_attendees check (max_attendees is null or max_attendees > 0),
  constraint valid_status check (status in ('scheduled', 'live', 'completed', 'cancelled'))
);

-- Event registrations table
create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'registered', -- registered|attended|no_show|cancelled
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  reminder_sent_at timestamptz,
  check_in_time timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Unique constraint: one registration per user per event
  unique(event_id, user_id),

  -- Validation
  constraint valid_status check (status in ('registered', 'attended', 'no_show', 'cancelled'))
);

-- Event comments table (for Q&A, discussion)
create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.event_comments(id) on delete cascade, -- for replies
  content text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_events_creator_id on public.events(creator_id);
create index if not exists idx_events_start_time on public.events(start_time);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_events_published on public.events(is_published) where is_published = true;
create index if not exists idx_event_registrations_event_id on public.event_registrations(event_id);
create index if not exists idx_event_registrations_user_id on public.event_registrations(user_id);
create index if not exists idx_event_registrations_status on public.event_registrations(status);
create index if not exists idx_event_comments_event_id on public.event_comments(event_id);
create index if not exists idx_event_comments_parent_id on public.event_comments(parent_id);

-- RLS Policies

-- Events: Anyone can view published events
alter table public.events enable row level security;

create policy "Anyone can view published events"
  on public.events for select
  using (is_published = true);

create policy "Creators can view their own events"
  on public.events for select
  using (auth.uid() = creator_id);

create policy "Admin users can view all events"
  on public.events for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

create policy "Admin users can create events"
  on public.events for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

create policy "Creators can update their own events"
  on public.events for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy "Creators can delete their own events"
  on public.events for delete
  using (auth.uid() = creator_id);

-- Event Registrations: Users can see their own registrations
alter table public.event_registrations enable row level security;

create policy "Users can view their own registrations"
  on public.event_registrations for select
  using (auth.uid() = user_id);

create policy "Event creators can view registrations for their events"
  on public.event_registrations for select
  using (
    exists (
      select 1 from public.events
      where events.id = event_registrations.event_id
      and events.creator_id = auth.uid()
    )
  );

create policy "Users can register for events"
  on public.event_registrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own registrations"
  on public.event_registrations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can cancel their own registrations"
  on public.event_registrations for delete
  using (auth.uid() = user_id);

-- Event Comments: Users can view comments on published events
alter table public.event_comments enable row level security;

create policy "Users can view comments on published events"
  on public.event_comments for select
  using (
    exists (
      select 1 from public.events
      where events.id = event_comments.event_id
      and events.is_published = true
    )
  );

create policy "Authenticated users can create comments"
  on public.event_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own comments"
  on public.event_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.event_comments for delete
  using (auth.uid() = user_id);

-- Function: Increment/decrement attendee count
create or replace function public.update_event_attendee_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'registered' then
    update public.events
    set current_attendees = current_attendees + 1
    where id = NEW.event_id;
  elsif TG_OP = 'UPDATE' then
    if OLD.status = 'registered' and NEW.status != 'registered' then
      update public.events
      set current_attendees = greatest(0, current_attendees - 1)
      where id = NEW.event_id;
    elsif OLD.status != 'registered' and NEW.status = 'registered' then
      update public.events
      set current_attendees = current_attendees + 1
      where id = NEW.event_id;
    end if;
  elsif TG_OP = 'DELETE' and OLD.status = 'registered' then
    update public.events
    set current_attendees = greatest(0, current_attendees - 1)
    where id = OLD.event_id;
  end if;

  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

-- Trigger: Update attendee count on registration changes
create trigger update_event_attendee_count_trigger
  after insert or update or delete on public.event_registrations
  for each row
  execute function public.update_event_attendee_count();

-- Function: Validate event capacity before registration
create or replace function public.check_event_capacity()
returns trigger as $$
declare
  v_max_attendees int;
  v_current_attendees int;
begin
  select max_attendees, current_attendees
  into v_max_attendees, v_current_attendees
  from public.events
  where id = NEW.event_id;

  if v_max_attendees is not null and v_current_attendees >= v_max_attendees then
    raise exception 'Event is at full capacity';
  end if;

  return NEW;
end;
$$ language plpgsql;

-- Trigger: Check capacity before registration
create trigger check_event_capacity_trigger
  before insert on public.event_registrations
  for each row
  when (NEW.status = 'registered')
  execute function public.check_event_capacity();

-- Function: Get upcoming events (for calendar views)
create or replace function public.get_upcoming_events(days_ahead int default 30)
returns table (
  id uuid,
  title text,
  description text,
  event_type text,
  location text,
  location_type text,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  max_attendees int,
  current_attendees int,
  status text,
  cover_image_url text,
  is_registered boolean
) as $$
begin
  return query
  select
    e.id,
    e.title,
    e.description,
    e.event_type,
    e.location,
    e.location_type,
    e.start_time,
    e.end_time,
    e.timezone,
    e.max_attendees,
    e.current_attendees,
    e.status,
    e.cover_image_url,
    exists(
      select 1 from public.event_registrations er
      where er.event_id = e.id
      and er.user_id = auth.uid()
      and er.status = 'registered'
    ) as is_registered
  from public.events e
  where e.is_published = true
  and e.status != 'cancelled'
  and e.start_time >= now()
  and e.start_time <= now() + (days_ahead || ' days')::interval
  order by e.start_time asc;
end;
$$ language plpgsql security definer;

-- Function: Get events needing reminders
create or replace function public.get_events_needing_reminders()
returns table (
  event_id uuid,
  event_title text,
  event_start_time timestamptz,
  user_id uuid,
  user_email text,
  reminder_hours_before int
) as $$
begin
  return query
  select
    e.id as event_id,
    e.title as event_title,
    e.start_time as event_start_time,
    u.id as user_id,
    u.email as user_email,
    e.reminder_hours_before
  from public.events e
  join public.event_registrations er on er.event_id = e.id
  join auth.users u on u.id = er.user_id
  where e.status = 'scheduled'
  and e.is_published = true
  and er.status = 'registered'
  and er.reminder_sent_at is null
  and e.start_time <= now() + (e.reminder_hours_before || ' hours')::interval
  and e.start_time > now();
end;
$$ language plpgsql security definer;

-- Updated_at triggers
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger update_events_updated_at
  before update on public.events
  for each row
  execute function public.update_updated_at_column();

create trigger update_event_registrations_updated_at
  before update on public.event_registrations
  for each row
  execute function public.update_updated_at_column();

create trigger update_event_comments_updated_at
  before update on public.event_comments
  for each row
  execute function public.update_updated_at_column();
