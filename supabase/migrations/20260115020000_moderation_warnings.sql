-- Moderation Warnings & Suspensions
-- Adds user warning tracking system for moderation

-- Create user_warnings table
CREATE TABLE IF NOT EXISTS user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES auth.users(id),
  warning_type TEXT NOT NULL CHECK (warning_type IN ('warning', 'suspension', 'ban')),
  reason TEXT NOT NULL,
  details TEXT,
  duration_days INTEGER, -- NULL for warnings, specific for suspensions
  expires_at TIMESTAMPTZ, -- NULL for warnings/bans, calculated for suspensions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Add index for user lookups
CREATE INDEX idx_user_warnings_user_id ON user_warnings(user_id);
CREATE INDEX idx_user_warnings_active ON user_warnings(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_warnings_expires ON user_warnings(expires_at) WHERE expires_at IS NOT NULL;

-- Add is_banned and is_suspended to community_members if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_members' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE community_members ADD COLUMN is_suspended BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_members' AND column_name = 'suspended_until'
  ) THEN
    ALTER TABLE community_members ADD COLUMN suspended_until TIMESTAMPTZ;
  END IF;
END $$;

-- Function to auto-expire suspensions
CREATE OR REPLACE FUNCTION auto_expire_suspensions()
RETURNS void AS $$
BEGIN
  -- Mark expired suspensions as resolved
  UPDATE user_warnings
  SET is_active = false,
      resolved_at = NOW()
  WHERE warning_type = 'suspension'
    AND is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- Update community_members to unsuspend
  UPDATE community_members cm
  SET is_suspended = false,
      suspended_until = NULL
  WHERE is_suspended = true
    AND suspended_until IS NOT NULL
    AND suspended_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

-- Admins can view all warnings
CREATE POLICY "admins_view_warnings" ON user_warnings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can view their own warnings
CREATE POLICY "users_view_own_warnings" ON user_warnings
  FOR SELECT
  USING (user_id = auth.uid());

-- Only admins can create warnings
CREATE POLICY "admins_create_warnings" ON user_warnings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can update warnings
CREATE POLICY "admins_update_warnings" ON user_warnings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Comment
COMMENT ON TABLE user_warnings IS 'Tracks moderation warnings, suspensions, and bans for users';
COMMENT ON COLUMN user_warnings.warning_type IS 'Type of warning: warning (note only), suspension (temporary), ban (permanent)';
COMMENT ON COLUMN user_warnings.duration_days IS 'Duration in days for suspensions (NULL for warnings/bans)';
COMMENT ON COLUMN user_warnings.expires_at IS 'Expiration date for suspensions (NULL for warnings/bans)';
