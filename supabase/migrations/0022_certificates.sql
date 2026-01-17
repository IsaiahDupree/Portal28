-- Portal28 Academy - Course Certificates
-- Generate and track course completion certificates

-- =============================================================================
-- CERTIFICATES TABLE
-- =============================================================================

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,

  -- Certificate details
  certificate_number text not null unique,
  student_name text not null,
  course_title text not null,
  completion_date date not null,

  -- Verification
  verification_token text not null unique,

  -- PDF generation status
  pdf_generated boolean not null default false,
  pdf_url text,
  pdf_generated_at timestamptz,

  -- Email notification status
  email_sent boolean not null default false,
  email_sent_at timestamptz,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, course_id)
);

create index idx_certificates_user on public.certificates(user_id);
create index idx_certificates_course on public.certificates(course_id);
create index idx_certificates_verification on public.certificates(verification_token);
create index idx_certificates_number on public.certificates(certificate_number);

-- =============================================================================
-- CERTIFICATE NUMBER GENERATOR FUNCTION
-- =============================================================================

-- Generate unique certificate number in format: CERT-YYYYMMDD-XXXXX
create or replace function generate_certificate_number()
returns text as $$
declare
  date_part text;
  random_part text;
  cert_number text;
  counter int := 0;
begin
  date_part := to_char(current_date, 'YYYYMMDD');

  loop
    -- Generate 5-digit random number
    random_part := lpad(floor(random() * 100000)::text, 5, '0');
    cert_number := 'CERT-' || date_part || '-' || random_part;

    -- Check if exists
    if not exists (select 1 from public.certificates where certificate_number = cert_number) then
      return cert_number;
    end if;

    counter := counter + 1;
    if counter > 100 then
      raise exception 'Could not generate unique certificate number after 100 attempts';
    end if;
  end loop;
end;
$$ language plpgsql;

-- =============================================================================
-- VERIFICATION TOKEN GENERATOR FUNCTION
-- =============================================================================

create or replace function generate_verification_token()
returns text as $$
declare
  token text;
  counter int := 0;
begin
  loop
    -- Generate 32-character alphanumeric token
    token := encode(gen_random_bytes(24), 'base64');
    token := regexp_replace(token, '[^a-zA-Z0-9]', '', 'g');
    token := substring(token, 1, 32);

    -- Check if exists
    if not exists (select 1 from public.certificates where verification_token = token) then
      return token;
    end if;

    counter := counter + 1;
    if counter > 100 then
      raise exception 'Could not generate unique verification token after 100 attempts';
    end if;
  end loop;
end;
$$ language plpgsql;

-- =============================================================================
-- AUTO-GENERATE CERTIFICATE ON COURSE COMPLETION TRIGGER
-- =============================================================================

create or replace function auto_generate_certificate()
returns trigger as $$
declare
  v_course_id uuid;
  v_total_lessons int;
  v_completed_lessons int;
  v_user_name text;
  v_course_title text;
  v_cert_exists boolean;
begin
  -- Only proceed if lesson was just marked as completed
  if NEW.status = 'completed' and (OLD.status is null or OLD.status != 'completed') then
    v_course_id := NEW.course_id;

    -- Get total lessons in course
    select count(*)
    into v_total_lessons
    from public.lessons l
    join public.modules m on l.module_id = m.id
    where m.course_id = v_course_id;

    -- Get completed lessons count for this user
    select count(*)
    into v_completed_lessons
    from public.lesson_progress
    where user_id = NEW.user_id
      and course_id = v_course_id
      and status = 'completed';

    -- Check if course is 100% complete
    if v_completed_lessons >= v_total_lessons and v_total_lessons > 0 then
      -- Check if certificate already exists
      select exists(
        select 1 from public.certificates
        where user_id = NEW.user_id and course_id = v_course_id
      ) into v_cert_exists;

      if not v_cert_exists then
        -- Get user name from profiles
        select full_name
        into v_user_name
        from public.profiles
        where id = NEW.user_id;

        -- Get course title
        select title
        into v_course_title
        from public.courses
        where id = v_course_id;

        -- Create certificate
        insert into public.certificates (
          user_id,
          course_id,
          certificate_number,
          student_name,
          course_title,
          completion_date,
          verification_token
        ) values (
          NEW.user_id,
          v_course_id,
          generate_certificate_number(),
          coalesce(v_user_name, 'Student'),
          coalesce(v_course_title, 'Course'),
          current_date,
          generate_verification_token()
        );
      end if;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trigger_auto_generate_certificate
  after insert or update on public.lesson_progress
  for each row
  execute function auto_generate_certificate();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

alter table public.certificates enable row level security;

-- Users can view their own certificates
create policy "Users can view own certificates"
  on public.certificates for select
  using (auth.uid() = user_id);

-- Anyone can verify a certificate (for verification page)
create policy "Anyone can verify certificates by token"
  on public.certificates for select
  using (true);

-- Service role can insert/update certificates (for PDF generation, email sending)
-- This is handled via service key, not RLS

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

create trigger certificates_updated_at
  before update on public.certificates
  for each row
  execute function update_updated_at_column();
