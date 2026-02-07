-- Multi-Instructor Support (feat-076)
-- Enables multiple instructors per course with revenue sharing

-- Add instructor role if not exists (update role constraint)
do $$
begin
  -- Check if role constraint exists and update it
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'users_role_check'
  ) then
    alter table public.users drop constraint users_role_check;
    alter table public.users add constraint users_role_check
      check (role in ('student', 'admin', 'instructor', 'coach'));
  end if;
end $$;

-- Course instructors mapping table
create table if not exists public.course_instructors (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  role_title text not null default 'Instructor', -- Instructor|Co-Instructor|Teaching Assistant
  revenue_share_percentage decimal(5,2) not null default 0.00, -- 0.00 to 100.00
  is_primary boolean not null default false,
  permissions jsonb default '{
    "can_edit_content": true,
    "can_manage_students": true,
    "can_view_analytics": true,
    "can_manage_pricing": false
  }'::jsonb,
  bio text, -- instructor-specific bio for this course
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Unique constraint: one instructor can have only one role per course
  unique(course_id, instructor_id),

  -- Validation
  constraint valid_revenue_share check (revenue_share_percentage >= 0 and revenue_share_percentage <= 100),
  constraint valid_role_title check (role_title in ('Instructor', 'Co-Instructor', 'Teaching Assistant'))
);

-- Instructor profiles (additional info for instructors)
create table if not exists public.instructor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  profile_image_url text,
  website_url text,
  linkedin_url text,
  twitter_handle text,
  expertise_areas text[] default '{}',
  years_of_experience int default 0,
  total_students int not null default 0, -- calculated
  total_courses int not null default 0, -- calculated
  average_rating decimal(3,2) default 0.00, -- calculated
  is_verified boolean not null default false,
  stripe_connect_account_id text, -- for revenue payouts
  payout_method text default 'manual', -- manual|stripe_connect
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Validation
  constraint valid_years check (years_of_experience >= 0),
  constraint valid_rating check (average_rating >= 0 and average_rating <= 5),
  constraint valid_payout_method check (payout_method in ('manual', 'stripe_connect'))
);

-- Revenue splits tracking (for reporting)
create table if not exists public.revenue_splits (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null, -- instructor's share in cents
  percentage decimal(5,2) not null, -- their revenue share percentage
  status text not null default 'pending', -- pending|paid|cancelled
  stripe_transfer_id text, -- Stripe transfer ID if using Stripe Connect
  paid_at timestamptz,
  created_at timestamptz not null default now(),

  -- Validation
  constraint valid_amount check (amount_cents >= 0),
  constraint valid_percentage check (percentage >= 0 and percentage <= 100),
  constraint valid_status check (status in ('pending', 'paid', 'cancelled'))
);

-- Indexes for performance
create index if not exists idx_course_instructors_course_id on public.course_instructors(course_id);
create index if not exists idx_course_instructors_instructor_id on public.course_instructors(instructor_id);
create index if not exists idx_course_instructors_primary on public.course_instructors(is_primary) where is_primary = true;
create index if not exists idx_instructor_profiles_verified on public.instructor_profiles(is_verified) where is_verified = true;
create index if not exists idx_revenue_splits_instructor_id on public.revenue_splits(instructor_id);
create index if not exists idx_revenue_splits_status on public.revenue_splits(status);
create index if not exists idx_revenue_splits_order_id on public.revenue_splits(order_id);

-- RLS Policies

-- Course Instructors: Instructors can view their own assignments
alter table public.course_instructors enable row level security;

create policy "Instructors can view their own course assignments"
  on public.course_instructors for select
  using (auth.uid() = instructor_id);

create policy "Anyone can view course instructors for published courses"
  on public.course_instructors for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published'
    )
  );

create policy "Admin users can manage all course instructors"
  on public.course_instructors for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Instructor Profiles: Public can view verified instructors
alter table public.instructor_profiles enable row level security;

create policy "Anyone can view verified instructor profiles"
  on public.instructor_profiles for select
  using (is_verified = true);

create policy "Instructors can view their own profile"
  on public.instructor_profiles for select
  using (auth.uid() = id);

create policy "Instructors can update their own profile"
  on public.instructor_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admin users can manage all instructor profiles"
  on public.instructor_profiles for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Revenue Splits: Instructors can view their own splits
alter table public.revenue_splits enable row level security;

create policy "Instructors can view their own revenue splits"
  on public.revenue_splits for select
  using (auth.uid() = instructor_id);

create policy "Admin users can manage all revenue splits"
  on public.revenue_splits for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Function: Calculate revenue splits when order is created
create or replace function public.calculate_revenue_splits()
returns trigger as $$
declare
  v_instructor record;
  v_instructor_share int;
begin
  -- Only process completed orders
  if NEW.status != 'completed' and OLD.status = 'pending' then
    return NEW;
  end if;

  -- Create revenue splits for each instructor assigned to the course
  for v_instructor in
    select instructor_id, revenue_share_percentage
    from public.course_instructors
    where course_id = NEW.course_id
    and revenue_share_percentage > 0
  loop
    -- Calculate instructor's share
    v_instructor_share := floor(NEW.amount_cents * v_instructor.revenue_share_percentage / 100);

    -- Insert revenue split record
    insert into public.revenue_splits (
      order_id,
      course_id,
      instructor_id,
      amount_cents,
      percentage
    ) values (
      NEW.id,
      NEW.course_id,
      v_instructor.instructor_id,
      v_instructor_share,
      v_instructor.revenue_share_percentage
    );
  end loop;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: Calculate revenue splits on order completion
create trigger calculate_revenue_splits_trigger
  after update of status on public.orders
  for each row
  when (NEW.status = 'completed' and OLD.status != 'completed')
  execute function public.calculate_revenue_splits();

-- Function: Update instructor stats
create or replace function public.update_instructor_stats()
returns trigger as $$
declare
  v_instructor_id uuid;
begin
  -- Get all instructors for this course
  for v_instructor_id in
    select instructor_id from public.course_instructors
    where course_id = (
      case when TG_TABLE_NAME = 'course_instructors' then NEW.course_id
           else NEW.id
      end
    )
  loop
    -- Update instructor stats
    update public.instructor_profiles
    set
      total_courses = (
        select count(distinct course_id)
        from public.course_instructors
        where instructor_id = v_instructor_id
      ),
      total_students = (
        select count(distinct e.user_id)
        from public.enrollments e
        join public.course_instructors ci on ci.course_id = e.course_id
        where ci.instructor_id = v_instructor_id
      ),
      updated_at = now()
    where id = v_instructor_id;
  end loop;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: Update instructor stats when course assignments change
create trigger update_instructor_stats_on_assignment
  after insert or update or delete on public.course_instructors
  for each row
  execute function public.update_instructor_stats();

-- Function: Get courses for instructor
create or replace function public.get_instructor_courses(
  p_instructor_id uuid default null
)
returns table (
  id uuid,
  title text,
  slug text,
  description text,
  status text,
  hero_image text,
  role_title text,
  revenue_share_percentage decimal,
  is_primary boolean,
  total_students int,
  total_revenue_cents int,
  created_at timestamptz
) as $$
begin
  return query
  select
    c.id,
    c.title,
    c.slug,
    c.description,
    c.status,
    c.hero_image,
    ci.role_title,
    ci.revenue_share_percentage,
    ci.is_primary,
    count(distinct e.user_id)::int as total_students,
    coalesce(sum(o.amount_cents), 0)::int as total_revenue_cents,
    c.created_at
  from public.courses c
  join public.course_instructors ci on ci.course_id = c.id
  left join public.enrollments e on e.course_id = c.id
  left join public.orders o on o.course_id = c.id and o.status = 'completed'
  where ci.instructor_id = coalesce(p_instructor_id, auth.uid())
  group by c.id, c.title, c.slug, c.description, c.status, c.hero_image,
           ci.role_title, ci.revenue_share_percentage, ci.is_primary, c.created_at
  order by c.created_at desc;
end;
$$ language plpgsql security definer;

-- Function: Get instructor earnings
create or replace function public.get_instructor_earnings(
  p_instructor_id uuid default null,
  p_status text default null
)
returns table (
  total_earnings_cents int,
  pending_cents int,
  paid_cents int,
  split_count int
) as $$
begin
  return query
  select
    coalesce(sum(amount_cents), 0)::int as total_earnings_cents,
    coalesce(sum(case when status = 'pending' then amount_cents else 0 end), 0)::int as pending_cents,
    coalesce(sum(case when status = 'paid' then amount_cents else 0 end), 0)::int as paid_cents,
    count(*)::int as split_count
  from public.revenue_splits
  where instructor_id = coalesce(p_instructor_id, auth.uid())
  and (p_status is null or status = p_status);
end;
$$ language plpgsql security definer;

-- Updated_at triggers
create trigger update_course_instructors_updated_at
  before update on public.course_instructors
  for each row
  execute function public.update_updated_at_column();

create trigger update_instructor_profiles_updated_at
  before update on public.instructor_profiles
  for each row
  execute function public.update_updated_at_column();
