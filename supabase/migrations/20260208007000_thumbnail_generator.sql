-- Thumbnail Generator Migration
-- Adds tables for automated thumbnail generation with brand styling

-- Thumbnail templates
-- Stores reusable thumbnail design templates
CREATE TABLE IF NOT EXISTS thumbnail_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  layout_type TEXT DEFAULT 'default' CHECK (layout_type IN ('default', 'centered', 'split', 'minimal', 'bold')),
  brand_style TEXT DEFAULT 'professional' CHECK (brand_style IN ('professional', 'casual', 'playful', 'elegant', 'modern')),
  background_color TEXT DEFAULT '#554D91',
  text_color TEXT DEFAULT '#FFFFFF',
  accent_color TEXT DEFAULT '#948CD3',
  font_family TEXT DEFAULT 'sans-serif',
  font_size_title INTEGER DEFAULT 64,
  font_size_subtitle INTEGER DEFAULT 32,
  text_position TEXT DEFAULT 'center' CHECK (text_position IN ('top', 'center', 'bottom', 'custom')),
  overlay_opacity DECIMAL DEFAULT 0.7 CHECK (overlay_opacity >= 0 AND overlay_opacity <= 1),
  logo_url TEXT,
  logo_position TEXT DEFAULT 'bottom-right' CHECK (logo_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'none')),
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Thumbnail generation jobs
-- Tracks thumbnail generation requests and results
CREATE TABLE IF NOT EXISTS thumbnail_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  video_url TEXT,
  template_id UUID REFERENCES thumbnail_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  frame_timestamp INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'extracting', 'processing', 'complete', 'failed')),
  error_message TEXT,
  input_params JSONB DEFAULT '{}'::jsonb,
  output_thumbnails JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Generated thumbnails
-- Stores individual thumbnail variants (different sizes)
CREATE TABLE IF NOT EXISTS generated_thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES thumbnail_jobs(id) ON DELETE CASCADE NOT NULL,
  size_name TEXT NOT NULL CHECK (size_name IN ('youtube', 'instagram', 'twitter', 'facebook', 'linkedin', 'custom')),
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  format TEXT DEFAULT 'png' CHECK (format IN ('png', 'jpg', 'webp')),
  quality INTEGER DEFAULT 90 CHECK (quality >= 1 AND quality <= 100),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_thumbnail_templates_created_by ON thumbnail_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_thumbnail_templates_is_default ON thumbnail_templates(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_thumbnail_jobs_user ON thumbnail_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_thumbnail_jobs_lesson ON thumbnail_jobs(lesson_id);
CREATE INDEX IF NOT EXISTS idx_thumbnail_jobs_status ON thumbnail_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generated_thumbnails_job ON generated_thumbnails(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_thumbnails_size ON generated_thumbnails(size_name);

-- RLS Policies for thumbnail_templates
ALTER TABLE thumbnail_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view thumbnail templates" ON thumbnail_templates
  FOR SELECT USING (true);

CREATE POLICY "Users can create thumbnail templates" ON thumbnail_templates
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates" ON thumbnail_templates
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all templates" ON thumbnail_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

-- RLS Policies for thumbnail_jobs
ALTER TABLE thumbnail_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thumbnail jobs" ON thumbnail_jobs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create thumbnail jobs" ON thumbnail_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own thumbnail jobs" ON thumbnail_jobs
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all thumbnail jobs" ON thumbnail_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Admins can update all thumbnail jobs" ON thumbnail_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

-- RLS Policies for generated_thumbnails
ALTER TABLE generated_thumbnails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated thumbnails" ON generated_thumbnails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thumbnail_jobs
      WHERE thumbnail_jobs.id = generated_thumbnails.job_id
      AND thumbnail_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generated thumbnails" ON generated_thumbnails
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM thumbnail_jobs
      WHERE thumbnail_jobs.id = generated_thumbnails.job_id
      AND thumbnail_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all generated thumbnails" ON generated_thumbnails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

-- Trigger for updated_at on thumbnail_templates
DROP TRIGGER IF EXISTS thumbnail_templates_updated_at ON thumbnail_templates;
CREATE TRIGGER thumbnail_templates_updated_at
  BEFORE UPDATE ON thumbnail_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on thumbnail_jobs
DROP TRIGGER IF EXISTS thumbnail_jobs_updated_at ON thumbnail_jobs;
CREATE TRIGGER thumbnail_jobs_updated_at
  BEFORE UPDATE ON thumbnail_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default thumbnail templates
INSERT INTO thumbnail_templates (name, description, layout_type, brand_style, background_color, text_color, accent_color, is_default) VALUES
  ('Professional Purple', 'Portal28 brand colors with centered layout', 'centered', 'professional', '#554D91', '#FFFFFF', '#948CD3', true),
  ('Bold Green', 'Eye-catching green theme with bold typography', 'bold', 'modern', '#547754', '#FFFFFF', '#E2D2B1', false),
  ('Minimal Blue', 'Clean minimal design with blue accents', 'minimal', 'professional', '#5674BF', '#FFFFFF', '#948CD3', false),
  ('Elegant Beige', 'Warm elegant style with beige tones', 'centered', 'elegant', '#E2D2B1', '#2C2849', '#554D91', false);

-- Function to get default thumbnail template
CREATE OR REPLACE FUNCTION get_default_thumbnail_template()
RETURNS UUID AS $$
DECLARE
  template_id UUID;
BEGIN
  SELECT id INTO template_id
  FROM thumbnail_templates
  WHERE is_default = true
  LIMIT 1;

  RETURN template_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get standard thumbnail sizes
CREATE OR REPLACE FUNCTION get_standard_thumbnail_sizes()
RETURNS TABLE (
  size_name TEXT,
  width INTEGER,
  height INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM (VALUES
    ('youtube'::TEXT, 1280, 720),
    ('instagram'::TEXT, 1080, 1080),
    ('twitter'::TEXT, 1200, 675),
    ('facebook'::TEXT, 1200, 630),
    ('linkedin'::TEXT, 1200, 627)
  ) AS sizes(size_name, width, height);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
