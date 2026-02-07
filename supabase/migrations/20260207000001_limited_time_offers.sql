-- Portal28 Academy - Limited-Time Offers (feat-059)
-- Adds time bounds to offers with automatic expiration

-- =============================================================================
-- UPDATE OFFERS TABLE - Add time bounds
-- =============================================================================

-- Add start and end timestamps for time-limited offers
alter table public.offers
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists show_countdown boolean not null default false;

-- Add index for fast filtering of active offers
create index if not exists idx_offers_time_bounds
  on public.offers(is_active, starts_at, ends_at)
  where is_active = true;

-- Add comments
comment on column public.offers.starts_at is 'Offer becomes available at this time (null = immediately)';
comment on column public.offers.ends_at is 'Offer expires at this time (null = never expires)';
comment on column public.offers.show_countdown is 'Display countdown timer on offer card';

-- =============================================================================
-- HELPER FUNCTION - Check if offer is currently active
-- =============================================================================

create or replace function public.is_offer_active(
  p_offer_key text,
  p_check_time timestamptz default now()
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_offer record;
begin
  select is_active, starts_at, ends_at
  into v_offer
  from public.offers
  where key = p_offer_key;

  if not found then
    return false;
  end if;

  if not v_offer.is_active then
    return false;
  end if;

  -- Check if not yet started
  if v_offer.starts_at is not null and v_offer.starts_at > p_check_time then
    return false;
  end if;

  -- Check if expired
  if v_offer.ends_at is not null and v_offer.ends_at <= p_check_time then
    return false;
  end if;

  return true;
end;
$$;

-- =============================================================================
-- AUTO-EXPIRE FUNCTION - Deactivates expired offers
-- =============================================================================

create or replace function public.expire_offers()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  -- Deactivate offers that have passed their end time
  update public.offers
  set is_active = false,
      updated_at = now()
  where is_active = true
    and ends_at is not null
    and ends_at <= now();

  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

comment on function public.expire_offers() is 'Automatically deactivates offers past their end_at time. Run via cron or API.';

-- =============================================================================
-- VIEW - Active offers with time status
-- =============================================================================

create or replace view public.active_offers_view as
select
  o.*,
  case
    when o.starts_at is not null and o.starts_at > now() then 'upcoming'
    when o.ends_at is not null and o.ends_at <= now() then 'expired'
    when o.ends_at is not null and o.ends_at <= now() + interval '24 hours' then 'ending_soon'
    else 'active'
  end as time_status,
  case
    when o.ends_at is not null then
      extract(epoch from (o.ends_at - now()))::bigint
    else null
  end as seconds_remaining
from public.offers o
where o.is_active = true
  and (o.starts_at is null or o.starts_at <= now())
  and (o.ends_at is null or o.ends_at > now());

comment on view public.active_offers_view is 'Shows all currently active offers with time status and countdown info';

-- =============================================================================
-- SAMPLE LIMITED-TIME OFFERS
-- =============================================================================

-- Black Friday Sale (example - set dates as needed)
insert into public.offers (key, kind, title, subtitle, badge, cta_text, price_label, compare_at_label, bullets, payload, show_countdown, starts_at, ends_at, is_active)
values
  (
    'black-friday-course',
    'course',
    'Black Friday Special - FB Ads Mastery',
    'Limited time: 50% off our best-selling course',
    'LIMITED TIME',
    'Get 50% Off Now',
    '$49',
    '$99',
    '["Complete FB Ads training", "Lifetime access", "Bonus templates included", "Save $50 today only"]'::jsonb,
    '{"courseSlug": "fb-ads-101"}'::jsonb,
    true,
    now(), -- starts immediately
    now() + interval '7 days', -- expires in 7 days
    true
  ),
  (
    'early-bird-membership',
    'membership',
    'Early Bird Membership - 40% Off',
    'Lock in this price forever',
    'EARLY BIRD',
    'Join Now & Save',
    '$29/mo',
    '$49/mo',
    '["Access all courses", "Monthly live trainings", "Private community", "Price locked forever", "Cancel anytime"]'::jsonb,
    '{"tier": "premium", "interval": "monthly"}'::jsonb,
    true,
    now(),
    now() + interval '3 days',
    true
  )
on conflict (key) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  badge = excluded.badge,
  price_label = excluded.price_label,
  compare_at_label = excluded.compare_at_label,
  bullets = excluded.bullets,
  show_countdown = excluded.show_countdown,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  is_active = excluded.is_active,
  updated_at = now();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Users can call is_offer_active to check offer status
grant execute on function public.is_offer_active to authenticated, anon;

-- Only service role can expire offers (called via API cron)
revoke execute on function public.expire_offers from public;
grant execute on function public.expire_offers to service_role;

-- Users can view active offers
grant select on public.active_offers_view to authenticated, anon;
