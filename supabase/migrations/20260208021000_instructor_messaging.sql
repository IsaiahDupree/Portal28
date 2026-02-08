-- Instructor Messaging Migration
-- Feature: feat-222 (Instructor Messaging)
-- Test ID: NEW-INS-001
-- Created: 2026-02-08

-- =====================================================
-- INSTRUCTOR MESSAGING SCHEMA
-- =====================================================

-- Message threads/conversations
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  last_message_at TIMESTAMPTZ,
  last_message_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unread_count_student INTEGER DEFAULT 0,
  unread_count_instructor INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages within threads
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message read receipts
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_message_threads_student_id ON public.message_threads(student_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_instructor_id ON public.message_threads(instructor_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_course_id ON public.message_threads(course_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_status ON public.message_threads(status);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON public.message_threads(last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON public.message_read_receipts(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update thread on new message
CREATE OR REPLACE FUNCTION update_thread_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update thread's last message info
  UPDATE public.message_threads
  SET
    last_message_at = NEW.created_at,
    last_message_by = NEW.sender_id,
    updated_at = NOW()
  WHERE id = NEW.thread_id;

  -- Increment unread count for recipient
  UPDATE public.message_threads
  SET
    unread_count_student = CASE
      WHEN NEW.sender_id = instructor_id THEN unread_count_student + 1
      ELSE unread_count_student
    END,
    unread_count_instructor = CASE
      WHEN NEW.sender_id = student_id THEN unread_count_instructor + 1
      ELSE unread_count_instructor
    END
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_thread_on_new_message();

-- Mark message as read and update unread counts
CREATE OR REPLACE FUNCTION mark_message_read()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_id UUID;
  v_sender_id UUID;
  v_recipient_id UUID;
BEGIN
  -- Get message details
  SELECT thread_id, sender_id INTO v_thread_id, v_sender_id
  FROM public.messages
  WHERE id = NEW.message_id;

  -- Update message read status
  UPDATE public.messages
  SET is_read = true, read_at = NEW.read_at
  WHERE id = NEW.message_id;

  -- Decrement unread count in thread
  UPDATE public.message_threads
  SET
    unread_count_student = CASE
      WHEN NEW.user_id = student_id THEN GREATEST(unread_count_student - 1, 0)
      ELSE unread_count_student
    END,
    unread_count_instructor = CASE
      WHEN NEW.user_id = instructor_id THEN GREATEST(unread_count_instructor - 1, 0)
      ELSE unread_count_instructor
    END
  WHERE id = v_thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_message_read
AFTER INSERT ON public.message_read_receipts
FOR EACH ROW
EXECUTE FUNCTION mark_message_read();

-- Update timestamps
CREATE TRIGGER trigger_message_threads_updated_at
BEFORE UPDATE ON public.message_threads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Message Threads: Users can only see their own threads
CREATE POLICY "Users can view their own message threads"
  ON public.message_threads FOR SELECT
  USING (
    auth.uid() = student_id OR
    auth.uid() = instructor_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Students can create message threads"
  ON public.message_threads FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    -- Verify instructor is actually an instructor or admin
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = instructor_id
      AND (users.is_admin = true OR users.is_instructor = true)
    )
  );

CREATE POLICY "Thread participants can update threads"
  ON public.message_threads FOR UPDATE
  USING (
    auth.uid() = student_id OR
    auth.uid() = instructor_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Messages: Only thread participants can see messages
CREATE POLICY "Thread participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads
      WHERE message_threads.id = messages.thread_id
      AND (
        message_threads.student_id = auth.uid() OR
        message_threads.instructor_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.is_admin = true
        )
      )
    )
  );

CREATE POLICY "Thread participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.message_threads
      WHERE message_threads.id = messages.thread_id
      AND (
        message_threads.student_id = auth.uid() OR
        message_threads.instructor_id = auth.uid()
      )
    )
  );

CREATE POLICY "Message senders can update their messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Read Receipts: Users can manage their own read receipts
CREATE POLICY "Users can view their own read receipts"
  ON public.message_read_receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own read receipts"
  ON public.message_read_receipts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.messages
      JOIN public.message_threads ON messages.thread_id = message_threads.id
      WHERE messages.id = message_id
      AND (
        message_threads.student_id = auth.uid() OR
        message_threads.instructor_id = auth.uid()
      )
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN student_id = user_uuid THEN unread_count_student
      WHEN instructor_id = user_uuid THEN unread_count_instructor
      ELSE 0
    END
  ), 0)
  INTO v_count
  FROM public.message_threads
  WHERE (student_id = user_uuid OR instructor_id = user_uuid)
  AND status = 'open';

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Get or create message thread
CREATE OR REPLACE FUNCTION get_or_create_message_thread(
  p_student_id UUID,
  p_instructor_id UUID,
  p_course_id UUID DEFAULT NULL,
  p_subject TEXT DEFAULT 'Course Question'
)
RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
BEGIN
  -- Try to find existing thread
  SELECT id INTO v_thread_id
  FROM public.message_threads
  WHERE student_id = p_student_id
  AND instructor_id = p_instructor_id
  AND (course_id = p_course_id OR (course_id IS NULL AND p_course_id IS NULL))
  AND status != 'archived'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create new thread if not found
  IF v_thread_id IS NULL THEN
    INSERT INTO public.message_threads (
      student_id,
      instructor_id,
      course_id,
      subject
    ) VALUES (
      p_student_id,
      p_instructor_id,
      p_course_id,
      p_subject
    )
    RETURNING id INTO v_thread_id;
  END IF;

  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Mark all messages in thread as read
CREATE OR REPLACE FUNCTION mark_thread_messages_read(
  p_thread_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Insert read receipts for unread messages
  INSERT INTO public.message_read_receipts (message_id, user_id)
  SELECT id, p_user_id
  FROM public.messages
  WHERE thread_id = p_thread_id
  AND sender_id != p_user_id
  AND is_read = false
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Get instructor message stats
CREATE OR REPLACE FUNCTION get_instructor_message_stats(instructor_uuid UUID)
RETURNS TABLE (
  total_threads BIGINT,
  open_threads BIGINT,
  total_messages BIGINT,
  unread_count INTEGER,
  avg_response_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT mt.id) AS total_threads,
    COUNT(DISTINCT mt.id) FILTER (WHERE mt.status = 'open') AS open_threads,
    COUNT(m.id) AS total_messages,
    COALESCE(SUM(mt.unread_count_instructor), 0)::INTEGER AS unread_count,
    -- Calculate average response time (simplified)
    NULL::NUMERIC AS avg_response_time_hours
  FROM public.message_threads mt
  LEFT JOIN public.messages m ON m.thread_id = mt.id
  WHERE mt.instructor_id = instructor_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.message_threads IS 'Message conversation threads between students and instructors';
COMMENT ON TABLE public.messages IS 'Individual messages within threads';
COMMENT ON TABLE public.message_read_receipts IS 'Track when messages are read by recipients';

COMMENT ON COLUMN public.message_threads.unread_count_student IS 'Number of unread messages for the student';
COMMENT ON COLUMN public.message_threads.unread_count_instructor IS 'Number of unread messages for the instructor';
