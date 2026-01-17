-- Portal28 Academy - Full-Text Search Indexes
-- Enable full-text search across courses, lessons, forum threads, posts, and announcements

-- =============================================================================
-- SEARCH CONFIGURATION
-- =============================================================================

-- Create a custom text search configuration (optional, but useful for customization)
-- We'll use the default 'english' configuration for now

-- =============================================================================
-- ADD SEARCH VECTORS TO TABLES
-- =============================================================================

-- Add tsvector columns for pre-computed search vectors
-- This improves search performance by not needing to compute vectors on every query

-- Courses search vector (title + description)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

-- Lessons search vector (title + content_html)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_html, '')), 'C')
  ) STORED;

-- Forum threads search vector (title only)
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, ''))
  ) STORED;

-- Forum posts search vector (body)
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(body, ''))
  ) STORED;

-- Announcements search vector (title + body)
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B')
  ) STORED;

-- Resource items search vector (title + description + body)
ALTER TABLE public.resource_items ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'C')
  ) STORED;

-- =============================================================================
-- CREATE GIN INDEXES FOR FAST SEARCH
-- =============================================================================

-- GIN (Generalized Inverted Index) is the recommended index type for tsvector
CREATE INDEX IF NOT EXISTS idx_courses_search ON public.courses USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_lessons_search ON public.lessons USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_forum_threads_search ON public.forum_threads USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_forum_posts_search ON public.forum_posts USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_announcements_search ON public.announcements USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_resource_items_search ON public.resource_items USING gin(search_vector);

-- =============================================================================
-- CREATE SEARCH FUNCTION
-- =============================================================================

-- Function to search across all content types
CREATE OR REPLACE FUNCTION search_content(search_query text, result_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  excerpt text,
  url text,
  rank real,
  created_at timestamptz
) AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Convert search query to tsquery
  -- Use plainto_tsquery for simple queries (automatically handles operators)
  ts_query := plainto_tsquery('english', search_query);

  -- If query is empty, return no results
  IF ts_query IS NULL THEN
    RETURN;
  END IF;

  -- Search courses
  RETURN QUERY
  SELECT
    c.id,
    'course'::text as type,
    c.title,
    COALESCE(substring(c.description from 1 for 200), '')::text as excerpt,
    '/courses/' || c.slug as url,
    ts_rank(c.search_vector, ts_query) as rank,
    c.created_at
  FROM public.courses c
  WHERE c.search_vector @@ ts_query
    AND c.status = 'published'

  UNION ALL

  -- Search lessons (include module and course info for URL)
  SELECT
    l.id,
    'lesson'::text as type,
    l.title,
    COALESCE(substring(l.content_html from 1 for 200), '')::text as excerpt,
    '/app/lesson/' || l.id::text as url,
    ts_rank(l.search_vector, ts_query) as rank,
    m.created_at
  FROM public.lessons l
  JOIN public.modules m ON l.module_id = m.id
  JOIN public.courses c ON m.course_id = c.id
  WHERE l.search_vector @@ ts_query
    AND c.status = 'published'

  UNION ALL

  -- Search forum threads
  SELECT
    ft.id,
    'forum_thread'::text as type,
    ft.title,
    ''::text as excerpt,
    '/app/community/forums/' || COALESCE(fc.slug, 'general') || '/' || ft.id::text as url,
    ts_rank(ft.search_vector, ts_query) as rank,
    ft.created_at
  FROM public.forum_threads ft
  LEFT JOIN public.forum_categories fc ON ft.category_id = fc.id
  WHERE ft.search_vector @@ ts_query
    AND ft.is_hidden = false

  UNION ALL

  -- Search forum posts (show parent thread)
  SELECT
    fp.id,
    'forum_post'::text as type,
    ft.title,
    substring(fp.body from 1 for 200)::text as excerpt,
    '/app/community/forums/' || COALESCE(fc.slug, 'general') || '/' || ft.id::text as url,
    ts_rank(fp.search_vector, ts_query) as rank,
    fp.created_at
  FROM public.forum_posts fp
  JOIN public.forum_threads ft ON fp.thread_id = ft.id
  LEFT JOIN public.forum_categories fc ON ft.category_id = fc.id
  WHERE fp.search_vector @@ ts_query
    AND fp.is_hidden = false
    AND ft.is_hidden = false

  UNION ALL

  -- Search announcements
  SELECT
    a.id,
    'announcement'::text as type,
    a.title,
    substring(a.body from 1 for 200)::text as excerpt,
    '/app/community/announcements/' || a.id::text as url,
    ts_rank(a.search_vector, ts_query) as rank,
    a.created_at
  FROM public.announcements a
  WHERE a.search_vector @@ ts_query
    AND a.is_published = true

  UNION ALL

  -- Search resource items
  SELECT
    ri.id,
    'resource'::text as type,
    ri.title,
    COALESCE(substring(ri.description from 1 for 200), substring(ri.body from 1 for 200), '')::text as excerpt,
    '/app/community/resources#' || ri.id::text as url,
    ts_rank(ri.search_vector, ts_query) as rank,
    ri.created_at
  FROM public.resource_items ri
  WHERE ri.search_vector @@ ts_query
    AND ri.is_active = true

  -- Order by relevance (rank) descending
  ORDER BY rank DESC, created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Allow authenticated and anonymous users to use the search function
GRANT EXECUTE ON FUNCTION search_content(text, int) TO authenticated, anon;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION search_content(text, int) IS
  'Full-text search across courses, lessons, forum threads, posts, announcements, and resources. Returns ranked results with excerpts.';
