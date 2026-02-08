-- Community Leaderboards System
-- Tracks user rankings based on achievement points, streaks, and learning activity

-- =====================================================
-- TABLE: leaderboard_cache
-- =====================================================
-- Caches leaderboard data for performance (refreshed periodically)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  achievements_count INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  overall_rank INTEGER,
  weekly_rank INTEGER,
  monthly_rank INTEGER,
  weekly_points INTEGER DEFAULT 0,
  monthly_points INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leaderboard_overall_rank ON leaderboard_cache(overall_rank) WHERE overall_rank IS NOT NULL;
CREATE INDEX idx_leaderboard_weekly_rank ON leaderboard_cache(weekly_rank) WHERE weekly_rank IS NOT NULL;
CREATE INDEX idx_leaderboard_monthly_rank ON leaderboard_cache(monthly_rank) WHERE monthly_rank IS NOT NULL;
CREATE INDEX idx_leaderboard_total_points ON leaderboard_cache(total_points DESC);

-- =====================================================
-- FUNCTION: refresh_leaderboard_cache
-- =====================================================
-- Refreshes the leaderboard cache with current data
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS VOID AS $$
BEGIN
  -- Clear old cache
  TRUNCATE leaderboard_cache;

  -- Calculate and insert new rankings
  WITH user_stats AS (
    SELECT
      u.id as user_id,
      p.display_name,
      p.avatar_url,
      -- Total points from achievements
      COALESCE((
        SELECT SUM(ad.points)
        FROM user_achievements ua
        JOIN achievement_definitions ad ON ua.achievement_id = ad.id
        WHERE ua.user_id = u.id
      ), 0) as total_points,
      -- Achievement count
      COALESCE((
        SELECT COUNT(*)
        FROM user_achievements ua
        WHERE ua.user_id = u.id
      ), 0) as achievements_count,
      -- Current streak
      COALESCE((
        SELECT current_streak
        FROM learning_streaks ls
        WHERE ls.user_id = u.id
      ), 0) as current_streak,
      -- Lessons completed
      COALESCE((
        SELECT COUNT(*)
        FROM lesson_progress lp
        WHERE lp.user_id = u.id AND lp.completed = true
      ), 0) as lessons_completed,
      -- Weekly points (achievements unlocked this week)
      COALESCE((
        SELECT SUM(ad.points)
        FROM user_achievements ua
        JOIN achievement_definitions ad ON ua.achievement_id = ad.id
        WHERE ua.user_id = u.id
          AND ua.unlocked_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP)
      ), 0) as weekly_points,
      -- Monthly points (achievements unlocked this month)
      COALESCE((
        SELECT SUM(ad.points)
        FROM user_achievements ua
        JOIN achievement_definitions ad ON ua.achievement_id = ad.id
        WHERE ua.user_id = u.id
          AND ua.unlocked_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
      ), 0) as monthly_points
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id IN (
      -- Only include users with at least one achievement or lesson completed
      SELECT DISTINCT user_id FROM user_achievements
      UNION
      SELECT DISTINCT user_id FROM lesson_progress WHERE completed = true
    )
  ),
  ranked_stats AS (
    SELECT
      *,
      RANK() OVER (ORDER BY total_points DESC, achievements_count DESC, current_streak DESC) as overall_rank,
      RANK() OVER (ORDER BY weekly_points DESC, total_points DESC) as weekly_rank,
      RANK() OVER (ORDER BY monthly_points DESC, total_points DESC) as monthly_rank
    FROM user_stats
  )
  INSERT INTO leaderboard_cache (
    user_id,
    display_name,
    avatar_url,
    total_points,
    achievements_count,
    current_streak,
    lessons_completed,
    overall_rank,
    weekly_rank,
    monthly_rank,
    weekly_points,
    monthly_points,
    last_updated
  )
  SELECT
    user_id,
    display_name,
    avatar_url,
    total_points,
    achievements_count,
    current_streak,
    lessons_completed,
    overall_rank,
    weekly_rank,
    monthly_rank,
    weekly_points,
    monthly_points,
    now()
  FROM ranked_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: get_leaderboard
-- =====================================================
-- Returns leaderboard rankings for a specific period
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_period TEXT DEFAULT 'overall', -- 'overall', 'weekly', 'monthly'
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  rank INTEGER,
  points INTEGER,
  achievements_count INTEGER,
  current_streak INTEGER,
  lessons_completed INTEGER
) AS $$
BEGIN
  -- Refresh cache if it's older than 5 minutes
  IF NOT EXISTS (
    SELECT 1 FROM leaderboard_cache
    WHERE last_updated > now() - INTERVAL '5 minutes'
  ) THEN
    PERFORM refresh_leaderboard_cache();
  END IF;

  RETURN QUERY
  SELECT
    lc.user_id,
    lc.display_name,
    lc.avatar_url,
    CASE p_period
      WHEN 'weekly' THEN lc.weekly_rank
      WHEN 'monthly' THEN lc.monthly_rank
      ELSE lc.overall_rank
    END as rank,
    CASE p_period
      WHEN 'weekly' THEN lc.weekly_points
      WHEN 'monthly' THEN lc.monthly_points
      ELSE lc.total_points
    END as points,
    lc.achievements_count,
    lc.current_streak,
    lc.lessons_completed
  FROM leaderboard_cache lc
  WHERE CASE p_period
    WHEN 'weekly' THEN lc.weekly_rank IS NOT NULL
    WHEN 'monthly' THEN lc.monthly_rank IS NOT NULL
    ELSE lc.overall_rank IS NOT NULL
  END
  ORDER BY
    CASE p_period
      WHEN 'weekly' THEN lc.weekly_rank
      WHEN 'monthly' THEN lc.monthly_rank
      ELSE lc.overall_rank
    END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: get_user_rank
-- =====================================================
-- Returns a specific user's rank and nearby competitors
CREATE OR REPLACE FUNCTION get_user_rank(
  p_user_id UUID,
  p_period TEXT DEFAULT 'overall'
)
RETURNS TABLE (
  user_rank INTEGER,
  total_users INTEGER,
  points INTEGER,
  above_user_id UUID,
  above_user_name TEXT,
  above_user_points INTEGER,
  below_user_id UUID,
  below_user_name TEXT,
  below_user_points INTEGER
) AS $$
DECLARE
  v_rank INTEGER;
  v_points INTEGER;
BEGIN
  -- Get user's rank and points
  SELECT
    CASE p_period
      WHEN 'weekly' THEN lc.weekly_rank
      WHEN 'monthly' THEN lc.monthly_rank
      ELSE lc.overall_rank
    END,
    CASE p_period
      WHEN 'weekly' THEN lc.weekly_points
      WHEN 'monthly' THEN lc.monthly_points
      ELSE lc.total_points
    END
  INTO v_rank, v_points
  FROM leaderboard_cache lc
  WHERE lc.user_id = p_user_id;

  IF v_rank IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v_rank as user_rank,
    (SELECT COUNT(*)::INTEGER FROM leaderboard_cache) as total_users,
    v_points as points,
    -- User above
    (SELECT user_id FROM leaderboard_cache
     WHERE CASE p_period
       WHEN 'weekly' THEN weekly_rank = v_rank - 1
       WHEN 'monthly' THEN monthly_rank = v_rank - 1
       ELSE overall_rank = v_rank - 1
     END
     LIMIT 1) as above_user_id,
    (SELECT display_name FROM leaderboard_cache
     WHERE CASE p_period
       WHEN 'weekly' THEN weekly_rank = v_rank - 1
       WHEN 'monthly' THEN monthly_rank = v_rank - 1
       ELSE overall_rank = v_rank - 1
     END
     LIMIT 1) as above_user_name,
    (SELECT CASE p_period
       WHEN 'weekly' THEN weekly_points
       WHEN 'monthly' THEN monthly_points
       ELSE total_points
     END FROM leaderboard_cache
     WHERE CASE p_period
       WHEN 'weekly' THEN weekly_rank = v_rank - 1
       WHEN 'monthly' THEN monthly_rank = v_rank - 1
       ELSE overall_rank = v_rank - 1
     END
     LIMIT 1) as above_user_points,
    -- User below
    (SELECT user_id FROM leaderboard_cache
     WHERE CASE p_period
       WHEN 'weekly' THEN weekly_rank = v_rank + 1
       WHEN 'monthly' THEN monthly_rank = v_rank + 1
       ELSE overall_rank = v_rank + 1
     END
     LIMIT 1) as below_user_id,
    (SELECT display_name FROM leaderboard_cache
     WHERE CASE p_period
       WHEN 'weekly' THEN weekly_rank = v_rank + 1
       WHEN 'monthly' THEN monthly_rank = v_rank + 1
       ELSE overall_rank = v_rank + 1
     END
     LIMIT 1) as below_user_name,
    (SELECT CASE p_period
       WHEN 'weekly' THEN weekly_points
       WHEN 'monthly' THEN monthly_points
       ELSE total_points
     END FROM leaderboard_cache
     WHERE CASE p_period
       WHEN 'weekly' THEN weekly_rank = v_rank + 1
       WHEN 'monthly' THEN monthly_rank = v_rank + 1
       ELSE overall_rank = v_rank + 1
     END
     LIMIT 1) as below_user_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Initial cache population
-- =====================================================
SELECT refresh_leaderboard_cache();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can view leaderboard (public data)
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard_cache;
CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard_cache FOR SELECT
  USING (true);

-- Only system can update cache
DROP POLICY IF EXISTS "System can manage cache" ON leaderboard_cache;
CREATE POLICY "System can manage cache"
  ON leaderboard_cache FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE leaderboard_cache IS 'Cached leaderboard rankings for performance';
COMMENT ON FUNCTION refresh_leaderboard_cache IS 'Refreshes leaderboard cache with current data';
COMMENT ON FUNCTION get_leaderboard IS 'Returns leaderboard rankings for a specific period';
COMMENT ON FUNCTION get_user_rank IS 'Returns a user rank and nearby competitors';
