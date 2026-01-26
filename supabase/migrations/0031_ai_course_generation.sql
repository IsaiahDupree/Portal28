-- AI Course Generation Migration
-- Adds tables for AI-powered course creation from video

-- AI analysis jobs tracking
CREATE TABLE IF NOT EXISTS ai_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'transcribing', 'analyzing', 'complete', 'failed')),
  video_url TEXT,
  transcription TEXT,
  chapters JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  quiz_suggestions JSONB DEFAULT '[]'::jsonb,
  key_points JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Lesson chapters for video navigation
CREATE TABLE IF NOT EXISTS lesson_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  timestamp_seconds INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  summary TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_jobs_lesson ON ai_analysis_jobs(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_jobs_course ON ai_analysis_jobs(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_jobs_status ON ai_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lesson_chapters_lesson ON lesson_chapters(lesson_id, sort_order);

-- Add AI-generated flag to existing tables
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- RLS Policies for ai_analysis_jobs
ALTER TABLE ai_analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI jobs" ON ai_analysis_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'teacher')
    )
  );

-- RLS Policies for lesson_chapters
ALTER TABLE lesson_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lesson chapters" ON lesson_chapters
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage lesson chapters" ON lesson_chapters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'teacher')
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_analysis_jobs_updated_at ON ai_analysis_jobs;
CREATE TRIGGER ai_analysis_jobs_updated_at
  BEFORE UPDATE ON ai_analysis_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS lesson_chapters_updated_at ON lesson_chapters;
CREATE TRIGGER lesson_chapters_updated_at
  BEFORE UPDATE ON lesson_chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
