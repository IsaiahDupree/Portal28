-- Add Mux integration columns to lessons table
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS mux_asset_id text,
ADD COLUMN IF NOT EXISTS mux_playback_id text,
ADD COLUMN IF NOT EXISTS mux_upload_id text,
ADD COLUMN IF NOT EXISTS mux_status text DEFAULT 'pending'; -- pending|processing|ready|errored

-- Create index for querying by mux_asset_id
CREATE INDEX IF NOT EXISTS idx_lessons_mux_asset_id ON public.lessons(mux_asset_id);

-- Create video_progress table for tracking video watch progress
CREATE TABLE IF NOT EXISTS public.video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  playback_id text NOT NULL,
  position_seconds numeric NOT NULL DEFAULT 0,
  duration_seconds numeric,
  percentage_watched numeric GENERATED ALWAYS AS (
    CASE
      WHEN duration_seconds > 0 THEN (position_seconds / duration_seconds * 100)
      ELSE 0
    END
  ) STORED,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS on video_progress
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_progress
-- Users can read and update their own progress
CREATE POLICY "video_progress_select_own" ON public.video_progress
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "video_progress_insert_own" ON public.video_progress
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "video_progress_update_own" ON public.video_progress
FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all progress
CREATE POLICY "video_progress_admin_all" ON public.video_progress
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_video_progress_user_lesson ON public.video_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_lesson ON public.video_progress(lesson_id);

-- Function to update video progress
CREATE OR REPLACE FUNCTION update_video_progress(
  p_user_id uuid,
  p_lesson_id uuid,
  p_playback_id text,
  p_position_seconds numeric,
  p_duration_seconds numeric
)
RETURNS public.video_progress
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress public.video_progress;
BEGIN
  -- Insert or update progress
  INSERT INTO public.video_progress (
    user_id,
    lesson_id,
    playback_id,
    position_seconds,
    duration_seconds,
    last_watched_at
  ) VALUES (
    p_user_id,
    p_lesson_id,
    p_playback_id,
    p_position_seconds,
    p_duration_seconds,
    now()
  )
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET
    position_seconds = EXCLUDED.position_seconds,
    duration_seconds = EXCLUDED.duration_seconds,
    last_watched_at = now()
  RETURNING * INTO v_progress;

  RETURN v_progress;
END;
$$;

COMMENT ON TABLE public.video_progress IS 'Tracks video playback progress for each user and lesson';
COMMENT ON FUNCTION update_video_progress IS 'Updates or inserts video progress for a user/lesson combination';
