-- Custom Audiences Migration
-- META-007: Configure custom audiences based on user behavior
-- Stores audience definitions and sync status with Meta

-- Custom Audiences table
-- Stores audience definitions for Meta advertising
CREATE TABLE IF NOT EXISTS custom_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  audience_type TEXT NOT nullCHECK (audience_type IN (
    'purchasers',           -- Users who purchased any course
    'course_completers',    -- Users who completed at least one course
    'engaged_users',        -- Users with recent activity
    'abandoned_checkouts',  -- Users who started but didn't complete checkout
    'high_value',           -- Users who spent over threshold
    'custom'                -- Custom SQL query
  )),

  -- Audience configuration
  config JSONB DEFAULT '{}'::jsonb, -- Stores config like course_id, date_range, spend_threshold

  -- Meta API details
  meta_audience_id TEXT,             -- Meta's audience ID (from API)
  meta_pixel_id TEXT,                -- Which pixel this audience belongs to
  last_sync_at TIMESTAMPTZ,          -- Last successful sync
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
  sync_error TEXT,                   -- Error message if sync failed
  user_count INTEGER DEFAULT 0,      -- Number of users in audience

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Custom Audience Members (for tracking)
-- Optional: stores which users are in which audiences for debugging
CREATE TABLE IF NOT EXISTS custom_audience_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id UUID NOT NULL REFERENCES custom_audiences(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(audience_id, user_id)
);

-- Sync History (audit log)
CREATE TABLE IF NOT EXISTS custom_audience_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id UUID NOT NULL REFERENCES custom_audiences(id) ON DELETE CASCADE,
  sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  users_sent INTEGER,
  status TEXT NOT NULL CHECK (status IN ('started', 'success', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_custom_audiences_type ON custom_audiences(audience_type);
CREATE INDEX idx_custom_audiences_active ON custom_audiences(is_active) WHERE is_active = true;
CREATE INDEX idx_custom_audiences_meta_id ON custom_audiences(meta_audience_id);
CREATE INDEX idx_custom_audience_members_audience ON custom_audience_members(audience_id);
CREATE INDEX idx_custom_audience_members_user ON custom_audience_members(user_id);
CREATE INDEX idx_custom_audience_sync_history_audience ON custom_audience_sync_history(audience_id);

-- RLS Policies
ALTER TABLE custom_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_audience_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_audience_sync_history ENABLE ROW LEVEL SECURITY;

-- Only admins can manage custom audiences
CREATE POLICY "Admins can view all custom audiences"
  ON custom_audiences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert custom audiences"
  ON custom_audiences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update custom audiences"
  ON custom_audiences
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete custom audiences"
  ON custom_audiences
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Audience members - admin only
CREATE POLICY "Admins can view audience members"
  ON custom_audience_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Sync history - admin only
CREATE POLICY "Admins can view sync history"
  ON custom_audience_sync_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role can insert sync history
CREATE POLICY "Service can insert sync history"
  ON custom_audience_sync_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_custom_audiences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_audiences_updated_at
  BEFORE UPDATE ON custom_audiences
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_audiences_updated_at();

-- Helper function to get audience user emails (for Meta API)
CREATE OR REPLACE FUNCTION get_audience_user_emails(audience_uuid UUID)
RETURNS TABLE (email TEXT) AS $$
DECLARE
  aud_type TEXT;
  aud_config JSONB;
BEGIN
  -- Get audience type and config
  SELECT audience_type, config INTO aud_type, aud_config
  FROM custom_audiences
  WHERE id = audience_uuid;

  -- Return appropriate user emails based on audience type
  CASE aud_type
    WHEN 'purchasers' THEN
      -- All users who purchased any course
      RETURN QUERY
      SELECT DISTINCT u.email
      FROM users u
      INNER JOIN entitlements e ON u.id = e.user_id
      WHERE e.status = 'active';

    WHEN 'course_completers' THEN
      -- Users who completed at least one course
      -- (Assuming completion is tracked elsewhere)
      RETURN QUERY
      SELECT DISTINCT u.email
      FROM users u
      INNER JOIN entitlements e ON u.id = e.user_id
      WHERE e.status = 'active';

    WHEN 'engaged_users' THEN
      -- Users with activity in last N days (default 30)
      RETURN QUERY
      SELECT DISTINCT u.email
      FROM users u
      INNER JOIN tracking_events te ON u.id = te.user_id
      WHERE te.created_at > NOW() - INTERVAL '30 days';

    WHEN 'abandoned_checkouts' THEN
      -- Users who started checkout but didn't complete
      RETURN QUERY
      SELECT DISTINCT u.email
      FROM users u
      INNER JOIN tracking_events te ON u.id = te.user_id
      WHERE te.event_name = 'checkout_started'
        AND te.created_at > NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM orders o
          WHERE o.user_id = u.id
            AND o.status = 'paid'
            AND o.created_at > te.created_at
        );

    WHEN 'high_value' THEN
      -- Users who spent over threshold (from config)
      RETURN QUERY
      SELECT DISTINCT u.email
      FROM users u
      INNER JOIN orders o ON u.id = o.user_id
      WHERE o.status = 'paid'
      GROUP BY u.email
      HAVING SUM(o.amount) >= COALESCE((aud_config->>'min_spend')::INTEGER, 10000); -- default $100

    ELSE
      -- Empty result for unknown types
      RETURN QUERY SELECT NULL::TEXT WHERE FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE custom_audiences IS 'META-007: Stores custom audience definitions for Meta advertising';
COMMENT ON COLUMN custom_audiences.audience_type IS 'Type of audience: purchasers, course_completers, engaged_users, etc.';
COMMENT ON COLUMN custom_audiences.config IS 'JSON configuration specific to audience type';
COMMENT ON COLUMN custom_audiences.meta_audience_id IS 'Meta API audience ID returned after creation';
COMMENT ON TABLE custom_audience_members IS 'Tracks which users are in which custom audiences';
COMMENT ON TABLE custom_audience_sync_history IS 'Audit log of audience syncs to Meta';
