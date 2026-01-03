-- Portal28 Academy - Email Analytics Helper Functions

-- Function to increment send open count
create or replace function increment_send_opens(send_id uuid)
returns void as $$
begin
  update public.email_sends
  set open_count = coalesce(open_count, 0) + 1
  where id = send_id;
end;
$$ language plpgsql;

-- Function to increment send click counts
create or replace function increment_send_clicks(send_id uuid, is_human boolean)
returns void as $$
begin
  update public.email_sends
  set 
    click_count = coalesce(click_count, 0) + 1,
    human_click_count = case 
      when is_human then coalesce(human_click_count, 0) + 1 
      else coalesce(human_click_count, 0) 
    end
  where id = send_id;
end;
$$ language plpgsql;

-- Function to get program analytics summary
create or replace function get_program_analytics(p_program_id uuid)
returns table (
  total_sends bigint,
  total_delivered bigint,
  total_opened bigint,
  total_clicked bigint,
  total_human_clicked bigint,
  total_replied bigint,
  open_rate numeric,
  click_rate numeric,
  reply_rate numeric,
  human_click_rate numeric
) as $$
begin
  return query
  select
    count(*)::bigint as total_sends,
    count(*) filter (where status = 'delivered')::bigint as total_delivered,
    count(*) filter (where open_count > 0)::bigint as total_opened,
    count(*) filter (where click_count > 0)::bigint as total_clicked,
    count(*) filter (where human_click_count > 0)::bigint as total_human_clicked,
    count(*) filter (where is_replied = true)::bigint as total_replied,
    case 
      when count(*) filter (where status = 'delivered') > 0 
      then round((count(*) filter (where open_count > 0)::numeric / 
                  count(*) filter (where status = 'delivered')::numeric) * 100, 2)
      else 0 
    end as open_rate,
    case 
      when count(*) filter (where status = 'delivered') > 0 
      then round((count(*) filter (where click_count > 0)::numeric / 
                  count(*) filter (where status = 'delivered')::numeric) * 100, 2)
      else 0 
    end as click_rate,
    case 
      when count(*) filter (where status = 'delivered') > 0 
      then round((count(*) filter (where is_replied = true)::numeric / 
                  count(*) filter (where status = 'delivered')::numeric) * 100, 2)
      else 0 
    end as reply_rate,
    case 
      when count(*) filter (where status = 'delivered') > 0 
      then round((count(*) filter (where human_click_count > 0)::numeric / 
                  count(*) filter (where status = 'delivered')::numeric) * 100, 2)
      else 0 
    end as human_click_rate
  from public.email_sends
  where program_id = p_program_id;
end;
$$ language plpgsql;

-- Function to get top clicked links for a program
create or replace function get_top_links(p_program_id uuid, p_limit integer default 10)
returns table (
  clicked_link text,
  click_count bigint,
  human_click_count bigint,
  unique_clickers bigint
) as $$
begin
  return query
  select
    e.clicked_link,
    count(*)::bigint as click_count,
    count(*) filter (where e.is_suspected_bot = false)::bigint as human_click_count,
    count(distinct e.email)::bigint as unique_clickers
  from public.email_events e
  join public.email_sends s on e.send_id = s.id
  where s.program_id = p_program_id
    and e.event_type = 'clicked'
    and e.clicked_link is not null
  group by e.clicked_link
  order by human_click_count desc
  limit p_limit;
end;
$$ language plpgsql;

-- Function to get daily event stats for a program
create or replace function get_daily_stats(p_program_id uuid, p_days integer default 30)
returns table (
  day date,
  sends bigint,
  delivered bigint,
  opened bigint,
  clicked bigint,
  replied bigint
) as $$
begin
  return query
  with daily_events as (
    select
      date_trunc('day', e.created_at)::date as day,
      e.event_type
    from public.email_events e
    join public.email_sends s on e.send_id = s.id
    where s.program_id = p_program_id
      and e.created_at >= now() - (p_days || ' days')::interval
  )
  select
    d.day,
    count(*) filter (where event_type = 'sent')::bigint as sends,
    count(*) filter (where event_type = 'delivered')::bigint as delivered,
    count(*) filter (where event_type = 'opened')::bigint as opened,
    count(*) filter (where event_type = 'clicked')::bigint as clicked,
    count(*) filter (where event_type = 'replied')::bigint as replied
  from daily_events d
  group by d.day
  order by d.day;
end;
$$ language plpgsql;
