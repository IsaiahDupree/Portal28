-- Affiliate Payout Requests (feat-198)
-- Enables affiliates to request payouts and admins to process them

-- Add payout requests table for individual affiliate payout requests
create table if not exists public.affiliate_payout_requests (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount numeric(12,2) not null, -- requested payout amount in cents
  status text not null default 'pending', -- pending|approved|rejected|processing|completed|failed
  payout_method text not null, -- stripe|paypal|bank
  payout_email text not null,

  -- Admin actions
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejected_by uuid references auth.users(id),
  rejected_at timestamptz,
  rejection_reason text,

  -- Processing
  processed_by uuid references auth.users(id),
  processed_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,

  -- External references
  stripe_transfer_id text,
  payout_batch_id uuid references public.affiliate_payout_batches(id),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.affiliate_payout_requests enable row level security;

-- RLS Policies for payout requests

-- Affiliates can view their own payout requests
create policy "payout_requests_select_own" on public.affiliate_payout_requests
for select using (
  exists (
    select 1 from public.affiliates
    where affiliates.id = affiliate_payout_requests.affiliate_id
    and affiliates.user_id = auth.uid()
  )
);

-- Affiliates can create their own payout requests
create policy "payout_requests_insert_own" on public.affiliate_payout_requests
for insert with check (
  exists (
    select 1 from public.affiliates
    where affiliates.id = affiliate_payout_requests.affiliate_id
    and affiliates.user_id = auth.uid()
  )
);

-- Indexes for performance
create index if not exists idx_payout_requests_affiliate_id on public.affiliate_payout_requests(affiliate_id);
create index if not exists idx_payout_requests_status on public.affiliate_payout_requests(status);
create index if not exists idx_payout_requests_created_at on public.affiliate_payout_requests(created_at);
create index if not exists idx_payout_requests_batch_id on public.affiliate_payout_requests(payout_batch_id);

-- Function to calculate available balance for payout
create or replace function get_affiliate_available_balance(p_affiliate_id uuid)
returns numeric
language plpgsql
security definer
as $$
declare
  v_total_approved numeric;
  v_total_paid numeric;
begin
  -- Sum all approved and paid commissions
  select
    coalesce(sum(case when status in ('approved', 'paid') then amount else 0 end), 0)
  into v_total_approved
  from public.affiliate_commissions
  where affiliate_id = p_affiliate_id;

  -- Sum all completed and processing payout requests
  select
    coalesce(sum(amount), 0)
  into v_total_paid
  from public.affiliate_payout_requests
  where affiliate_id = p_affiliate_id
  and status in ('completed', 'processing', 'approved');

  -- Available balance = approved commissions - payouts already requested/paid
  return greatest(v_total_approved - v_total_paid, 0);
end;
$$;

-- Function to validate payout request
create or replace function validate_payout_request()
returns trigger
language plpgsql
as $$
declare
  v_available_balance numeric;
  v_affiliate_status text;
  v_pending_requests int;
begin
  -- Check if affiliate is active
  select status into v_affiliate_status
  from public.affiliates
  where id = NEW.affiliate_id;

  if v_affiliate_status != 'active' then
    raise exception 'Affiliate must be active to request payouts';
  end if;

  -- Check for pending payout requests
  select count(*) into v_pending_requests
  from public.affiliate_payout_requests
  where affiliate_id = NEW.affiliate_id
  and status in ('pending', 'approved', 'processing');

  if v_pending_requests > 0 then
    raise exception 'Cannot request payout with pending request';
  end if;

  -- Check available balance
  v_available_balance := get_affiliate_available_balance(NEW.affiliate_id);

  if NEW.amount > v_available_balance then
    raise exception 'Insufficient balance: requested % but only % available',
      NEW.amount, v_available_balance;
  end if;

  -- Check minimum payout (e.g., $50.00 = 5000 cents)
  if NEW.amount < 5000 then
    raise exception 'Minimum payout amount is $50.00';
  end if;

  return NEW;
end;
$$;

-- Trigger to validate payout requests before insert
create trigger trigger_validate_payout_request
before insert on public.affiliate_payout_requests
for each row
execute function validate_payout_request();

-- Function to update commission status when payout is completed
create or replace function update_commissions_on_payout()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.status = 'completed' and OLD.status != 'completed' then
    -- Mark all approved commissions as paid for this affiliate up to payout amount
    update public.affiliate_commissions
    set
      status = 'paid',
      paid_at = now(),
      payout_batch_id = NEW.payout_batch_id,
      updated_at = now()
    where affiliate_id = NEW.affiliate_id
    and status = 'approved'
    and id in (
      select id from public.affiliate_commissions
      where affiliate_id = NEW.affiliate_id
      and status = 'approved'
      order by created_at asc
      limit (
        select count(*) from public.affiliate_commissions
        where affiliate_id = NEW.affiliate_id
        and status = 'approved'
      )
    );
  elsif NEW.status = 'failed' and OLD.status != 'failed' then
    -- On failure, commissions remain approved (available for next payout)
    -- Log the failure
    NEW.failed_at := now();
  end if;

  return NEW;
end;
$$;

-- Trigger to update commissions when payout status changes
create trigger trigger_update_commissions_on_payout
before update on public.affiliate_payout_requests
for each row
execute function update_commissions_on_payout();

-- Function for admins to approve payout request
create or replace function approve_payout_request(
  p_payout_request_id uuid,
  p_admin_user_id uuid
)
returns uuid
language plpgsql
security definer
as $$
begin
  -- Update payout request status
  update public.affiliate_payout_requests
  set
    status = 'approved',
    approved_by = p_admin_user_id,
    approved_at = now(),
    updated_at = now()
  where id = p_payout_request_id
  and status = 'pending';

  if not found then
    raise exception 'Payout request not found or not pending';
  end if;

  return p_payout_request_id;
end;
$$;

-- Function for admins to reject payout request
create or replace function reject_payout_request(
  p_payout_request_id uuid,
  p_admin_user_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
as $$
begin
  -- Update payout request status
  update public.affiliate_payout_requests
  set
    status = 'rejected',
    rejected_by = p_admin_user_id,
    rejected_at = now(),
    rejection_reason = p_reason,
    updated_at = now()
  where id = p_payout_request_id
  and status = 'pending';

  if not found then
    raise exception 'Payout request not found or not pending';
  end if;

  return p_payout_request_id;
end;
$$;

-- Comments for documentation
comment on table public.affiliate_payout_requests is 'Tracks individual affiliate payout requests';
comment on function get_affiliate_available_balance is 'Calculates available balance for payout';
comment on function validate_payout_request is 'Validates payout request before insert';
comment on function approve_payout_request is 'Admin function to approve payout request';
comment on function reject_payout_request is 'Admin function to reject payout request';
