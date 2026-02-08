-- Achievement System
-- Tracks user achievements, badges, and milestones

-- =====================================================
-- TABLE: achievement_definitions
-- =====================================================
-- Defines all available achievements in the system
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- e.g., 'first_lesson', 'streak_7_days'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT, -- Icon name or emoji
  category TEXT NOT NULL, -- 'learning', 'streak', 'social', 'course'
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  tier TEXT DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  unlock_criteria JSONB NOT NULL, -- Flexible criteria object
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_achievement_definitions_key ON achievement_definitions(key);
CREATE INDEX idx_achievement_definitions_category ON achievement_definitions(category);
CREATE INDEX idx_achievement_definitions_active ON achievement_definitions(is_active) WHERE is_active = true;

-- =====================================================
-- TABLE: user_achievements
-- =====================================================
-- Tracks which achievements users have unlocked
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  progress JSONB, -- Current progress toward achievement
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(unlocked_at DESC);

-- =====================================================
-- TABLE: achievement_progress
-- =====================================================
-- Tracks ongoing progress toward achievements
CREATE TABLE IF NOT EXISTS achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  metadata JSONB, -- Additional tracking data
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_achievement_progress_user_id ON achievement_progress(user_id);
CREATE INDEX idx_achievement_progress_achievement_id ON achievement_progress(achievement_id);

-- =====================================================
-- FUNCTION: seed_default_achievements
-- =====================================================
-- Seeds the system with default achievements
CREATE OR REPLACE FUNCTION seed_default_achievements()
RETURNS VOID AS $$
BEGIN
  -- Learning Achievements
  INSERT INTO achievement_definitions (key, name, description, icon, category, points, tier, unlock_criteria) VALUES
    ('first_lesson', 'First Steps', 'Complete your first lesson', '🎯', 'learning', 10, 'bronze', '{"type": "lesson_count", "value": 1}'),
    ('lessons_10', 'Getting Started', 'Complete 10 lessons', '📚', 'learning', 50, 'bronze', '{"type": "lesson_count", "value": 10}'),
    ('lessons_50', 'Dedicated Learner', 'Complete 50 lessons', '🎓', 'learning', 200, 'silver', '{"type": "lesson_count", "value": 50}'),
    ('lessons_100', 'Century Club', 'Complete 100 lessons', '💯', 'learning', 500, 'gold', '{"type": "lesson_count", "value": 100}'),
    ('lessons_500', 'Master Student', 'Complete 500 lessons', '👑', 'learning', 2000, 'platinum', '{"type": "lesson_count", "value": 500}'),

    -- Streak Achievements
    ('streak_3', '3-Day Streak', 'Learn for 3 days in a row', '🔥', 'streak', 20, 'bronze', '{"type": "streak", "value": 3}'),
    ('streak_7', 'Week Warrior', 'Learn for 7 days in a row', '⚡', 'streak', 50, 'bronze', '{"type": "streak", "value": 7}'),
    ('streak_30', 'Monthly Master', 'Learn for 30 days in a row', '💪', 'streak', 200, 'silver', '{"type": "streak", "value": 30}'),
    ('streak_100', 'Century Streak', 'Learn for 100 days in a row', '🏆', 'streak', 1000, 'gold', '{"type": "streak", "value": 100}'),
    ('streak_365', 'Year-Long Learner', 'Learn for 365 days in a row', '🌟', 'streak', 5000, 'platinum', '{"type": "streak", "value": 365}'),

    -- Course Achievements
    ('course_1', 'Course Completer', 'Complete your first course', '✅', 'course', 100, 'bronze', '{"type": "course_count", "value": 1}'),
    ('course_3', 'Triple Threat', 'Complete 3 courses', '🎯', 'course', 300, 'silver', '{"type": "course_count", "value": 3}'),
    ('course_10', 'Knowledge Seeker', 'Complete 10 courses', '📖', 'course', 1000, 'gold', '{"type": "course_count", "value": 10}'),

    -- Social Achievements
    ('first_comment', 'Conversation Starter', 'Leave your first comment', '💬', 'social', 10, 'bronze', '{"type": "comment_count", "value": 1}'),
    ('comments_10', 'Community Member', 'Leave 10 comments', '🗣️', 'social', 50, 'bronze', '{"type": "comment_count", "value": 10}'),
    ('comments_50', 'Discussion Leader', 'Leave 50 comments', '👥', 'social', 200, 'silver', '{"type": "comment_count", "value": 50}')
  ON CONFLICT (key) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Seed default achievements
SELECT seed_default_achievements();

-- =====================================================
-- FUNCTION: check_and_unlock_achievements
-- =====================================================
-- Checks if user qualifies for any achievements and unlocks them
CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID, p_category TEXT DEFAULT NULL)
RETURNS TABLE (
  achievement_id UUID,
  achievement_key TEXT,
  achievement_name TEXT,
  newly_unlocked BOOLEAN
) AS $$
DECLARE
  v_achievement RECORD;
  v_criteria JSONB;
  v_current_value INTEGER;
  v_target_value INTEGER;
  v_already_unlocked BOOLEAN;
BEGIN
  -- Loop through all active achievements (optionally filtered by category)
  FOR v_achievement IN
    SELECT ad.id, ad.key, ad.name, ad.category, ad.unlock_criteria
    FROM achievement_definitions ad
    WHERE ad.is_active = true
      AND (p_category IS NULL OR ad.category = p_category)
    ORDER BY ad.display_order, ad.id
  LOOP
    v_criteria := v_achievement.unlock_criteria;

    -- Check if already unlocked
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_unlocked;

    IF v_already_unlocked THEN
      CONTINUE;
    END IF;

    -- Check criteria based on type
    CASE v_criteria->>'type'
      WHEN 'lesson_count' THEN
        v_target_value := (v_criteria->>'value')::INTEGER;
        SELECT COUNT(*)::INTEGER INTO v_current_value
        FROM lesson_progress
        WHERE user_id = p_user_id AND completed = true;

      WHEN 'streak' THEN
        v_target_value := (v_criteria->>'value')::INTEGER;
        SELECT COALESCE(current_streak, 0) INTO v_current_value
        FROM learning_streaks
        WHERE user_id = p_user_id;

      WHEN 'course_count' THEN
        v_target_value := (v_criteria->>'value')::INTEGER;
        -- Count courses where all lessons are complete
        SELECT COUNT(DISTINCT c.id)::INTEGER INTO v_current_value
        FROM courses c
        JOIN lessons l ON c.id = l.course_id
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = p_user_id
        GROUP BY c.id
        HAVING COUNT(l.id) = COUNT(lp.id) AND COUNT(lp.id FILTER (WHERE lp.completed = true)) = COUNT(l.id);

      WHEN 'comment_count' THEN
        v_target_value := (v_criteria->>'value')::INTEGER;
        SELECT COUNT(*)::INTEGER INTO v_current_value
        FROM lesson_comments
        WHERE user_id = p_user_id;

      ELSE
        CONTINUE; -- Unknown type, skip
    END CASE;

    -- Update or insert progress
    INSERT INTO achievement_progress (user_id, achievement_id, current_value, target_value, updated_at)
    VALUES (p_user_id, v_achievement.id, COALESCE(v_current_value, 0), v_target_value, now())
    ON CONFLICT (user_id, achievement_id)
    DO UPDATE SET
      current_value = EXCLUDED.current_value,
      updated_at = now();

    -- Check if achievement should be unlocked
    IF COALESCE(v_current_value, 0) >= v_target_value THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, jsonb_build_object('completed_at', now(), 'value', v_current_value))
      ON CONFLICT (user_id, achievement_id) DO NOTHING;

      -- Return this achievement as newly unlocked
      achievement_id := v_achievement.id;
      achievement_key := v_achievement.key;
      achievement_name := v_achievement.name;
      newly_unlocked := true;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: get_user_achievements
-- =====================================================
-- Returns all achievements for a user (unlocked and locked)
CREATE OR REPLACE FUNCTION get_user_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_id UUID,
  achievement_key TEXT,
  achievement_name TEXT,
  description TEXT,
  icon TEXT,
  category TEXT,
  points INTEGER,
  tier TEXT,
  is_unlocked BOOLEAN,
  unlocked_at TIMESTAMPTZ,
  current_progress INTEGER,
  target_value INTEGER,
  progress_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad.id,
    ad.key,
    ad.name,
    ad.description,
    ad.icon,
    ad.category,
    ad.points,
    ad.tier,
    ua.id IS NOT NULL as is_unlocked,
    ua.unlocked_at,
    COALESCE(ap.current_value, 0) as current_progress,
    COALESCE(ap.target_value, 0) as target_value,
    CASE
      WHEN ap.target_value > 0 THEN LEAST(100, (ap.current_value * 100 / ap.target_value))
      ELSE 0
    END as progress_percentage
  FROM achievement_definitions ad
  LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id AND ua.user_id = p_user_id
  LEFT JOIN achievement_progress ap ON ad.id = ap.achievement_id AND ap.user_id = p_user_id
  WHERE ad.is_active = true
  ORDER BY ad.category, ad.display_order, ad.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: get_user_achievement_stats
-- =====================================================
-- Returns summary statistics for a user's achievements
CREATE OR REPLACE FUNCTION get_user_achievement_stats(p_user_id UUID)
RETURNS TABLE (
  total_points INTEGER,
  achievements_unlocked INTEGER,
  achievements_total INTEGER,
  completion_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ad.points) FILTER (WHERE ua.id IS NOT NULL), 0)::INTEGER as total_points,
    COUNT(ua.id)::INTEGER as achievements_unlocked,
    COUNT(ad.id)::INTEGER as achievements_total,
    CASE
      WHEN COUNT(ad.id) > 0 THEN (COUNT(ua.id) * 100 / COUNT(ad.id))::INTEGER
      ELSE 0
    END as completion_percentage
  FROM achievement_definitions ad
  LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id AND ua.user_id = p_user_id
  WHERE ad.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Auto-check achievements on lesson completion
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_check_achievements_on_lesson()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    -- Check learning and course achievements
    PERFORM check_and_unlock_achievements(NEW.user_id, 'learning');
    PERFORM check_and_unlock_achievements(NEW.user_id, 'course');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_achievements_on_lesson ON lesson_progress;
CREATE TRIGGER check_achievements_on_lesson
  AFTER INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements_on_lesson();

-- =====================================================
-- TRIGGER: Auto-check achievements on streak update
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_check_achievements_on_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_streak != OLD.current_streak OR OLD IS NULL THEN
    -- Check streak achievements
    PERFORM check_and_unlock_achievements(NEW.user_id, 'streak');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_achievements_on_streak ON learning_streaks;
CREATE TRIGGER check_achievements_on_streak
  AFTER INSERT OR UPDATE ON learning_streaks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements_on_streak();

-- =====================================================
-- TRIGGER: Auto-check achievements on comment
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_check_achievements_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check social achievements
  PERFORM check_and_unlock_achievements(NEW.user_id, 'social');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_achievements_on_comment ON lesson_comments;
CREATE TRIGGER check_achievements_on_comment
  AFTER INSERT ON lesson_comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements_on_comment();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;

-- Everyone can view achievement definitions
DROP POLICY IF EXISTS "Anyone can view achievement definitions" ON achievement_definitions;
CREATE POLICY "Anyone can view achievement definitions"
  ON achievement_definitions FOR SELECT
  USING (is_active = true);

-- Users can view their own achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- System can manage achievements (via functions)
DROP POLICY IF EXISTS "System can manage achievements" ON user_achievements;
CREATE POLICY "System can manage achievements"
  ON user_achievements FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can view their own progress
DROP POLICY IF EXISTS "Users can view own progress" ON achievement_progress;
CREATE POLICY "Users can view own progress"
  ON achievement_progress FOR SELECT
  USING (auth.uid() = user_id);

-- System can manage progress (via functions)
DROP POLICY IF EXISTS "System can manage progress" ON achievement_progress;
CREATE POLICY "System can manage progress"
  ON achievement_progress FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admins can manage achievement definitions
DROP POLICY IF EXISTS "Admins can manage definitions" ON achievement_definitions;
CREATE POLICY "Admins can manage definitions"
  ON achievement_definitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE achievement_definitions IS 'Defines all available achievements in the system';
COMMENT ON TABLE user_achievements IS 'Tracks which achievements users have unlocked';
COMMENT ON TABLE achievement_progress IS 'Tracks ongoing progress toward achievements';
COMMENT ON FUNCTION check_and_unlock_achievements IS 'Checks if user qualifies for achievements and unlocks them';
COMMENT ON FUNCTION get_user_achievements IS 'Returns all achievements for a user with progress';
COMMENT ON FUNCTION get_user_achievement_stats IS 'Returns summary statistics for user achievements';
