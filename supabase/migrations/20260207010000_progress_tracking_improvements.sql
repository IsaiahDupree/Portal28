-- Portal28 Academy - Student Progress Tracking Improvements
-- feat-213: Enhanced completion tracking, time spent metrics, quiz score aggregation
-- Test ID: GAP-PROG-001

-- =============================================================================
-- ADD TIME SPENT TRACKING TO LESSON PROGRESS
-- =============================================================================

-- Add time_spent_seconds column to track total time spent on each lesson
alter table public.lesson_progress
add column if not exists time_spent_seconds int not null default 0;

-- Add last_activity_timestamp for session tracking
alter table public.lesson_progress
add column if not exists last_activity_timestamp timestamptz;

-- =============================================================================
-- ENHANCED COURSE PROGRESS VIEW
-- =============================================================================

-- Drop and recreate course_progress view with quiz score aggregation
drop view if exists public.course_progress;

create or replace view public.course_progress as
select
  lp.user_id,
  lp.course_id,
  count(distinct lp.lesson_id) as lessons_started,
  count(distinct case when lp.status = 'completed' then lp.lesson_id end) as lessons_completed,
  (select count(*) from public.lessons l
   join public.modules m on l.module_id = m.id
   where m.course_id = lp.course_id) as total_lessons,
  round(
    count(distinct case when lp.status = 'completed' then lp.lesson_id end)::numeric /
    nullif((select count(*) from public.lessons l
            join public.modules m on l.module_id = m.id
            where m.course_id = lp.course_id), 0) * 100,
    0
  )::int as completion_percent,
  max(lp.last_accessed_at) as last_accessed_at,
  -- NEW: Aggregate time spent across all lessons in course
  sum(lp.time_spent_seconds) as total_time_spent_seconds,
  -- NEW: Average quiz score across all quiz attempts in course
  (
    select round(avg(qa.score / nullif(qa.max_score, 0) * 100), 1)
    from public.quiz_attempts qa
    join public.lessons l on qa.lesson_id = l.id
    join public.modules m on l.module_id = m.id
    where m.course_id = lp.course_id
      and qa.user_id = lp.user_id
      and qa.score is not null
      and qa.max_score > 0
  ) as avg_quiz_score_percent,
  -- NEW: Count of quizzes attempted
  (
    select count(distinct qa.lesson_id)
    from public.quiz_attempts qa
    join public.lessons l on qa.lesson_id = l.id
    join public.modules m on l.module_id = m.id
    where m.course_id = lp.course_id
      and qa.user_id = lp.user_id
  ) as quizzes_attempted,
  -- NEW: Count of quizzes passed (>= 70%)
  (
    select count(distinct qa.lesson_id)
    from public.quiz_attempts qa
    join public.lessons l on qa.lesson_id = l.id
    join public.modules m on l.module_id = m.id
    where m.course_id = lp.course_id
      and qa.user_id = lp.user_id
      and qa.score is not null
      and qa.max_score > 0
      and (qa.score::numeric / qa.max_score * 100) >= 70
  ) as quizzes_passed
from public.lesson_progress lp
group by lp.user_id, lp.course_id;

-- =============================================================================
-- USER PROGRESS SUMMARY VIEW
-- =============================================================================

-- Create a new view for user dashboard showing all course progress
create or replace view public.user_progress_summary as
select
  cp.user_id,
  cp.course_id,
  c.title as course_title,
  c.slug as course_slug,
  cp.lessons_completed,
  cp.total_lessons,
  cp.completion_percent,
  cp.total_time_spent_seconds,
  cp.avg_quiz_score_percent,
  cp.quizzes_attempted,
  cp.quizzes_passed,
  cp.last_accessed_at,
  -- Calculate estimated time remaining (assuming 10 min per lesson)
  ((cp.total_lessons - cp.lessons_completed) * 600) as estimated_time_remaining_seconds
from public.course_progress cp
join public.courses c on cp.course_id = c.id
order by cp.last_accessed_at desc nulls last;

-- =============================================================================
-- FUNCTION: UPDATE TIME SPENT
-- =============================================================================

-- Function to update time spent on a lesson
-- Called by frontend with session duration
create or replace function public.update_lesson_time_spent(
  p_user_id uuid,
  p_lesson_id uuid,
  p_course_id uuid,
  p_seconds_to_add int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Update existing record or insert new one
  insert into public.lesson_progress (
    user_id,
    lesson_id,
    course_id,
    time_spent_seconds,
    last_activity_timestamp,
    last_accessed_at
  )
  values (
    p_user_id,
    p_lesson_id,
    p_course_id,
    p_seconds_to_add,
    now(),
    now()
  )
  on conflict (user_id, lesson_id)
  do update set
    time_spent_seconds = lesson_progress.time_spent_seconds + p_seconds_to_add,
    last_activity_timestamp = now(),
    last_accessed_at = now();
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.update_lesson_time_spent(uuid, uuid, uuid, int) to authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

comment on column public.lesson_progress.time_spent_seconds is
  'Total time spent on this lesson in seconds (tracked via client-side sessions)';

comment on column public.lesson_progress.last_activity_timestamp is
  'Timestamp of last activity for session timeout detection';

comment on view public.course_progress is
  'Aggregated course progress including time spent and quiz scores';

comment on view public.user_progress_summary is
  'User dashboard view showing progress across all enrolled courses';

comment on function public.update_lesson_time_spent(uuid, uuid, uuid, int) is
  'Updates time spent on a lesson by adding session duration';
