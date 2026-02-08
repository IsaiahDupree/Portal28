-- Advanced Search System (feat-229)
-- Full-text search for courses, lessons, and content with analytics

-- =============================================================================
-- SEARCH TABLES
-- =============================================================================

-- Search queries table for analytics
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Query details
  query TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,

  -- Results
  result_count INT DEFAULT 0,
  results_clicked INT DEFAULT 0,
  top_result_id TEXT,
  top_result_type TEXT,

  -- Context
  filters JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  referer TEXT,

  -- Performance
  search_duration_ms INT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Click tracking for search results
CREATE TABLE IF NOT EXISTS search_result_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Reference to search query
  search_query_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,

  -- Click details
  result_id TEXT NOT NULL,
  result_type TEXT NOT NULL CHECK (result_type IN ('course', 'lesson', 'resource', 'article')),
  result_rank INT,

  -- User context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- INDEXES FOR SEARCH PERFORMANCE
-- =============================================================================

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_courses_search ON courses USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(long_description, ''))
);

CREATE INDEX IF NOT EXISTS idx_lessons_search ON lessons USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(video_transcript, ''))
);

-- Regular indexes for filtering
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query);
CREATE INDEX IF NOT EXISTS idx_search_clicks_query ON search_result_clicks(search_query_id);
CREATE INDEX IF NOT EXISTS idx_search_clicks_result ON search_result_clicks(result_id, result_type);

-- =============================================================================
-- SEARCH FUNCTIONS
-- =============================================================================

-- Function to search courses with relevance ranking
CREATE OR REPLACE FUNCTION search_courses(
  search_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_category_filter TEXT DEFAULT NULL,
  p_price_min INT DEFAULT NULL,
  p_price_max INT DEFAULT NULL,
  p_instructor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  thumbnail_url TEXT,
  price_cents INT,
  instructor_name TEXT,
  category TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.slug,
    c.description,
    c.thumbnail_url,
    c.price_cents,
    p.full_name as instructor_name,
    c.category,
    ts_rank(
      to_tsvector('english', coalesce(c.title, '') || ' ' || coalesce(c.description, '') || ' ' || coalesce(c.long_description, '')),
      plainto_tsquery('english', search_query)
    ) as relevance
  FROM courses c
  LEFT JOIN profiles p ON c.instructor_id = p.id
  WHERE
    c.status = 'published'
    AND (
      to_tsvector('english', coalesce(c.title, '') || ' ' || coalesce(c.description, '') || ' ' || coalesce(c.long_description, ''))
      @@ plainto_tsquery('english', search_query)
    )
    AND (p_category_filter IS NULL OR c.category = p_category_filter)
    AND (p_price_min IS NULL OR c.price_cents >= p_price_min)
    AND (p_price_max IS NULL OR c.price_cents <= p_price_max)
    AND (p_instructor_id IS NULL OR c.instructor_id = p_instructor_id)
  ORDER BY relevance DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search lessons with relevance ranking
CREATE OR REPLACE FUNCTION search_lessons(
  search_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_course_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  course_id UUID,
  course_title TEXT,
  course_slug TEXT,
  duration_seconds INT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.description,
    l.course_id,
    c.title as course_title,
    c.slug as course_slug,
    l.duration_seconds,
    ts_rank(
      to_tsvector('english', coalesce(l.title, '') || ' ' || coalesce(l.description, '') || ' ' || coalesce(l.video_transcript, '')),
      plainto_tsquery('english', search_query)
    ) as relevance
  FROM lessons l
  JOIN courses c ON l.course_id = c.id
  WHERE
    c.status = 'published'
    AND (
      to_tsvector('english', coalesce(l.title, '') || ' ' || coalesce(l.description, '') || ' ' || coalesce(l.video_transcript, ''))
      @@ plainto_tsquery('english', search_query)
    )
    AND (p_course_id IS NULL OR l.course_id = p_course_id)
  ORDER BY relevance DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get popular search queries
CREATE OR REPLACE FUNCTION get_popular_searches(
  p_days INT DEFAULT 7,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  query TEXT,
  search_count BIGINT,
  avg_result_count NUMERIC,
  click_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sq.query,
    COUNT(*) as search_count,
    AVG(sq.result_count) as avg_result_count,
    CASE
      WHEN COUNT(*) > 0 THEN (SUM(sq.results_clicked)::NUMERIC / COUNT(*)::NUMERIC) * 100
      ELSE 0
    END as click_rate
  FROM search_queries sq
  WHERE sq.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY sq.query
  ORDER BY search_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to track search query
CREATE OR REPLACE FUNCTION track_search_query(
  p_query TEXT,
  p_user_id UUID,
  p_result_count INT,
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_search_duration_ms INT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_search_id UUID;
BEGIN
  INSERT INTO search_queries (
    query,
    user_id,
    result_count,
    filters,
    search_duration_ms
  ) VALUES (
    p_query,
    p_user_id,
    p_result_count,
    p_filters,
    p_search_duration_ms
  )
  RETURNING id INTO v_search_id;

  RETURN v_search_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_result_clicks ENABLE ROW LEVEL SECURITY;

-- Users can view their own search queries
CREATE POLICY "Users can view own searches"
  ON search_queries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own search queries
CREATE POLICY "Users can insert searches"
  ON search_queries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all searches
CREATE POLICY "Admins can view all searches"
  ON search_queries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users can insert click tracking
CREATE POLICY "Users can track clicks"
  ON search_result_clicks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view their own clicks
CREATE POLICY "Users can view own clicks"
  ON search_result_clicks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all clicks
CREATE POLICY "Admins can view all clicks"
  ON search_result_clicks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- =============================================================================
-- VIEWS FOR ANALYTICS
-- =============================================================================

-- Search analytics view
CREATE OR REPLACE VIEW search_analytics AS
SELECT
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as total_searches,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(result_count) as avg_results,
  AVG(search_duration_ms) as avg_duration_ms,
  SUM(results_clicked) as total_clicks,
  CASE
    WHEN COUNT(*) > 0 THEN (SUM(results_clicked)::NUMERIC / COUNT(*)::NUMERIC) * 100
    ELSE 0
  END as click_through_rate
FROM search_queries
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

-- Grant permissions
GRANT SELECT ON search_analytics TO authenticated;

-- Comment on tables
COMMENT ON TABLE search_queries IS 'Tracks all search queries for analytics and improvement';
COMMENT ON TABLE search_result_clicks IS 'Tracks clicks on search results for relevance tuning';
