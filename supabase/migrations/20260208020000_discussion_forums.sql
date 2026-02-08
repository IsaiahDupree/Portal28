-- Discussion Forums Migration
-- Feature: feat-220 (Discussion Forums)
-- Test ID: NEW-FOR-001
-- Created: 2026-02-08

-- =====================================================
-- DISCUSSION FORUMS SCHEMA
-- =====================================================

-- Forums table (course-based or general forums)
CREATE TABLE IF NOT EXISTS public.forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forum categories for organization
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(forum_id, slug)
);

-- Forum threads
CREATE TABLE IF NOT EXISTS public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_solved BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  last_reply_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(forum_id, slug)
);

-- Thread replies
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thread upvotes
CREATE TABLE IF NOT EXISTS public.forum_thread_upvotes (
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

-- Reply upvotes
CREATE TABLE IF NOT EXISTS public.forum_reply_upvotes (
  reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (reply_id, user_id)
);

-- Thread tags
CREATE TABLE IF NOT EXISTS public.forum_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(forum_id, slug)
);

-- Thread-to-tag mapping
CREATE TABLE IF NOT EXISTS public.forum_thread_tags (
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.forum_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, tag_id)
);

-- User thread subscriptions (for notifications)
CREATE TABLE IF NOT EXISTS public.forum_thread_subscriptions (
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

-- Forum moderation actions
CREATE TABLE IF NOT EXISTS public.forum_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'reply')),
  target_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('pin', 'unpin', 'lock', 'unlock', 'delete', 'undelete', 'mark_solution', 'unmark_solution', 'move', 'merge')),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_forums_course_id ON public.forums(course_id);
CREATE INDEX IF NOT EXISTS idx_forums_slug ON public.forums(slug);

CREATE INDEX IF NOT EXISTS idx_forum_categories_forum_id ON public.forum_categories(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_categories_slug ON public.forum_categories(forum_id, slug);

CREATE INDEX IF NOT EXISTS idx_forum_threads_forum_id ON public.forum_threads(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id ON public.forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_user_id ON public.forum_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_slug ON public.forum_threads(forum_id, slug);
CREATE INDEX IF NOT EXISTS idx_forum_threads_created_at ON public.forum_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_last_reply_at ON public.forum_threads(last_reply_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_forum_threads_pinned ON public.forum_threads(is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_not_deleted ON public.forum_threads(is_deleted) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_id ON public.forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id ON public.forum_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent_reply_id ON public.forum_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at ON public.forum_replies(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_not_deleted ON public.forum_replies(is_deleted) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_forum_thread_tags_thread_id ON public.forum_thread_tags(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_thread_tags_tag_id ON public.forum_thread_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_forum_moderation_target ON public.forum_moderation_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_forum_moderation_moderator ON public.forum_moderation_actions(moderator_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update thread reply count and last reply info
CREATE OR REPLACE FUNCTION update_thread_reply_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_threads
    SET
      reply_count = reply_count + 1,
      last_reply_at = NEW.created_at,
      last_reply_by = NEW.user_id,
      updated_at = NOW()
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_threads
    SET
      reply_count = GREATEST(reply_count - 1, 0),
      updated_at = NOW()
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_reply_stats
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW
WHEN (NEW.is_deleted = false OR OLD.is_deleted = false)
EXECUTE FUNCTION update_thread_reply_stats();

-- Update thread upvote count
CREATE OR REPLACE FUNCTION update_thread_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_threads
    SET upvote_count = upvote_count + 1
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_threads
    SET upvote_count = GREATEST(upvote_count - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_upvote_count
AFTER INSERT OR DELETE ON public.forum_thread_upvotes
FOR EACH ROW
EXECUTE FUNCTION update_thread_upvote_count();

-- Update reply upvote count
CREATE OR REPLACE FUNCTION update_reply_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_replies
    SET upvote_count = upvote_count + 1
    WHERE id = NEW.reply_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_replies
    SET upvote_count = GREATEST(upvote_count - 1, 0)
    WHERE id = OLD.reply_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reply_upvote_count
AFTER INSERT OR DELETE ON public.forum_reply_upvotes
FOR EACH ROW
EXECUTE FUNCTION update_reply_upvote_count();

-- Update thread view count
CREATE OR REPLACE FUNCTION increment_thread_view_count(thread_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.forum_threads
  SET view_count = view_count + 1
  WHERE id = thread_uuid;
END;
$$ LANGUAGE plpgsql;

-- Auto-subscribe users to their own threads
CREATE OR REPLACE FUNCTION auto_subscribe_thread_author()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.forum_thread_subscriptions (thread_id, user_id, subscribed)
  VALUES (NEW.id, NEW.user_id, true)
  ON CONFLICT (thread_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_subscribe_thread_author
AFTER INSERT ON public.forum_threads
FOR EACH ROW
EXECUTE FUNCTION auto_subscribe_thread_author();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_forums_updated_at
BEFORE UPDATE ON public.forums
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_forum_categories_updated_at
BEFORE UPDATE ON public.forum_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_forum_threads_updated_at
BEFORE UPDATE ON public.forum_threads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_forum_replies_updated_at
BEFORE UPDATE ON public.forum_replies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_thread_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reply_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_thread_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_thread_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_moderation_actions ENABLE ROW LEVEL SECURITY;

-- Forums: Anyone can read, admins can manage
CREATE POLICY "Forums are publicly readable"
  ON public.forums FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage forums"
  ON public.forums FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Forum Categories: Anyone can read, admins can manage
CREATE POLICY "Forum categories are publicly readable"
  ON public.forum_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage forum categories"
  ON public.forum_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Forum Threads: Anyone can read, authenticated users can create, owners can update
CREATE POLICY "Forum threads are publicly readable"
  ON public.forum_threads FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Authenticated users can create threads"
  ON public.forum_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Thread authors can update their threads"
  ON public.forum_threads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all threads"
  ON public.forum_threads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Forum Replies: Anyone can read, authenticated users can create, owners can update
CREATE POLICY "Forum replies are publicly readable"
  ON public.forum_replies FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Authenticated users can create replies"
  ON public.forum_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reply authors can update their replies"
  ON public.forum_replies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all replies"
  ON public.forum_replies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Thread Upvotes: Users can manage their own upvotes
CREATE POLICY "Anyone can view thread upvotes"
  ON public.forum_thread_upvotes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can upvote threads"
  ON public.forum_thread_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own thread upvotes"
  ON public.forum_thread_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Reply Upvotes: Users can manage their own upvotes
CREATE POLICY "Anyone can view reply upvotes"
  ON public.forum_reply_upvotes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can upvote replies"
  ON public.forum_reply_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reply upvotes"
  ON public.forum_reply_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Forum Tags: Anyone can read, admins can manage
CREATE POLICY "Forum tags are publicly readable"
  ON public.forum_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage forum tags"
  ON public.forum_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Thread Tags: Anyone can read, thread authors and admins can manage
CREATE POLICY "Thread tags are publicly readable"
  ON public.forum_thread_tags FOR SELECT
  USING (true);

CREATE POLICY "Thread authors can tag their threads"
  ON public.forum_thread_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_threads
      WHERE forum_threads.id = thread_id
      AND forum_threads.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage thread tags"
  ON public.forum_thread_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Thread Subscriptions: Users can manage their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.forum_thread_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions"
  ON public.forum_thread_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Moderation Actions: Admins only
CREATE POLICY "Admins can view moderation actions"
  ON public.forum_moderation_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can create moderation actions"
  ON public.forum_moderation_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get forum stats
CREATE OR REPLACE FUNCTION get_forum_stats(forum_uuid UUID)
RETURNS TABLE (
  thread_count BIGINT,
  reply_count BIGINT,
  user_count BIGINT,
  latest_thread_id UUID,
  latest_thread_title TEXT,
  latest_thread_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT t.id) AS thread_count,
    COALESCE(SUM(t.reply_count), 0) AS reply_count,
    COUNT(DISTINCT t.user_id) AS user_count,
    (SELECT id FROM public.forum_threads WHERE forum_id = forum_uuid AND is_deleted = false ORDER BY created_at DESC LIMIT 1) AS latest_thread_id,
    (SELECT title FROM public.forum_threads WHERE forum_id = forum_uuid AND is_deleted = false ORDER BY created_at DESC LIMIT 1) AS latest_thread_title,
    (SELECT created_at FROM public.forum_threads WHERE forum_id = forum_uuid AND is_deleted = false ORDER BY created_at DESC LIMIT 1) AS latest_thread_created_at
  FROM public.forum_threads t
  WHERE t.forum_id = forum_uuid AND t.is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- Get user forum stats
CREATE OR REPLACE FUNCTION get_user_forum_stats(user_uuid UUID)
RETURNS TABLE (
  thread_count BIGINT,
  reply_count BIGINT,
  solution_count BIGINT,
  total_upvotes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.forum_threads WHERE user_id = user_uuid AND is_deleted = false) AS thread_count,
    (SELECT COUNT(*) FROM public.forum_replies WHERE user_id = user_uuid AND is_deleted = false) AS reply_count,
    (SELECT COUNT(*) FROM public.forum_replies WHERE user_id = user_uuid AND is_solution = true AND is_deleted = false) AS solution_count,
    (
      SELECT COALESCE(SUM(upvote_count), 0)
      FROM (
        SELECT upvote_count FROM public.forum_threads WHERE user_id = user_uuid AND is_deleted = false
        UNION ALL
        SELECT upvote_count FROM public.forum_replies WHERE user_id = user_uuid AND is_deleted = false
      ) AS combined_upvotes
    ) AS total_upvotes;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.forums IS 'Discussion forums, optionally linked to courses';
COMMENT ON TABLE public.forum_categories IS 'Categories within forums for organization';
COMMENT ON TABLE public.forum_threads IS 'Discussion threads/topics within forums';
COMMENT ON TABLE public.forum_replies IS 'Replies to threads, supports nested replies';
COMMENT ON TABLE public.forum_thread_upvotes IS 'User upvotes on threads';
COMMENT ON TABLE public.forum_reply_upvotes IS 'User upvotes on replies';
COMMENT ON TABLE public.forum_tags IS 'Tags for categorizing threads';
COMMENT ON TABLE public.forum_thread_tags IS 'Many-to-many relationship between threads and tags';
COMMENT ON TABLE public.forum_thread_subscriptions IS 'User subscriptions to threads for notifications';
COMMENT ON TABLE public.forum_moderation_actions IS 'Audit log of moderation actions';
