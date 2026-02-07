-- Affiliate System (feat-072)
-- Enables users to become affiliates, track referrals, and earn commissions

-- Affiliates table
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  affiliate_code text unique not null,
  status text not null default 'pending', -- pending|active|suspended
  commission_rate numeric(5,2) not null default 20.00, -- percentage (e.g., 20.00 = 20%)
  total_referrals int not null default 0,
  total_earnings numeric(12,2) not null default 0.00,
  payout_email text,
  payout_method text, -- stripe|paypal|bank
  approved_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Affiliate referrals table (tracks clicks and conversions)
create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  referred_email text,
  order_id uuid references public.orders(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  click_data jsonb, -- stores utm params, IP, user agent, etc.
  status text not null default 'pending', -- pending|converted|refunded
  converted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Affiliate commissions table
create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referral_id uuid not null references public.affiliate_referrals(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null, -- commission amount in cents
  commission_rate numeric(5,2) not null, -- rate at time of commission
  status text not null default 'pending', -- pending|approved|paid|reversed
  paid_at timestamptz,
  reversed_at timestamptz,
  payout_batch_id uuid, -- for grouping payouts
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Affiliate payout batches
create table if not exists public.affiliate_payout_batches (
  id uuid primary key default gen_random_uuid(),
  total_amount numeric(12,2) not null,
  total_commissions int not null,
  status text not null default 'pending', -- pending|processing|completed|failed
  processed_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.affiliates enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_payout_batches enable row level security;

-- RLS Policies

-- Affiliates: users can read their own affiliate record
create policy "affiliates_select_own" on public.affiliates
for select using (auth.uid() = user_id);

-- Affiliates: users can update their own affiliate record (limited fields)
create policy "affiliates_update_own" on public.affiliates
for update using (auth.uid() = user_id);

-- Affiliates: users can insert their own affiliate record (registration)
create policy "affiliates_insert_own" on public.affiliates
for insert with check (auth.uid() = user_id);

-- Affiliate referrals: affiliates can read their own referrals
create policy "referrals_select_own" on public.affiliate_referrals
for select using (
  exists (
    select 1 from public.affiliates
    where affiliates.id = affiliate_referrals.affiliate_id
    and affiliates.user_id = auth.uid()
  )
);

-- Affiliate commissions: affiliates can read their own commissions
create policy "commissions_select_own" on public.affiliate_commissions
for select using (
  exists (
    select 1 from public.affiliates
    where affiliates.id = affiliate_commissions.affiliate_id
    and affiliates.user_id = auth.uid()
  )
);

-- Affiliate payout batches: affiliates can read batches containing their payouts
create policy "payout_batches_select_own" on public.affiliate_payout_batches
for select using (
  exists (
    select 1 from public.affiliate_commissions
    join public.affiliates on affiliates.id = affiliate_commissions.affiliate_id
    where affiliate_commissions.payout_batch_id = affiliate_payout_batches.id
    and affiliates.user_id = auth.uid()
  )
);

-- Indexes for performance
create index if not exists idx_affiliates_user_id on public.affiliates(user_id);
create index if not exists idx_affiliates_code on public.affiliates(affiliate_code);
create index if not exists idx_affiliates_status on public.affiliates(status);
create index if not exists idx_referrals_affiliate_id on public.affiliate_referrals(affiliate_id);
create index if not exists idx_referrals_order_id on public.affiliate_referrals(order_id);
create index if not exists idx_referrals_status on public.affiliate_referrals(status);
create index if not exists idx_commissions_affiliate_id on public.affiliate_commissions(affiliate_id);
create index if not exists idx_commissions_order_id on public.affiliate_commissions(order_id);
create index if not exists idx_commissions_status on public.affiliate_commissions(status);
create index if not exists idx_commissions_payout_batch on public.affiliate_commissions(payout_batch_id);

-- Function to generate unique affiliate code
create or replace function generate_affiliate_code(user_email text)
returns text
language plpgsql
as $$
declare
  base_code text;
  final_code text;
  counter int := 0;
begin
  -- Extract username from email and sanitize
  base_code := lower(regexp_replace(split_part(user_email, '@', 1), '[^a-z0-9]', '', 'g'));

  -- Ensure minimum length
  if length(base_code) < 4 then
    base_code := base_code || substring(md5(user_email) from 1 for 4);
  end if;

  -- Try to find unique code
  final_code := base_code;
  while exists (select 1 from public.affiliates where affiliate_code = final_code) loop
    counter := counter + 1;
    final_code := base_code || counter::text;

    -- Safety limit
    if counter > 1000 then
      final_code := substring(md5(random()::text || user_email) from 1 for 10);
      exit;
    end if;
  end loop;

  return final_code;
end;
$$;

-- Function to calculate commission
create or replace function calculate_commission(order_amount numeric, commission_rate numeric)
returns numeric
language plpgsql
as $$
begin
  -- Calculate commission as percentage of order amount
  -- Amount is in cents, so divide by 100 for percentage calculation
  return round((order_amount * commission_rate / 100), 2);
end;
$$;

-- Function to update affiliate totals
create or replace function update_affiliate_totals()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    -- Update total_referrals when a new referral is created
    if NEW.status = 'converted' then
      update public.affiliates
      set
        total_referrals = total_referrals + 1,
        updated_at = now()
      where id = NEW.affiliate_id;
    end if;
  elsif TG_OP = 'UPDATE' then
    -- Update total_referrals when referral status changes to converted
    if OLD.status != 'converted' and NEW.status = 'converted' then
      update public.affiliates
      set
        total_referrals = total_referrals + 1,
        updated_at = now()
      where id = NEW.affiliate_id;
    end if;
  end if;

  return NEW;
end;
$$;

-- Trigger to update affiliate totals on referral changes
create trigger trigger_update_affiliate_totals
after insert or update on public.affiliate_referrals
for each row
execute function update_affiliate_totals();

-- Function to update affiliate earnings
create or replace function update_affiliate_earnings()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    -- Add to total_earnings when commission is approved
    if NEW.status = 'approved' or NEW.status = 'paid' then
      update public.affiliates
      set
        total_earnings = total_earnings + NEW.amount,
        updated_at = now()
      where id = NEW.affiliate_id;
    end if;
  elsif TG_OP = 'UPDATE' then
    -- Add to total_earnings when status changes to approved/paid
    if (OLD.status != 'approved' and OLD.status != 'paid') and (NEW.status = 'approved' or NEW.status = 'paid') then
      update public.affiliates
      set
        total_earnings = total_earnings + NEW.amount,
        updated_at = now()
      where id = NEW.affiliate_id;
    end if;

    -- Subtract from total_earnings when commission is reversed
    if (OLD.status = 'approved' or OLD.status = 'paid') and NEW.status = 'reversed' then
      update public.affiliates
      set
        total_earnings = total_earnings - OLD.amount,
        updated_at = now()
      where id = NEW.affiliate_id;
    end if;
  end if;

  return NEW;
end;
$$;

-- Trigger to update affiliate earnings on commission changes
create trigger trigger_update_affiliate_earnings
after insert or update on public.affiliate_commissions
for each row
execute function update_affiliate_earnings();

-- Function to track referral and create commission (called by Stripe webhook)
create or replace function process_affiliate_referral(
  p_order_id uuid,
  p_affiliate_code text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_affiliate_id uuid;
  v_affiliate_commission_rate numeric;
  v_order_amount numeric;
  v_referral_id uuid;
  v_commission_id uuid;
  v_commission_amount numeric;
begin
  -- Get affiliate info
  select id, commission_rate into v_affiliate_id, v_affiliate_commission_rate
  from public.affiliates
  where affiliate_code = p_affiliate_code
  and status = 'active';

  if v_affiliate_id is null then
    raise exception 'Affiliate not found or not active: %', p_affiliate_code;
  end if;

  -- Get order amount
  select amount into v_order_amount
  from public.orders
  where id = p_order_id;

  if v_order_amount is null then
    raise exception 'Order not found: %', p_order_id;
  end if;

  -- Create or update referral record
  insert into public.affiliate_referrals (affiliate_id, order_id, status, converted_at)
  values (v_affiliate_id, p_order_id, 'converted', now())
  returning id into v_referral_id;

  -- Calculate commission
  v_commission_amount := calculate_commission(v_order_amount, v_affiliate_commission_rate);

  -- Create commission record
  insert into public.affiliate_commissions (
    affiliate_id,
    referral_id,
    order_id,
    amount,
    commission_rate,
    status
  )
  values (
    v_affiliate_id,
    v_referral_id,
    p_order_id,
    v_commission_amount,
    v_affiliate_commission_rate,
    'pending'
  )
  returning id into v_commission_id;

  return v_commission_id;
end;
$$;

-- Comments for documentation
comment on table public.affiliates is 'Stores affiliate partner information and stats';
comment on table public.affiliate_referrals is 'Tracks affiliate referral clicks and conversions';
comment on table public.affiliate_commissions is 'Records commission earnings for affiliates';
comment on table public.affiliate_payout_batches is 'Groups affiliate payouts for batch processing';
comment on function generate_affiliate_code is 'Generates unique affiliate code from email';
comment on function calculate_commission is 'Calculates commission amount based on order and rate';
comment on function process_affiliate_referral is 'Processes referral and creates commission (webhook)';
