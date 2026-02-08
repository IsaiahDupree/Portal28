-- Tracking Events Table
-- Stores all user event tracking data

CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_tracking_events_user_id ON tracking_events(user_id);
CREATE INDEX idx_tracking_events_event_name ON tracking_events(event_name);
CREATE INDEX idx_tracking_events_timestamp ON tracking_events(timestamp DESC);
CREATE INDEX idx_tracking_events_properties ON tracking_events USING gin(properties);

-- RLS Policies
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert tracking events (API endpoint uses service client)
-- This prevents users from tampering with tracking data
CREATE POLICY "Service role can insert tracking events"
  ON tracking_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can view their own tracking events (for debugging/privacy)
CREATE POLICY "Users can view own tracking events"
  ON tracking_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all tracking events
CREATE POLICY "Admins can view all tracking events"
  ON tracking_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE tracking_events IS 'Stores all user event tracking data for analytics';
COMMENT ON COLUMN tracking_events.event_name IS 'Name of the tracked event (e.g., course_created, purchase_completed)';
COMMENT ON COLUMN tracking_events.properties IS 'Event-specific properties as JSON';
COMMENT ON COLUMN tracking_events.timestamp IS 'When the event occurred (client-reported)';
COMMENT ON COLUMN tracking_events.created_at IS 'When the event was received by the server';
