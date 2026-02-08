-- Direct Messaging System
-- Enables 1-on-1 private messaging between users

-- DM threads (conversations between two users)
CREATE TABLE IF NOT EXISTS dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- DM messages
CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES dm_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CHECK (char_length(content) > 0 AND char_length(content) <= 5000)
);

-- Thread metadata per user (archived, muted, etc.)
CREATE TABLE IF NOT EXISTS dm_thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES dm_threads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Typing indicators
CREATE TABLE IF NOT EXISTS dm_typing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES dm_threads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dm_threads_user1 ON dm_threads(user1_id);
CREATE INDEX IF NOT EXISTS idx_dm_threads_user2 ON dm_threads(user2_id);
CREATE INDEX IF NOT EXISTS idx_dm_threads_updated ON dm_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON dm_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_unread ON dm_messages(thread_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_dm_participants_user ON dm_thread_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_unarchived ON dm_thread_participants(user_id, is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_dm_typing_thread ON dm_typing(thread_id, started_at DESC);

-- Enable Realtime for DM tables
ALTER PUBLICATION supabase_realtime ADD TABLE dm_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_thread_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_typing;

-- RLS Policies for dm_threads
ALTER TABLE dm_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own threads" ON dm_threads
  FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

CREATE POLICY "Users can create threads" ON dm_threads
  FOR INSERT WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- RLS Policies for dm_messages
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their threads" ON dm_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dm_threads
      WHERE dm_threads.id = thread_id
      AND (dm_threads.user1_id = auth.uid() OR dm_threads.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their threads" ON dm_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM dm_threads
      WHERE dm_threads.id = thread_id
      AND (dm_threads.user1_id = auth.uid() OR dm_threads.user2_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can update their own messages" ON dm_messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can soft delete their own messages" ON dm_messages
  FOR DELETE USING (sender_id = auth.uid());

-- RLS Policies for dm_thread_participants
ALTER TABLE dm_thread_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own participant records" ON dm_thread_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own participant records" ON dm_thread_participants
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for dm_typing
ALTER TABLE dm_typing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing in their threads" ON dm_typing
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dm_threads
      WHERE dm_threads.id = thread_id
      AND (dm_threads.user1_id = auth.uid() OR dm_threads.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own typing status" ON dm_typing
  FOR ALL USING (user_id = auth.uid());

-- Triggers for updated_at
DROP TRIGGER IF EXISTS dm_threads_updated_at ON dm_threads;
CREATE TRIGGER dm_threads_updated_at
  BEFORE UPDATE ON dm_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS dm_messages_updated_at ON dm_messages;
CREATE TRIGGER dm_messages_updated_at
  BEFORE UPDATE ON dm_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS dm_thread_participants_updated_at ON dm_thread_participants;
CREATE TRIGGER dm_thread_participants_updated_at
  BEFORE UPDATE ON dm_thread_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get or create DM thread
CREATE OR REPLACE FUNCTION get_or_create_dm_thread(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
  v_min_user UUID;
  v_max_user UUID;
BEGIN
  -- Ensure consistent ordering (user1_id < user2_id)
  IF p_user1_id < p_user2_id THEN
    v_min_user := p_user1_id;
    v_max_user := p_user2_id;
  ELSE
    v_min_user := p_user2_id;
    v_max_user := p_user1_id;
  END IF;

  -- Try to find existing thread
  SELECT id INTO v_thread_id
  FROM dm_threads
  WHERE user1_id = v_min_user AND user2_id = v_max_user;

  -- Create if not exists
  IF v_thread_id IS NULL THEN
    INSERT INTO dm_threads (user1_id, user2_id)
    VALUES (v_min_user, v_max_user)
    RETURNING id INTO v_thread_id;

    -- Create participant records
    INSERT INTO dm_thread_participants (thread_id, user_id)
    VALUES
      (v_thread_id, v_min_user),
      (v_thread_id, v_max_user);
  END IF;

  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count for a user
CREATE OR REPLACE FUNCTION get_dm_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM dm_messages m
    JOIN dm_threads t ON t.id = m.thread_id
    WHERE (t.user1_id = p_user_id OR t.user2_id = p_user_id)
    AND m.sender_id != p_user_id
    AND m.is_read = false
    AND m.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_dm_messages_read(p_thread_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE dm_messages
  SET is_read = true, read_at = now()
  WHERE thread_id = p_thread_id
  AND sender_id != p_user_id
  AND is_read = false
  AND deleted_at IS NULL;

  -- Update last_read_at for participant
  UPDATE dm_thread_participants
  SET last_read_at = now()
  WHERE thread_id = p_thread_id
  AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update thread updated_at when message is sent
CREATE OR REPLACE FUNCTION update_dm_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dm_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_thread_on_message ON dm_messages;
CREATE TRIGGER update_thread_on_message
  AFTER INSERT ON dm_messages
  FOR EACH ROW EXECUTE FUNCTION update_dm_thread_timestamp();

-- Function to clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM dm_typing
  WHERE started_at < now() - interval '10 seconds';
END;
$$ LANGUAGE plpgsql;
