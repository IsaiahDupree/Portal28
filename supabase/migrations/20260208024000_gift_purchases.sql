-- Gift Purchases System
-- Feature: feat-225
-- Allow users to purchase courses as gifts and send redemption codes to recipients

-- Gift codes table
create table if not exists public.gift_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  purchaser_user_id uuid references auth.users(id) on delete set null,
  purchaser_email text not null,
  recipient_email text not null,
  recipient_name text,
  personal_message text,
  amount_cents integer not null,
  currency text not null default 'USD',
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'redeemed', 'expired', 'refunded')),
  redeemed_by_user_id uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_gift_codes_code on public.gift_codes(code);
create index if not exists idx_gift_codes_purchaser on public.gift_codes(purchaser_user_id);
create index if not exists idx_gift_codes_recipient_email on public.gift_codes(recipient_email);
create index if not exists idx_gift_codes_status on public.gift_codes(status);
create index if not exists idx_gift_codes_course on public.gift_codes(course_id);

-- Function to generate unique gift code
create or replace function public.generate_gift_code()
returns text
language plpgsql
as $$
declare
  code text;
  exists_check boolean;
begin
  loop
    -- Generate a 12-character code (e.g., GIFT-XXXX-YYYY)
    code := 'GIFT-' ||
            substring(md5(random()::text) from 1 for 4) ||
            '-' ||
            substring(md5(random()::text) from 1 for 4);
    code := upper(code);

    -- Check if code already exists
    select exists(select 1 from public.gift_codes where gift_codes.code = code) into exists_check;

    if not exists_check then
      return code;
    end if;
  end loop;
end;
$$;

-- RLS Policies for gift_codes
alter table public.gift_codes enable row level security;

-- Purchasers can view their purchased gifts
drop policy if exists "Purchasers can view own gift purchases" on public.gift_codes;
create policy "Purchasers can view own gift purchases" on public.gift_codes
  for select using (
    auth.uid() = purchaser_user_id or
    auth.jwt()->>'email' = purchaser_email
  );

-- Recipients can view gifts sent to them (by email)
drop policy if exists "Recipients can view gifts sent to them" on public.gift_codes;
create policy "Recipients can view gifts sent to them" on public.gift_codes
  for select using (
    auth.jwt()->>'email' = recipient_email
  );

-- Anyone can view a specific gift by code (for redemption page)
drop policy if exists "Anyone can view gift by code" on public.gift_codes;
create policy "Anyone can view gift by code" on public.gift_codes
  for select using (true);

-- Service role and admins can manage all gifts
drop policy if exists "Admins can manage all gifts" on public.gift_codes;
create policy "Admins can manage all gifts" on public.gift_codes
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Function to redeem gift code
create or replace function public.redeem_gift_code(
  gift_code_input text,
  user_id_input uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  gift_record record;
  enrollment_id uuid;
begin
  -- Find the gift code
  select * into gift_record
  from public.gift_codes
  where code = gift_code_input
  and status = 'sent'
  and (expires_at is null or expires_at > now())
  for update;

  -- Check if gift code exists and is valid
  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired gift code'
    );
  end if;

  -- Check if user already has access to this course
  if exists (
    select 1 from public.enrollments
    where course_id = gift_record.course_id
    and user_id = user_id_input
    and status = 'active'
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'You already have access to this course'
    );
  end if;

  -- Create enrollment for the recipient
  insert into public.enrollments (
    course_id,
    user_id,
    source,
    status,
    purchased_at
  ) values (
    gift_record.course_id,
    user_id_input,
    'gift',
    'active',
    now()
  ) returning id into enrollment_id;

  -- Update gift code status
  update public.gift_codes
  set
    status = 'redeemed',
    redeemed_by_user_id = user_id_input,
    redeemed_at = now(),
    updated_at = now()
  where id = gift_record.id;

  return jsonb_build_object(
    'success', true,
    'enrollment_id', enrollment_id,
    'course_id', gift_record.course_id
  );
end;
$$;

-- Trigger to update updated_at timestamp
create or replace function public.update_gift_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_update_gift_codes_updated_at on public.gift_codes;
create trigger trigger_update_gift_codes_updated_at
  before update on public.gift_codes
  for each row
  execute function public.update_gift_codes_updated_at();
