-- Portal28 Academy - Analytics Functions
-- Database functions for analytics dashboard

-- =============================================================================
-- REVENUE TIMESERIES
-- =============================================================================

create or replace function get_revenue_timeseries(
  p_period text default 'day',
  p_days integer default 30
)
returns table (
  date text,
  revenue bigint,
  orders bigint
) as $$
declare
  v_start_date timestamptz;
  v_date_format text;
  v_date_trunc text;
begin
  v_start_date := current_date - (p_days || ' days')::interval;

  -- Determine date format and truncation
  if p_period = 'week' then
    v_date_trunc := 'week';
    v_date_format := 'IYYY-IW';
  elsif p_period = 'month' then
    v_date_trunc := 'month';
    v_date_format := 'YYYY-MM';
  else
    v_date_trunc := 'day';
    v_date_format := 'YYYY-MM-DD';
  end if;

  return query
  select
    to_char(date_trunc(v_date_trunc, o.created_at), v_date_format) as date,
    sum(o.amount)::bigint as revenue,
    count(*)::bigint as orders
  from public.orders o
  where o.status = 'completed'
    and o.created_at >= v_start_date
  group by date_trunc(v_date_trunc, o.created_at)
  order by date_trunc(v_date_trunc, o.created_at);
end;
$$ language plpgsql security definer;

-- =============================================================================
-- TOP COURSES BY REVENUE
-- =============================================================================

create or replace function get_top_courses_by_revenue(
  p_limit integer default 10
)
returns table (
  id uuid,
  title text,
  slug text,
  revenue bigint,
  orders bigint
) as $$
begin
  return query
  select
    c.id,
    c.title,
    c.slug,
    coalesce(sum(o.amount), 0)::bigint as revenue,
    count(o.id)::bigint as orders
  from public.courses c
  left join public.orders o on o.course_id = c.id and o.status = 'completed'
  group by c.id, c.title, c.slug
  having count(o.id) > 0
  order by revenue desc
  limit p_limit;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- OFFER ANALYTICS
-- =============================================================================

create or replace function get_offer_analytics(
  p_days integer default 30
)
returns table (
  offer_key text,
  offer_title text,
  impressions bigint,
  checkouts bigint,
  conversions bigint,
  conversion_rate numeric,
  revenue bigint
) as $$
declare
  v_start_date timestamptz;
begin
  v_start_date := current_date - (p_days || ' days')::interval;

  return query
  select
    o.key as offer_key,
    o.title as offer_title,
    (
      select count(*)::bigint
      from public.offer_impressions i
      where i.offer_key = o.key
        and i.created_at >= v_start_date
    ) as impressions,
    (
      select count(*)::bigint
      from public.checkout_attempts ca
      where ca.offer_key = o.key
        and ca.created_at >= v_start_date
    ) as checkouts,
    (
      select count(*)::bigint
      from public.checkout_attempts ca
      where ca.offer_key = o.key
        and ca.status = 'completed'
        and ca.created_at >= v_start_date
    ) as conversions,
    case
      when (
        select count(*)::numeric
        from public.checkout_attempts ca
        where ca.offer_key = o.key
          and ca.created_at >= v_start_date
      ) > 0
      then round(
        (
          select count(*)::numeric
          from public.checkout_attempts ca
          where ca.offer_key = o.key
            and ca.status = 'completed'
            and ca.created_at >= v_start_date
        ) * 100.0 / (
          select count(*)::numeric
          from public.checkout_attempts ca
          where ca.offer_key = o.key
            and ca.created_at >= v_start_date
        ),
        2
      )
      else 0
    end as conversion_rate,
    0::bigint as revenue -- TODO: Link to orders via stripe_session_id
  from public.offers o
  where o.is_active = true
  order by conversions desc;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Allow authenticated users to call these functions
grant execute on function get_revenue_timeseries(text, integer) to authenticated;
grant execute on function get_top_courses_by_revenue(integer) to authenticated;
grant execute on function get_offer_analytics(integer) to authenticated;
