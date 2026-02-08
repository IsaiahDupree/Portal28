-- Content Scheduling System
-- Unified scheduling for courses, lessons, announcements, and other content

-- Main scheduled content table
CREATE TABLE IF NOT EXISTS public.scheduled_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content reference (polymorphic)
  content_type TEXT NOT NULL CHECK (content_type IN ('course', 'lesson', 'announcement', 'email', 'post', 'youtube_video')),
  content_id UUID NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'cancelled')),

  -- Auto-publish configuration
  auto_publish BOOLEAN DEFAULT TRUE,
  publish_action JSONB DEFAULT '{}', -- Additional publish actions (e.g., send notifications)

  -- Execution
  published_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique scheduling per content item
  UNIQUE(content_type, content_id)
);

-- Content scheduling history (audit log)
CREATE TABLE IF NOT EXISTS public.content_schedule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_content_id UUID NOT NULL REFERENCES public.scheduled_content(id) ON DELETE CASCADE,

  -- What changed
  action TEXT NOT NULL CHECK (action IN ('scheduled', 'rescheduled', 'published', 'failed', 'cancelled')),
  previous_scheduled_for TIMESTAMPTZ,
  new_scheduled_for TIMESTAMPTZ,

  -- Who made the change
  actor_id UUID REFERENCES public.users(id),
  reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recurring schedules (for repeating content like weekly newsletters)
CREATE TABLE IF NOT EXISTS public.recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content template
  content_type TEXT NOT NULL,
  template_id UUID, -- Reference to template content

  -- Schedule pattern
  recurrence_rule TEXT NOT NULL, -- RRULE format or cron expression
  timezone TEXT NOT NULL DEFAULT 'UTC',

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),

  -- Auto-generate schedule entries
  next_occurrence TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ,

  -- Limits
  max_occurrences INTEGER,
  end_date TIMESTAMPTZ,
  occurrence_count INTEGER DEFAULT 0,

  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_content_status ON public.scheduled_content(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_scheduled_for ON public.scheduled_content(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_content_type ON public.scheduled_content(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_created_by ON public.scheduled_content(created_by);
CREATE INDEX IF NOT EXISTS idx_content_schedule_history_content ON public.content_schedule_history(scheduled_content_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_next ON public.recurring_schedules(next_occurrence) WHERE status = 'active';

-- RLS Policies
ALTER TABLE public.scheduled_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_schedule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Admin can manage all schedules
CREATE POLICY "Admins can manage all schedules"
  ON public.scheduled_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can view their own scheduled content
CREATE POLICY "Users can view own schedules"
  ON public.scheduled_content
  FOR SELECT
  USING (created_by = auth.uid());

-- Users can create schedules for their content
CREATE POLICY "Users can create own schedules"
  ON public.scheduled_content
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update their own pending schedules
CREATE POLICY "Users can update own pending schedules"
  ON public.scheduled_content
  FOR UPDATE
  USING (created_by = auth.uid() AND status = 'pending');

-- Users can view history of their scheduled content
CREATE POLICY "Users can view own schedule history"
  ON public.content_schedule_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_content
      WHERE scheduled_content.id = content_schedule_history.scheduled_content_id
      AND scheduled_content.created_by = auth.uid()
    )
  );

-- Admins can manage recurring schedules
CREATE POLICY "Admins can manage recurring schedules"
  ON public.recurring_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_scheduled_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scheduled_content_updated_at
  BEFORE UPDATE ON public.scheduled_content
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_content_updated_at();

CREATE TRIGGER recurring_schedules_updated_at
  BEFORE UPDATE ON public.recurring_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_content_updated_at();

-- Function to log schedule changes
CREATE OR REPLACE FUNCTION log_schedule_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.content_schedule_history (
      scheduled_content_id,
      action,
      new_scheduled_for,
      actor_id
    ) VALUES (
      NEW.id,
      'scheduled',
      NEW.scheduled_for,
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.scheduled_for != NEW.scheduled_for THEN
      INSERT INTO public.content_schedule_history (
        scheduled_content_id,
        action,
        previous_scheduled_for,
        new_scheduled_for,
        actor_id
      ) VALUES (
        NEW.id,
        'rescheduled',
        OLD.scheduled_for,
        NEW.scheduled_for,
        auth.uid()
      );
    END IF;

    IF OLD.status = 'pending' AND NEW.status = 'published' THEN
      INSERT INTO public.content_schedule_history (
        scheduled_content_id,
        action,
        new_scheduled_for,
        actor_id
      ) VALUES (
        NEW.id,
        'published',
        NEW.published_at,
        auth.uid()
      );
    ELSIF OLD.status != 'failed' AND NEW.status = 'failed' THEN
      INSERT INTO public.content_schedule_history (
        scheduled_content_id,
        action,
        actor_id,
        metadata
      ) VALUES (
        NEW.id,
        'failed',
        auth.uid(),
        jsonb_build_object('error', NEW.error_message)
      );
    ELSIF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
      INSERT INTO public.content_schedule_history (
        scheduled_content_id,
        action,
        actor_id
      ) VALUES (
        NEW.id,
        'cancelled',
        auth.uid()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_schedule_changes
  AFTER INSERT OR UPDATE ON public.scheduled_content
  FOR EACH ROW
  EXECUTE FUNCTION log_schedule_change();

-- Comments
COMMENT ON TABLE public.scheduled_content IS 'Unified content scheduling across all content types';
COMMENT ON COLUMN public.scheduled_content.content_type IS 'Type of content being scheduled (course, lesson, announcement, etc.)';
COMMENT ON COLUMN public.scheduled_content.content_id IS 'ID of the content item in its respective table';
COMMENT ON COLUMN public.scheduled_content.scheduled_for IS 'When the content should be published (in specified timezone)';
COMMENT ON COLUMN public.scheduled_content.timezone IS 'Timezone for scheduled_for timestamp (e.g., America/New_York, UTC)';
COMMENT ON COLUMN public.scheduled_content.auto_publish IS 'Whether to automatically publish at scheduled time';
COMMENT ON COLUMN public.scheduled_content.publish_action IS 'Additional actions to perform on publish (e.g., send notifications, post to social)';

COMMENT ON TABLE public.recurring_schedules IS 'Recurring schedule patterns for repeating content';
COMMENT ON COLUMN public.recurring_schedules.recurrence_rule IS 'RRULE format (RFC 5545) or cron expression';
