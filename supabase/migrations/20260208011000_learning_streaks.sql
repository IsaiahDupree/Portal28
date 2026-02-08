-- Learning Streaks System
-- Tracks daily learning activity and streaks for user engagement

-- =====================================================
-- TABLE: learning_streaks
-- =====================================================
CREATE TABLE IF NOT EXISTS learning_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_date DATE,
  streak_started_at DATE,
  total_learning_days INTEGER DEFAULT 0 CHECK (total_learning_days >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_learning_streaks_user_id ON learning_streaks(user_id);
CREATE INDEX idx_learning_streaks_current_streak ON learning_streaks(current_streak DESC);
CREATE INDEX idx_learning_streaks_longest_streak ON learning_streaks(longest_streak DESC);

-- =====================================================
-- TABLE: streak_activity_log
-- =====================================================
-- Logs each day's learning activity for history tracking
CREATE TABLE IF NOT EXISTS streak_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  lessons_completed INTEGER DEFAULT 0,
  minutes_studied INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

CREATE INDEX idx_streak_activity_user_date ON streak_activity_log(user_id, activity_date DESC);

-- =====================================================
-- FUNCTION: update_learning_streak
-- =====================================================
-- Updates or initializes a user's streak when they complete a lesson
CREATE OR REPLACE FUNCTION update_learning_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_current_streak learning_streaks;
  v_last_activity DATE;
  v_new_streak INTEGER;
  v_new_longest INTEGER;
BEGIN
  -- Get or create streak record
  SELECT * INTO v_current_streak
  FROM learning_streaks
  WHERE user_id = p_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO learning_streaks (
      user_id,
      current_streak,
      longest_streak,
      last_activity_date,
      streak_started_at,
      total_learning_days
    ) VALUES (
      p_user_id,
      1,
      1,
      v_today,
      v_today,
      1
    );
    RETURN;
  END IF;

  v_last_activity := v_current_streak.last_activity_date;

  -- Don't update if already logged activity today
  IF v_last_activity = v_today THEN
    RETURN;
  END IF;

  -- Calculate new streak
  IF v_last_activity = v_yesterday THEN
    -- Continuing streak
    v_new_streak := v_current_streak.current_streak + 1;
  ELSIF v_last_activity IS NULL OR v_last_activity < v_yesterday THEN
    -- Streak broken, start new
    v_new_streak := 1;
  ELSE
    -- This shouldn't happen, but handle it
    v_new_streak := 1;
  END IF;

  -- Update longest streak if current is higher
  v_new_longest := GREATEST(v_current_streak.longest_streak, v_new_streak);

  -- Update the streak record
  UPDATE learning_streaks
  SET
    current_streak = v_new_streak,
    longest_streak = v_new_longest,
    last_activity_date = v_today,
    streak_started_at = CASE
      WHEN v_new_streak = 1 THEN v_today
      ELSE streak_started_at
    END,
    total_learning_days = total_learning_days + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: log_streak_activity
-- =====================================================
-- Logs daily activity details
CREATE OR REPLACE FUNCTION log_streak_activity(
  p_user_id UUID,
  p_lessons_completed INTEGER DEFAULT 1,
  p_minutes_studied INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO streak_activity_log (
    user_id,
    activity_date,
    lessons_completed,
    minutes_studied
  ) VALUES (
    p_user_id,
    CURRENT_DATE,
    p_lessons_completed,
    p_minutes_studied
  )
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    lessons_completed = streak_activity_log.lessons_completed + EXCLUDED.lessons_completed,
    minutes_studied = streak_activity_log.minutes_studied + EXCLUDED.minutes_studied;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: get_user_streak_stats
-- =====================================================
-- Returns comprehensive streak statistics for a user
CREATE OR REPLACE FUNCTION get_user_streak_stats(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  total_learning_days INTEGER,
  last_activity_date DATE,
  streak_started_at DATE,
  days_this_week INTEGER,
  days_this_month INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.current_streak,
    ls.longest_streak,
    ls.total_learning_days,
    ls.last_activity_date,
    ls.streak_started_at,
    -- Days active this week
    (SELECT COUNT(DISTINCT activity_date)::INTEGER
     FROM streak_activity_log
     WHERE user_id = p_user_id
       AND activity_date >= DATE_TRUNC('week', CURRENT_DATE)
    ) as days_this_week,
    -- Days active this month
    (SELECT COUNT(DISTINCT activity_date)::INTEGER
     FROM streak_activity_log
     WHERE user_id = p_user_id
       AND activity_date >= DATE_TRUNC('month', CURRENT_DATE)
    ) as days_this_month
  FROM learning_streaks ls
  WHERE ls.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: check_streak_freeze
-- =====================================================
-- Checks if a streak is at risk (not logged today)
CREATE OR REPLACE FUNCTION check_streak_freeze(p_user_id UUID)
RETURNS TABLE (
  streak_at_risk BOOLEAN,
  last_activity_date DATE,
  current_streak INTEGER,
  hours_until_reset INTEGER
) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_activity DATE;
  v_current_streak INTEGER;
BEGIN
  SELECT ls.last_activity_date, ls.current_streak
  INTO v_last_activity, v_current_streak
  FROM learning_streaks ls
  WHERE ls.user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::DATE, 0, 0;
    RETURN;
  END IF;

  -- Streak is at risk if last activity was yesterday or earlier
  RETURN QUERY SELECT
    (v_last_activity < v_today) as streak_at_risk,
    v_last_activity,
    v_current_streak,
    -- Hours until midnight (when streak would reset)
    EXTRACT(HOUR FROM (DATE_TRUNC('day', NOW() + INTERVAL '1 day') - NOW()))::INTEGER as hours_until_reset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Auto-update streak on lesson completion
-- =====================================================
-- This trigger automatically updates streaks when lesson_progress is marked complete
CREATE OR REPLACE FUNCTION trigger_update_streak_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update streak when lesson is completed (not just updated)
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    PERFORM update_learning_streak(NEW.user_id);
    PERFORM log_streak_activity(NEW.user_id, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_streak_on_lesson_complete ON lesson_progress;
CREATE TRIGGER update_streak_on_lesson_complete
  AFTER INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_streak_on_completion();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE learning_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak
DROP POLICY IF EXISTS "Users can view own streak" ON learning_streaks;
CREATE POLICY "Users can view own streak"
  ON learning_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert/update streaks (via functions)
DROP POLICY IF EXISTS "System can manage streaks" ON learning_streaks;
CREATE POLICY "System can manage streaks"
  ON learning_streaks FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can view their own activity log
DROP POLICY IF EXISTS "Users can view own activity" ON streak_activity_log;
CREATE POLICY "Users can view own activity"
  ON streak_activity_log FOR SELECT
  USING (auth.uid() = user_id);

-- System can manage activity logs
DROP POLICY IF EXISTS "System can manage activity" ON streak_activity_log;
CREATE POLICY "System can manage activity"
  ON streak_activity_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE learning_streaks IS 'Tracks user learning streaks and engagement metrics';
COMMENT ON TABLE streak_activity_log IS 'Daily log of user learning activity';
COMMENT ON FUNCTION update_learning_streak IS 'Updates user streak when activity is recorded';
COMMENT ON FUNCTION get_user_streak_stats IS 'Returns comprehensive streak statistics for a user';
COMMENT ON FUNCTION check_streak_freeze IS 'Checks if a user streak is at risk of breaking';
