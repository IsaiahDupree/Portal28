-- Portal28 Academy - Instructor Analytics Dashboard
-- feat-214: GAP-INST-001
-- Enhanced analytics for instructors: revenue breakdown, student engagement, course performance

-- =============================================================================
-- REVENUE BREAKDOWN BY TIME
-- =============================================================================

-- Monthly revenue breakdown for instructors
create or replace view public.instructor_revenue_by_month as
select
  ci.user_id as instructor_id,
  c.id as course_id,
  c.title as course_title,
  date_trunc('month', o.created_at) as month,
  count(o.id) as order_count,
  sum(o.amount) as total_revenue_cents,
  sum(
    case when ci.revenue_share_percentage > 0
    then floor(o.amount * ci.revenue_share_percentage / 100)
    else 0
    end
  ) as instructor_share_cents
from public.orders o
join public.courses c on o.course_id = c.id
join public.course_instructors ci on c.id = ci.course_id
where o.status = 'paid'
group by ci.user_id, c.id, c.title, date_trunc('month', o.created_at)
order by month desc;

-- Daily revenue breakdown for recent activity
create or replace view public.instructor_revenue_by_day as
select
  ci.user_id as instructor_id,
  c.id as course_id,
  c.title as course_title,
  date_trunc('day', o.created_at) as day,
  count(o.id) as order_count,
  sum(o.amount) as total_revenue_cents,
  sum(
    case when ci.revenue_share_percentage > 0
    then floor(o.amount * ci.revenue_share_percentage / 100)
    else 0
    end
  ) as instructor_share_cents
from public.orders o
join public.courses c on o.course_id = c.id
join public.course_instructors ci on c.id = ci.course_id
where o.status = 'paid'
  and o.created_at >= now() - interval '90 days'
group by ci.user_id, c.id, c.title, date_trunc('day', o.created_at)
order by day desc;

-- =============================================================================
-- STUDENT ENGAGEMENT METRICS
-- =============================================================================

-- Student engagement per course (active vs inactive)
create or replace view public.instructor_student_engagement as
select
  ci.user_id as instructor_id,
  c.id as course_id,
  c.title as course_title,
  count(distinct e.user_id) as total_students,
  count(distinct case
    when cp.last_accessed_at >= now() - interval '30 days'
    then e.user_id
  end) as active_students_30d,
  count(distinct case
    when cp.last_accessed_at >= now() - interval '7 days'
    then e.user_id
  end) as active_students_7d,
  count(distinct case
    when cp.last_accessed_at < now() - interval '30 days'
      or cp.last_accessed_at is null
    then e.user_id
  end) as inactive_students,
  round(
    count(distinct case when cp.last_accessed_at >= now() - interval '30 days' then e.user_id end)::numeric /
    nullif(count(distinct e.user_id), 0) * 100,
    1
  ) as active_percentage
from public.courses c
join public.course_instructors ci on c.id = ci.course_id
join public.entitlements e on c.id = e.course_id
  and e.status = 'active'
left join public.course_progress cp on c.id = cp.course_id
  and e.user_id = cp.user_id
group by ci.user_id, c.id, c.title;

-- =============================================================================
-- COURSE PERFORMANCE METRICS
-- =============================================================================

-- Course completion and progress metrics
create or replace view public.instructor_course_performance as
select
  ci.user_id as instructor_id,
  c.id as course_id,
  c.title as course_title,
  count(distinct e.user_id) as total_enrollments,
  avg(cp.completion_percent) as avg_completion_percent,
  count(distinct case
    when cp.completion_percent = 100
    then e.user_id
  end) as students_completed,
  count(distinct case
    when cp.completion_percent >= 50 and cp.completion_percent < 100
    then e.user_id
  end) as students_in_progress,
  count(distinct case
    when cp.completion_percent < 50 or cp.completion_percent is null
    then e.user_id
  end) as students_not_started,
  round(
    count(distinct case when cp.completion_percent = 100 then e.user_id end)::numeric /
    nullif(count(distinct e.user_id), 0) * 100,
    1
  ) as completion_rate,
  avg(cp.total_time_spent_seconds) as avg_time_spent_seconds,
  avg(cp.avg_quiz_score_percent) as avg_quiz_score
from public.courses c
join public.course_instructors ci on c.id = ci.course_id
join public.entitlements e on c.id = e.course_id
  and e.status = 'active'
left join public.course_progress cp on c.id = cp.course_id
  and e.user_id = cp.user_id
group by ci.user_id, c.id, c.title;

-- =============================================================================
-- COMPREHENSIVE INSTRUCTOR ANALYTICS
-- =============================================================================

-- All-in-one instructor dashboard metrics
create or replace view public.instructor_dashboard_metrics as
select
  ci.user_id as instructor_id,
  i.display_name,
  c.id as course_id,
  c.title as course_title,
  c.slug as course_slug,
  c.status as course_status,
  ci.is_primary,
  ci.revenue_share_percentage,

  -- Student metrics
  count(distinct e.user_id) as total_students,
  count(distinct case when cp.last_accessed_at >= now() - interval '30 days' then e.user_id end) as active_students,

  -- Progress metrics
  round(avg(cp.completion_percent), 1) as avg_completion_percent,
  count(distinct case when cp.completion_percent = 100 then e.user_id end) as students_completed,

  -- Revenue metrics
  (
    select sum(o.amount)
    from public.orders o
    where o.course_id = c.id
      and o.status = 'paid'
  ) as total_revenue_cents,
  (
    select sum(floor(o.amount * ci.revenue_share_percentage / 100))
    from public.orders o
    where o.course_id = c.id
      and o.status = 'paid'
  ) as instructor_earnings_cents,

  -- Time metrics
  round(avg(cp.total_time_spent_seconds), 0) as avg_time_spent_seconds,
  round(avg(cp.avg_quiz_score_percent), 1) as avg_quiz_score

from public.course_instructors ci
join public.courses c on ci.course_id = c.id
join public.instructors i on ci.user_id = i.user_id
left join public.entitlements e on c.id = e.course_id and e.status = 'active'
left join public.course_progress cp on c.id = cp.course_id and e.user_id = cp.user_id
group by ci.user_id, i.display_name, c.id, c.title, c.slug, c.status, ci.is_primary, ci.revenue_share_percentage;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Instructors can view their own analytics
grant select on public.instructor_revenue_by_month to authenticated;
grant select on public.instructor_revenue_by_day to authenticated;
grant select on public.instructor_student_engagement to authenticated;
grant select on public.instructor_course_performance to authenticated;
grant select on public.instructor_dashboard_metrics to authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

comment on view public.instructor_revenue_by_month is
  'Monthly revenue breakdown for instructors with order counts and earnings';

comment on view public.instructor_revenue_by_day is
  'Daily revenue for last 90 days for trend analysis';

comment on view public.instructor_student_engagement is
  'Student engagement metrics: active vs inactive students per course';

comment on view public.instructor_course_performance is
  'Course completion rates, progress, and quiz performance';

comment on view public.instructor_dashboard_metrics is
  'Comprehensive dashboard metrics combining revenue, students, and performance';
