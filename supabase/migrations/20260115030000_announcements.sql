-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE announcements ADD COLUMN published_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'excerpt'
  ) THEN
    ALTER TABLE announcements ADD COLUMN excerpt TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'tags'
  ) THEN
    ALTER TABLE announcements ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE announcements ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_space_id ON announcements(space_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_tags ON announcements USING gin(tags);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_announcements_updated_at ON announcements;
CREATE TRIGGER trigger_update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view published announcements in their space" ON announcements;
DROP POLICY IF EXISTS "Admins can view all announcements in their space" ON announcements;
DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can update announcements in their space" ON announcements;
DROP POLICY IF EXISTS "Admins can delete announcements in their space" ON announcements;

-- RLS Policy: Anyone can view published announcements in their space
CREATE POLICY "Users can view published announcements in their space"
  ON announcements
  FOR SELECT
  USING (
    published_at IS NOT NULL
    AND published_at <= NOW()
    AND EXISTS (
      SELECT 1 FROM community_members csm
      WHERE csm.space_id = announcements.space_id
      AND csm.user_id = auth.uid()
      AND csm.is_banned = false
    )
  );

-- RLS Policy: Admins can view all announcements in their space
CREATE POLICY "Admins can view all announcements in their space"
  ON announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members csm
      WHERE csm.space_id = announcements.space_id
      AND csm.user_id = auth.uid()
      AND csm.role = 'admin'
    )
  );

-- RLS Policy: Admins can create announcements
CREATE POLICY "Admins can create announcements"
  ON announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members csm
      WHERE csm.space_id = announcements.space_id
      AND csm.user_id = auth.uid()
      AND csm.role = 'admin'
    )
  );

-- RLS Policy: Admins can update announcements in their space
CREATE POLICY "Admins can update announcements in their space"
  ON announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members csm
      WHERE csm.space_id = announcements.space_id
      AND csm.user_id = auth.uid()
      AND csm.role = 'admin'
    )
  );

-- RLS Policy: Admins can delete announcements in their space
CREATE POLICY "Admins can delete announcements in their space"
  ON announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members csm
      WHERE csm.space_id = announcements.space_id
      AND csm.user_id = auth.uid()
      AND csm.role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON TABLE announcements IS 'Announcements posted by admins in community spaces';
COMMENT ON COLUMN announcements.is_pinned IS 'Pinned announcements appear at the top of the feed';
COMMENT ON COLUMN announcements.tags IS 'Array of tags for filtering announcements';
COMMENT ON COLUMN announcements.published_at IS 'When the announcement is published (NULL = draft)';
