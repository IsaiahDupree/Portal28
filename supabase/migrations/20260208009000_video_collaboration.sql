-- Real-Time Collaboration for Video Projects
-- Enables multiple editors to work together with live sync, comments, and version history

-- Video project collaboration sessions
CREATE TABLE IF NOT EXISTS video_collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_batch_id UUID REFERENCES video_batch_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'locked')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Collaboration participants (who can edit)
CREATE TABLE IF NOT EXISTS video_collaboration_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_collaboration_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Real-time presence tracking
CREATE TABLE IF NOT EXISTS video_collaboration_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_collaboration_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  cursor_position JSONB,
  current_section TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Edit operations log (for operational transformation)
CREATE TABLE IF NOT EXISTS video_collaboration_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_collaboration_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('insert', 'delete', 'update', 'replace')),
  path TEXT NOT NULL, -- JSON path to the edited field
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ DEFAULT now()
);

-- Comments and annotations
CREATE TABLE IF NOT EXISTS video_collaboration_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_collaboration_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES video_collaboration_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  target_path TEXT, -- What this comment is about (e.g., "brief.script", "result.thumbnail")
  target_timestamp DECIMAL, -- Video timestamp if relevant
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Version snapshots (for version history)
CREATE TABLE IF NOT EXISTS video_collaboration_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_collaboration_sessions(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL, -- Full snapshot of the project state
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, version_number)
);

-- Conflict resolution log
CREATE TABLE IF NOT EXISTS video_collaboration_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_collaboration_sessions(id) ON DELETE CASCADE NOT NULL,
  edit1_id UUID REFERENCES video_collaboration_edits(id) ON DELETE SET NULL,
  edit2_id UUID REFERENCES video_collaboration_edits(id) ON DELETE SET NULL,
  resolution_strategy TEXT CHECK (resolution_strategy IN ('last_write_wins', 'merge', 'manual')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collab_sessions_creator ON video_collaboration_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_status ON video_collaboration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_batch ON video_collaboration_sessions(video_batch_id);
CREATE INDEX IF NOT EXISTS idx_collab_participants_session ON video_collaboration_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_collab_participants_user ON video_collaboration_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_presence_session ON video_collaboration_presence(session_id);
CREATE INDEX IF NOT EXISTS idx_collab_presence_active ON video_collaboration_presence(is_active, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_collab_edits_session ON video_collaboration_edits(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collab_comments_session ON video_collaboration_comments(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collab_comments_parent ON video_collaboration_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_collab_versions_session ON video_collaboration_versions(session_id, version_number DESC);

-- Enable Realtime for all collaboration tables
ALTER PUBLICATION supabase_realtime ADD TABLE video_collaboration_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE video_collaboration_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE video_collaboration_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE video_collaboration_edits;
ALTER PUBLICATION supabase_realtime ADD TABLE video_collaboration_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE video_collaboration_versions;

-- RLS Policies for video_collaboration_sessions
ALTER TABLE video_collaboration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sessions they participate in" ON video_collaboration_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = video_collaboration_sessions.id
      AND video_collaboration_participants.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Admins can view all sessions" ON video_collaboration_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Users can create sessions" ON video_collaboration_sessions
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Session owners can update sessions" ON video_collaboration_sessions
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Session owners can delete sessions" ON video_collaboration_sessions
  FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for video_collaboration_participants
ALTER TABLE video_collaboration_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their sessions" ON video_collaboration_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_sessions
      WHERE video_collaboration_sessions.id = video_collaboration_participants.session_id
      AND (
        video_collaboration_sessions.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM video_collaboration_participants p2
          WHERE p2.session_id = video_collaboration_sessions.id
          AND p2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Session owners can add participants" ON video_collaboration_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_collaboration_sessions
      WHERE video_collaboration_sessions.id = session_id
      AND video_collaboration_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Session owners can update participants" ON video_collaboration_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_sessions
      WHERE video_collaboration_sessions.id = session_id
      AND video_collaboration_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Session owners can remove participants" ON video_collaboration_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_sessions
      WHERE video_collaboration_sessions.id = session_id
      AND video_collaboration_sessions.created_by = auth.uid()
    )
  );

-- RLS Policies for video_collaboration_presence
ALTER TABLE video_collaboration_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view presence in their sessions" ON video_collaboration_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = video_collaboration_presence.session_id
      AND video_collaboration_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own presence" ON video_collaboration_presence
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for video_collaboration_edits
ALTER TABLE video_collaboration_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view edits in their sessions" ON video_collaboration_edits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = video_collaboration_edits.session_id
      AND video_collaboration_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create edits" ON video_collaboration_edits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = session_id
      AND video_collaboration_participants.user_id = auth.uid()
      AND video_collaboration_participants.role IN ('owner', 'editor')
    )
  );

-- RLS Policies for video_collaboration_comments
ALTER TABLE video_collaboration_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view comments in their sessions" ON video_collaboration_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = video_collaboration_comments.session_id
      AND video_collaboration_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create comments" ON video_collaboration_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = session_id
      AND video_collaboration_participants.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Comment authors can update their comments" ON video_collaboration_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Comment authors can delete their comments" ON video_collaboration_comments
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for video_collaboration_versions
ALTER TABLE video_collaboration_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view versions in their sessions" ON video_collaboration_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = video_collaboration_versions.session_id
      AND video_collaboration_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create versions" ON video_collaboration_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = session_id
      AND video_collaboration_participants.user_id = auth.uid()
      AND video_collaboration_participants.role IN ('owner', 'editor')
    )
    AND created_by = auth.uid()
  );

-- RLS Policies for video_collaboration_conflicts
ALTER TABLE video_collaboration_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view conflicts in their sessions" ON video_collaboration_conflicts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = video_collaboration_conflicts.session_id
      AND video_collaboration_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create conflicts" ON video_collaboration_conflicts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Editors can resolve conflicts" ON video_collaboration_conflicts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM video_collaboration_participants
      WHERE video_collaboration_participants.session_id = session_id
      AND video_collaboration_participants.user_id = auth.uid()
      AND video_collaboration_participants.role IN ('owner', 'editor')
    )
  );

-- Triggers for updated_at
DROP TRIGGER IF EXISTS video_collaboration_sessions_updated_at ON video_collaboration_sessions;
CREATE TRIGGER video_collaboration_sessions_updated_at
  BEFORE UPDATE ON video_collaboration_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS video_collaboration_comments_updated_at ON video_collaboration_comments;
CREATE TRIGGER video_collaboration_comments_updated_at
  BEFORE UPDATE ON video_collaboration_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create version snapshots
CREATE OR REPLACE FUNCTION create_collaboration_version_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create snapshot for significant edit operations
  IF NEW.operation_type IN ('update', 'replace') THEN
    INSERT INTO video_collaboration_versions (
      session_id,
      version_number,
      snapshot,
      description,
      created_by
    )
    SELECT
      NEW.session_id,
      COALESCE((SELECT MAX(version_number) FROM video_collaboration_versions WHERE session_id = NEW.session_id), 0) + 1,
      jsonb_build_object(
        'edit_id', NEW.id,
        'timestamp', NEW.created_at,
        'path', NEW.path,
        'value', NEW.new_value
      ),
      'Auto-snapshot from edit',
      NEW.user_id
    WHERE NOT EXISTS (
      -- Don't create duplicate snapshots within 1 minute
      SELECT 1 FROM video_collaboration_versions
      WHERE session_id = NEW.session_id
      AND created_at > now() - interval '1 minute'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_version_snapshot ON video_collaboration_edits;
CREATE TRIGGER auto_create_version_snapshot
  AFTER INSERT ON video_collaboration_edits
  FOR EACH ROW EXECUTE FUNCTION create_collaboration_version_snapshot();

-- Function to clean up stale presence
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE video_collaboration_presence
  SET is_active = false
  WHERE last_activity_at < now() - interval '5 minutes'
  AND is_active = true;
END;
$$ LANGUAGE plpgsql;
