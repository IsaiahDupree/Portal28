-- Batch Video Generation Migration
-- Adds tables for processing multiple video briefs in batches

-- Video batch jobs tracking
CREATE TABLE IF NOT EXISTS video_batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queuing', 'processing', 'complete', 'failed', 'cancelled')),
  briefs JSONB DEFAULT '[]'::jsonb NOT NULL,
  results JSONB DEFAULT '[]'::jsonb,
  total_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Individual video items within a batch
CREATE TABLE IF NOT EXISTS video_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES video_batch_jobs(id) ON DELETE CASCADE NOT NULL,
  brief JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  result JSONB,
  error_message TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_batch_jobs_status ON video_batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_batch_jobs_created_by ON video_batch_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_video_batch_jobs_created_at ON video_batch_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_batch_items_batch ON video_batch_items(batch_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_video_batch_items_status ON video_batch_items(status);

-- RLS Policies for video_batch_jobs
ALTER TABLE video_batch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batch jobs" ON video_batch_jobs
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Admins can view all batch jobs" ON video_batch_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Users can create batch jobs" ON video_batch_jobs
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own batch jobs" ON video_batch_jobs
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can update all batch jobs" ON video_batch_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Users can delete own batch jobs" ON video_batch_jobs
  FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "Admins can delete all batch jobs" ON video_batch_jobs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

-- RLS Policies for video_batch_items
ALTER TABLE video_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batch items" ON video_batch_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_batch_jobs
      WHERE video_batch_jobs.id = video_batch_items.batch_id
      AND video_batch_jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view all batch items" ON video_batch_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Users can manage own batch items" ON video_batch_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM video_batch_jobs
      WHERE video_batch_jobs.id = video_batch_items.batch_id
      AND video_batch_jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all batch items" ON video_batch_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

-- Trigger for updated_at on video_batch_jobs
DROP TRIGGER IF EXISTS video_batch_jobs_updated_at ON video_batch_jobs;
CREATE TRIGGER video_batch_jobs_updated_at
  BEFORE UPDATE ON video_batch_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on video_batch_items
DROP TRIGGER IF EXISTS video_batch_items_updated_at ON video_batch_items;
CREATE TRIGGER video_batch_items_updated_at
  BEFORE UPDATE ON video_batch_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
