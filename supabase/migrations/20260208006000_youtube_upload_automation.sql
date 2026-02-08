-- YouTube Upload Automation Migration
-- Adds tables for YouTube OAuth tokens and video uploads

-- YouTube OAuth tokens
-- Stores user-specific YouTube API credentials
CREATE TABLE IF NOT EXISTS youtube_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- YouTube video uploads
-- Tracks video uploads to YouTube with metadata
CREATE TABLE IF NOT EXISTS youtube_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  youtube_video_id TEXT,
  video_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  category_id TEXT DEFAULT '22',
  privacy_status TEXT DEFAULT 'private' CHECK (privacy_status IN ('private', 'public', 'unlisted')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  upload_progress INTEGER DEFAULT 0,
  upload_bytes_sent BIGINT DEFAULT 0,
  upload_bytes_total BIGINT,
  duration_seconds INTEGER,
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_youtube_tokens_user ON youtube_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_uploads_user ON youtube_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_uploads_status ON youtube_uploads(status);
CREATE INDEX IF NOT EXISTS idx_youtube_uploads_youtube_video_id ON youtube_uploads(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_uploads_scheduled_at ON youtube_uploads(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- RLS Policies for youtube_tokens
ALTER TABLE youtube_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own YouTube tokens" ON youtube_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own YouTube tokens" ON youtube_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own YouTube tokens" ON youtube_tokens
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own YouTube tokens" ON youtube_tokens
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all YouTube tokens" ON youtube_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

-- RLS Policies for youtube_uploads
ALTER TABLE youtube_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own YouTube uploads" ON youtube_uploads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own YouTube uploads" ON youtube_uploads
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own YouTube uploads" ON youtube_uploads
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own YouTube uploads" ON youtube_uploads
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all YouTube uploads" ON youtube_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Admins can update all YouTube uploads" ON youtube_uploads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

-- Trigger for updated_at on youtube_tokens
DROP TRIGGER IF EXISTS youtube_tokens_updated_at ON youtube_tokens;
CREATE TRIGGER youtube_tokens_updated_at
  BEFORE UPDATE ON youtube_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on youtube_uploads
DROP TRIGGER IF EXISTS youtube_uploads_updated_at ON youtube_uploads;
CREATE TRIGGER youtube_uploads_updated_at
  BEFORE UPDATE ON youtube_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if YouTube token is expired
CREATE OR REPLACE FUNCTION is_youtube_token_expired(token_expires_at TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN token_expires_at <= now() + INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get valid YouTube token for a user
CREATE OR REPLACE FUNCTION get_valid_youtube_token(p_user_id UUID)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  needs_refresh BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    yt.access_token,
    yt.refresh_token,
    yt.expires_at,
    is_youtube_token_expired(yt.expires_at) as needs_refresh
  FROM youtube_tokens yt
  WHERE yt.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
