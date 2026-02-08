-- Create webhook_events table for logging all webhook events
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Source information
  source TEXT NOT NULL CHECK (source IN ('stripe', 'resend', 'mux', 'other')),
  event_type TEXT NOT NULL,
  event_id TEXT, -- External event ID (e.g., Stripe event ID)

  -- Request details
  payload JSONB NOT NULL,
  headers JSONB,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'retrying')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Response details
  error_message TEXT,
  error_stack TEXT,
  response_data JSONB,

  -- Performance tracking
  processing_time_ms INT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for common queries
CREATE INDEX idx_webhook_events_source ON webhook_events(source);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_webhook_events_next_retry ON webhook_events(next_retry_at) WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- Create composite index for filtering
CREATE INDEX idx_webhook_events_source_status ON webhook_events(source, status, created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_events_updated_at();

-- RLS policies
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read webhook events
CREATE POLICY "Admins can read webhook events"
  ON webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can insert/update webhook events (for webhook processing)
CREATE POLICY "Service role can manage webhook events"
  ON webhook_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create view for webhook event statistics
CREATE OR REPLACE VIEW webhook_event_stats AS
SELECT
  source,
  event_type,
  status,
  COUNT(*) as count,
  AVG(processing_time_ms) as avg_processing_time_ms,
  MAX(processing_time_ms) as max_processing_time_ms,
  MIN(processing_time_ms) as min_processing_time_ms,
  COUNT(*) FILTER (WHERE attempts > 1) as retry_count,
  DATE_TRUNC('hour', created_at) as hour
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY source, event_type, status, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, source, event_type;

-- Grant select on view to authenticated users with admin role
GRANT SELECT ON webhook_event_stats TO authenticated;

-- Create function to clean up old webhook events (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND status IN ('success', 'failed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE webhook_events IS 'Logs all webhook events from external services (Stripe, Resend, Mux) with retry tracking';
