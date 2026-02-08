-- Coaching Bookings System (feat-074)
-- Enables coaches to set availability, students to book coaching sessions, and automatic confirmations

-- Coaching slots table (coach availability)
create table if not exists public.coaching_slots (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Coaching Session',
  description text,
  duration_minutes int not null default 60, -- session duration
  slot_type text not null default 'one_on_one', -- one_on_one|group|workshop
  max_participants int not null default 1, -- for group sessions
  current_participants int not null default 0,
  price_cents int not null default 0, -- price in cents
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null default 'America/New_York',
  location text, -- URL for video call or physical address
  location_type text not null default 'virtual', -- virtual|physical|hybrid
  status text not null default 'available', -- available|booked|cancelled|completed
  is_published boolean not null default true,
  video_call_url text, -- auto-generated or manual
  video_call_provider text, -- zoom|meet|teams|custom
  reminder_hours_before int not null default 24,
  metadata jsonb default '{}'::jsonb, -- for extensibility
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Validation
  constraint valid_times check (end_time > start_time),
  constraint valid_duration check (duration_minutes > 0 and duration_minutes <= 480),
  constraint valid_max_participants check (max_participants > 0),
  constraint valid_price check (price_cents >= 0),
  constraint valid_status check (status in ('available', 'booked', 'cancelled', 'completed'))
);

-- Coaching bookings table (student bookings)
create table if not exists public.coaching_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.coaching_slots(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- pending|confirmed|cancelled|completed|no_show
  notes text, -- student notes/questions for the coach
  coach_notes text, -- private coach notes
  booking_confirmed_at timestamptz,
  reminder_sent_at timestamptz,
  payment_intent_id text, -- Stripe payment intent if paid
  amount_paid_cents int, -- amount paid in cents
  video_call_url text, -- meeting link
  check_in_time timestamptz, -- when student joined
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Unique constraint: one booking per student per slot
  unique(slot_id, student_id),

  -- Validation
  constraint valid_status check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  constraint valid_amount check (amount_paid_cents is null or amount_paid_cents >= 0)
);

-- Indexes for performance
create index if not exists idx_coaching_slots_coach_id on public.coaching_slots(coach_id);
create index if not exists idx_coaching_slots_start_time on public.coaching_slots(start_time);
create index if not exists idx_coaching_slots_status on public.coaching_slots(status);
create index if not exists idx_coaching_slots_published on public.coaching_slots(is_published) where is_published = true;
create index if not exists idx_coaching_bookings_slot_id on public.coaching_bookings(slot_id);
create index if not exists idx_coaching_bookings_student_id on public.coaching_bookings(student_id);
create index if not exists idx_coaching_bookings_coach_id on public.coaching_bookings(coach_id);
create index if not exists idx_coaching_bookings_status on public.coaching_bookings(status);

-- RLS Policies

-- Coaching Slots: Anyone can view published available slots
alter table public.coaching_slots enable row level security;

create policy "Anyone can view published available slots"
  on public.coaching_slots for select
  using (is_published = true and status = 'available');

create policy "Coaches can view their own slots"
  on public.coaching_slots for select
  using (auth.uid() = coach_id);

create policy "Admin users can view all slots"
  on public.coaching_slots for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

create policy "Coaches can create slots"
  on public.coaching_slots for insert
  with check (
    auth.uid() = coach_id and
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and (users.role = 'admin' or users.role = 'coach')
    )
  );

create policy "Coaches can update their own slots"
  on public.coaching_slots for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create policy "Coaches can delete their own slots"
  on public.coaching_slots for delete
  using (auth.uid() = coach_id);

-- Coaching Bookings: Users can see their own bookings
alter table public.coaching_bookings enable row level security;

create policy "Students can view their own bookings"
  on public.coaching_bookings for select
  using (auth.uid() = student_id);

create policy "Coaches can view bookings for their slots"
  on public.coaching_bookings for select
  using (auth.uid() = coach_id);

create policy "Admin users can view all bookings"
  on public.coaching_bookings for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

create policy "Students can create bookings"
  on public.coaching_bookings for insert
  with check (auth.uid() = student_id);

create policy "Students can update their own bookings"
  on public.coaching_bookings for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "Coaches can update bookings for their slots"
  on public.coaching_bookings for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create policy "Students can cancel their own bookings"
  on public.coaching_bookings for delete
  using (auth.uid() = student_id);

-- Function: Increment/decrement participant count
create or replace function public.update_slot_participant_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'confirmed' then
    update public.coaching_slots
    set
      current_participants = current_participants + 1,
      status = case
        when current_participants + 1 >= max_participants then 'booked'
        else status
      end
    where id = NEW.slot_id;
  elsif TG_OP = 'UPDATE' then
    if OLD.status = 'confirmed' and NEW.status != 'confirmed' then
      update public.coaching_slots
      set
        current_participants = greatest(0, current_participants - 1),
        status = case
          when current_participants - 1 < max_participants and status = 'booked' then 'available'
          else status
        end
      where id = NEW.slot_id;
    elsif OLD.status != 'confirmed' and NEW.status = 'confirmed' then
      update public.coaching_slots
      set
        current_participants = current_participants + 1,
        status = case
          when current_participants + 1 >= max_participants then 'booked'
          else status
        end
      where id = NEW.slot_id;
    end if;
  elsif TG_OP = 'DELETE' and OLD.status = 'confirmed' then
    update public.coaching_slots
    set
      current_participants = greatest(0, current_participants - 1),
      status = case
        when current_participants - 1 < max_participants and status = 'booked' then 'available'
        else status
      end
    where id = OLD.slot_id;
  end if;

  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

-- Trigger: Update participant count on booking changes
create trigger update_slot_participant_count_trigger
  after insert or update or delete on public.coaching_bookings
  for each row
  execute function public.update_slot_participant_count();

-- Function: Validate slot capacity before booking
create or replace function public.check_slot_capacity()
returns trigger as $$
declare
  v_max_participants int;
  v_current_participants int;
  v_slot_status text;
begin
  select max_participants, current_participants, status
  into v_max_participants, v_current_participants, v_slot_status
  from public.coaching_slots
  where id = NEW.slot_id;

  if v_slot_status != 'available' then
    raise exception 'Slot is not available for booking';
  end if;

  if v_current_participants >= v_max_participants then
    raise exception 'Slot is at full capacity';
  end if;

  return NEW;
end;
$$ language plpgsql;

-- Trigger: Check capacity before booking
create trigger check_slot_capacity_trigger
  before insert on public.coaching_bookings
  for each row
  when (NEW.status = 'confirmed')
  execute function public.check_slot_capacity();

-- Function: Get available coaching slots
create or replace function public.get_available_coaching_slots(
  days_ahead int default 30,
  filter_coach_id uuid default null
)
returns table (
  id uuid,
  coach_id uuid,
  coach_name text,
  coach_email text,
  title text,
  description text,
  duration_minutes int,
  slot_type text,
  max_participants int,
  current_participants int,
  price_cents int,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  location text,
  location_type text,
  status text,
  is_booked_by_user boolean
) as $$
begin
  return query
  select
    cs.id,
    cs.coach_id,
    coalesce(p.display_name, u.email) as coach_name,
    u.email as coach_email,
    cs.title,
    cs.description,
    cs.duration_minutes,
    cs.slot_type,
    cs.max_participants,
    cs.current_participants,
    cs.price_cents,
    cs.start_time,
    cs.end_time,
    cs.timezone,
    cs.location,
    cs.location_type,
    cs.status,
    exists(
      select 1 from public.coaching_bookings cb
      where cb.slot_id = cs.id
      and cb.student_id = auth.uid()
      and cb.status in ('pending', 'confirmed')
    ) as is_booked_by_user
  from public.coaching_slots cs
  join public.users u on u.id = cs.coach_id
  left join public.profiles p on p.id = cs.coach_id
  where cs.is_published = true
  and cs.status = 'available'
  and cs.start_time >= now()
  and cs.start_time <= now() + (days_ahead || ' days')::interval
  and (filter_coach_id is null or cs.coach_id = filter_coach_id)
  order by cs.start_time asc;
end;
$$ language plpgsql security definer;

-- Function: Get coaching bookings needing reminders
create or replace function public.get_coaching_bookings_needing_reminders()
returns table (
  booking_id uuid,
  slot_id uuid,
  coach_id uuid,
  coach_email text,
  student_id uuid,
  student_email text,
  slot_title text,
  slot_start_time timestamptz,
  video_call_url text,
  reminder_hours_before int
) as $$
begin
  return query
  select
    cb.id as booking_id,
    cs.id as slot_id,
    cs.coach_id,
    coach.email::text as coach_email,
    cb.student_id,
    student.email::text as student_email,
    cs.title as slot_title,
    cs.start_time as slot_start_time,
    coalesce(cb.video_call_url, cs.video_call_url) as video_call_url,
    cs.reminder_hours_before
  from public.coaching_bookings cb
  join public.coaching_slots cs on cs.id = cb.slot_id
  join auth.users coach on coach.id = cs.coach_id
  join auth.users student on student.id = cb.student_id
  where cb.status = 'confirmed'
  and cb.reminder_sent_at is null
  and cs.start_time <= now() + (cs.reminder_hours_before || ' hours')::interval
  and cs.start_time > now();
end;
$$ language plpgsql security definer;

-- Updated_at triggers
create trigger update_coaching_slots_updated_at
  before update on public.coaching_slots
  for each row
  execute function public.update_updated_at_column();

create trigger update_coaching_bookings_updated_at
  before update on public.coaching_bookings
  for each row
  execute function public.update_updated_at_column();
