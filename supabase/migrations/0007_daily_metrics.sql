-- Portal28 Academy - Daily Metrics Rollup Table
-- For fast dashboard queries

create table if not exists public.email_metrics_daily (
  day date not null,
  program_id uuid references public.email_programs(id) on delete cascade,
  version_id uuid references public.email_versions(id) on delete set null,
  
  -- Counts
  sent integer not null default 0,
  delivered integer not null default 0,
  opened integer not null default 0,
  clicked integer not null default 0,
  human_clicked integer not null default 0,
  replied integer not null default 0,
  bounced integer not null default 0,
  complained integer not null default 0,
  unsubscribed integer not null default 0,
  
  -- Unique counts (deduplicated by contact)
  unique_opened integer not null default 0,
  unique_clicked integer not null default 0,
  
  -- Revenue attribution
  attributed_revenue_cents integer default 0,
  attributed_orders integer default 0,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  primary key (day, program_id)
);

-- Index for time-series queries
create index idx_email_metrics_daily_day on public.email_metrics_daily(day desc);
create index idx_email_metrics_daily_program on public.email_metrics_daily(program_id, day desc);

-- Function to refresh daily metrics for a program
create or replace function refresh_daily_metrics(p_program_id uuid, p_day date default current_date)
returns void as $$
declare
  v_sent integer;
  v_delivered integer;
  v_opened integer;
  v_clicked integer;
  v_human_clicked integer;
  v_replied integer;
  v_bounced integer;
  v_complained integer;
  v_unique_opened integer;
  v_unique_clicked integer;
begin
  -- Count sends
  select count(*) into v_sent
  from public.email_sends
  where program_id = p_program_id
    and date(created_at) = p_day;
  
  -- Count by status
  select
    count(*) filter (where status = 'delivered'),
    count(*) filter (where status = 'bounced'),
    count(*) filter (where status = 'complained')
  into v_delivered, v_bounced, v_complained
  from public.email_sends
  where program_id = p_program_id
    and date(created_at) = p_day;
  
  -- Count events
  select
    count(*) filter (where event_type = 'opened'),
    count(*) filter (where event_type = 'clicked'),
    count(*) filter (where event_type = 'clicked' and is_suspected_bot = false),
    count(*) filter (where event_type = 'replied'),
    count(distinct case when event_type = 'opened' then email end),
    count(distinct case when event_type = 'clicked' then email end)
  into v_opened, v_clicked, v_human_clicked, v_replied, v_unique_opened, v_unique_clicked
  from public.email_events e
  join public.email_sends s on e.send_id = s.id
  where s.program_id = p_program_id
    and date(e.created_at) = p_day;
  
  -- Upsert daily metrics
  insert into public.email_metrics_daily (
    day, program_id, sent, delivered, opened, clicked, human_clicked,
    replied, bounced, complained, unique_opened, unique_clicked
  )
  values (
    p_day, p_program_id, v_sent, v_delivered, v_opened, v_clicked, v_human_clicked,
    v_replied, v_bounced, v_complained, v_unique_opened, v_unique_clicked
  )
  on conflict (day, program_id) do update set
    sent = excluded.sent,
    delivered = excluded.delivered,
    opened = excluded.opened,
    clicked = excluded.clicked,
    human_clicked = excluded.human_clicked,
    replied = excluded.replied,
    bounced = excluded.bounced,
    complained = excluded.complained,
    unique_opened = excluded.unique_opened,
    unique_clicked = excluded.unique_clicked,
    updated_at = now();
end;
$$ language plpgsql;

-- Function to get time-series data for charts
create or replace function get_program_metrics_timeseries(
  p_program_id uuid,
  p_days integer default 30
)
returns table (
  day date,
  sent integer,
  delivered integer,
  opened integer,
  clicked integer,
  human_clicked integer,
  replied integer,
  open_rate numeric,
  click_rate numeric,
  human_click_rate numeric
) as $$
begin
  return query
  select
    m.day,
    m.sent,
    m.delivered,
    m.opened,
    m.clicked,
    m.human_clicked,
    m.replied,
    case when m.delivered > 0 
      then round((m.unique_opened::numeric / m.delivered) * 100, 2) 
      else 0 
    end as open_rate,
    case when m.delivered > 0 
      then round((m.unique_clicked::numeric / m.delivered) * 100, 2) 
      else 0 
    end as click_rate,
    case when m.delivered > 0 
      then round((m.human_clicked::numeric / m.delivered) * 100, 2) 
      else 0 
    end as human_click_rate
  from public.email_metrics_daily m
  where m.program_id = p_program_id
    and m.day >= current_date - p_days
  order by m.day;
end;
$$ language plpgsql;

-- Function to attribute revenue to a program
create or replace function attribute_revenue_to_program(p_program_id uuid, p_revenue_cents integer)
returns void as $$
begin
  insert into public.email_program_stats (program_id, attributed_revenue_cents, attributed_orders)
  values (p_program_id, p_revenue_cents, 1)
  on conflict (program_id) do update set
    attributed_revenue_cents = email_program_stats.attributed_revenue_cents + excluded.attributed_revenue_cents,
    attributed_orders = email_program_stats.attributed_orders + 1,
    computed_at = now();
end;
$$ language plpgsql;

-- Enable RLS
alter table public.email_metrics_daily enable row level security;

-- Trigger to update updated_at
create trigger email_metrics_daily_updated_at
  before update on public.email_metrics_daily
  for each row
  execute function update_updated_at_column();
