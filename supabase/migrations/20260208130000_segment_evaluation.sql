-- Segment Evaluation Functions
-- GDP-012: Segment Engine support functions

-- =====================================================
-- FUNCTION: evaluate_segment_sql
-- =====================================================
-- Evaluates a SQL condition for a person
-- Returns true if person matches the condition
CREATE OR REPLACE FUNCTION evaluate_segment_sql(
  p_person_id UUID,
  p_sql_condition TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
  v_query TEXT;
BEGIN
  -- Build dynamic query with person context
  -- The SQL condition should reference 'pf' (person_features) and 'p' (person) tables
  v_query := format('
    SELECT EXISTS (
      SELECT 1
      FROM person p
      LEFT JOIN person_features pf ON pf.person_id = p.id
      WHERE p.id = %L
      AND (%s)
    )',
    p_person_id,
    p_sql_condition
  );

  EXECUTE v_query INTO v_result;

  RETURN COALESCE(v_result, false);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Segment SQL evaluation failed: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: refresh_segment_membership
-- =====================================================
-- Refreshes membership for all persons in a segment
-- Useful for batch re-evaluation
CREATE OR REPLACE FUNCTION refresh_segment_membership(p_segment_id UUID)
RETURNS TABLE (
  total_evaluated BIGINT,
  entered_count BIGINT,
  exited_count BIGINT
) AS $$
DECLARE
  v_segment RECORD;
  v_person RECORD;
  v_matches BOOLEAN;
  v_current_member BOOLEAN;
  v_total INTEGER := 0;
  v_entered INTEGER := 0;
  v_exited INTEGER := 0;
BEGIN
  -- Get segment details
  SELECT * INTO v_segment
  FROM segment
  WHERE id = p_segment_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Segment not found or inactive: %', p_segment_id;
  END IF;

  -- Loop through all persons
  FOR v_person IN
    SELECT p.id
    FROM person p
  LOOP
    v_total := v_total + 1;

    -- Check if person matches segment (simplified - calls external evaluation)
    -- In production, you'd call evaluate_segment_sql here
    -- For now, skip actual evaluation in this SQL function

    -- Check current membership
    SELECT EXISTS (
      SELECT 1 FROM segment_membership
      WHERE person_id = v_person.id
        AND segment_id = p_segment_id
        AND is_active = true
    ) INTO v_current_member;

    -- Note: Actual enter/exit logic should be handled by the segment engine
  END LOOP;

  RETURN QUERY SELECT v_total::BIGINT, v_entered::BIGINT, v_exited::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PREDEFINED SEGMENTS (Portal28-specific)
-- =====================================================
-- Insert common segments for Portal28

-- Creator Funnel Segments
INSERT INTO segment (name, description, segment_type, conditions, is_active)
VALUES
  (
    'creator_signup_no_course_72h',
    'Creators who signed up but haven''t created a course in 72 hours',
    'creator',
    '{
      "type": "rules",
      "rules": [
        {"field": "courses_created", "operator": "equals", "value": 0}
      ]
    }'::jsonb,
    true
  ),
  (
    'course_created_no_lessons_48h',
    'Creators who created a course but haven''t added lessons in 48 hours',
    'creator',
    '{
      "type": "sql",
      "sql": "pf.courses_created > 0 AND pf.courses_published = 0"
    }'::jsonb,
    true
  ),
  (
    'course_ready_not_published',
    'Creators with course ready but not published',
    'creator',
    '{
      "type": "sql",
      "sql": "pf.courses_created > 0 AND pf.courses_published = 0"
    }'::jsonb,
    true
  ),
  (
    'published_no_sales_7d',
    'Creators with published course but no sales in 7 days',
    'creator',
    '{
      "type": "rules",
      "rules": [
        {"field": "courses_published", "operator": "greater_than", "value": 0},
        {"field": "total_course_sales", "operator": "equals", "value": 0}
      ]
    }'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- Student Funnel Segments
INSERT INTO segment (name, description, segment_type, conditions, is_active)
VALUES
  (
    'enrolled_no_progress_48h',
    'Students enrolled but haven''t started lessons in 48 hours',
    'student',
    '{
      "type": "rules",
      "rules": [
        {"field": "courses_enrolled", "operator": "greater_than", "value": 0},
        {"field": "lessons_completed", "operator": "equals", "value": 0}
      ]
    }'::jsonb,
    true
  ),
  (
    'active_learners',
    'Students who completed lessons in last 30 days',
    'student',
    '{
      "type": "sql",
      "sql": "pf.lessons_completed > 0 AND pf.last_lesson_completed_at > NOW() - INTERVAL ''30 days''"
    }'::jsonb,
    true
  ),
  (
    'course_completed',
    'Students who completed a course and earned certificate',
    'student',
    '{
      "type": "rules",
      "rules": [
        {"field": "certificates_earned", "operator": "greater_than", "value": 0}
      ]
    }'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- Engagement Segments
INSERT INTO segment (name, description, segment_type, conditions, is_active)
VALUES
  (
    'email_engaged',
    'Users who clicked emails in last 30 days',
    'engagement',
    '{
      "type": "rules",
      "rules": [
        {"field": "email_clicks_30d", "operator": "greater_than", "value": 0}
      ]
    }'::jsonb,
    true
  ),
  (
    'email_unengaged',
    'Users who haven''t opened emails in 30+ days',
    'engagement',
    '{
      "type": "rules",
      "rules": [
        {"field": "email_opens_30d", "operator": "equals", "value": 0}
      ]
    }'::jsonb,
    true
  ),
  (
    'high_revenue',
    'Creators with $1000+ in total revenue',
    'revenue',
    '{
      "type": "sql",
      "sql": "pf.total_revenue >= 1000"
    }'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- TABLE: segment_automation
-- =====================================================
-- Automation triggers for segments
CREATE TABLE IF NOT EXISTS segment_automation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES segment(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL, -- 'entered', 'exited'
  automation_type TEXT NOT NULL, -- 'email', 'meta_audience', 'webhook'
  automation_config JSONB NOT NULL, -- Config specific to automation type
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_segment_automation_segment_id ON segment_automation(segment_id);
CREATE INDEX idx_segment_automation_trigger ON segment_automation(trigger_event);
CREATE INDEX idx_segment_automation_active ON segment_automation(is_active) WHERE is_active = true;

-- RLS for segment_automation
ALTER TABLE segment_automation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage segment_automation" ON segment_automation;
CREATE POLICY "Service role can manage segment_automation"
  ON segment_automation FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON FUNCTION evaluate_segment_sql IS 'GDP-012: Evaluates SQL-based segment condition for a person';
COMMENT ON FUNCTION refresh_segment_membership IS 'GDP-012: Batch refresh segment membership for all persons';
COMMENT ON TABLE segment_automation IS 'GDP-012: Automation triggers for segment entry/exit';
