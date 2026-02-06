-- ============================================================================
-- ABANDONED CHECKOUT RECOVERY SYSTEM
-- ============================================================================
-- Feature: feat-060 - Abandoned Checkout Recovery
-- Purpose: Track checkout abandonment events and enable recovery emails
-- Test IDs: GRO-ACR-001, GRO-ACR-002, GRO-ACR-003, GRO-ACR-004
-- ============================================================================

-- Table: abandoned_checkouts
-- Tracks when users start but don't complete checkout
CREATE TABLE IF NOT EXISTS abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  -- Product Information
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL, -- 'course', 'bundle', 'membership'

  -- Pricing Information
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  promo_code TEXT,
  discount_amount_cents INTEGER DEFAULT 0,

  -- Checkout Session
  stripe_session_id TEXT,
  cart_contents JSONB DEFAULT '[]'::jsonb,

  -- Tracking Fields
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  abandoned_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,

  -- Recovery
  recovery_token TEXT UNIQUE,
  recovery_emails_sent INTEGER DEFAULT 0,
  last_recovery_email_sent_at TIMESTAMPTZ,

  -- Attribution
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  referrer TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'started', -- 'started', 'abandoned', 'recovered', 'expired'

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_abandoned_checkouts_user_id ON abandoned_checkouts(user_id);
CREATE INDEX idx_abandoned_checkouts_email ON abandoned_checkouts(email);
CREATE INDEX idx_abandoned_checkouts_status ON abandoned_checkouts(status);
CREATE INDEX idx_abandoned_checkouts_started_at ON abandoned_checkouts(started_at);
CREATE INDEX idx_abandoned_checkouts_abandoned_at ON abandoned_checkouts(abandoned_at);
CREATE INDEX idx_abandoned_checkouts_stripe_session_id ON abandoned_checkouts(stripe_session_id);
CREATE INDEX idx_abandoned_checkouts_recovery_token ON abandoned_checkouts(recovery_token);
CREATE INDEX idx_abandoned_checkouts_course_id ON abandoned_checkouts(course_id);

-- Updated_at trigger
CREATE TRIGGER update_abandoned_checkouts_updated_at
  BEFORE UPDATE ON abandoned_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own abandoned checkouts
CREATE POLICY "Users can view own abandoned checkouts"
  ON abandoned_checkouts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all abandoned checkouts
CREATE POLICY "Admins can view all abandoned checkouts"
  ON abandoned_checkouts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role can insert/update (for API routes and cron jobs)
CREATE POLICY "Service role can manage abandoned checkouts"
  ON abandoned_checkouts
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- View: Abandonment metrics by product
CREATE OR REPLACE VIEW abandonment_metrics_by_product AS
SELECT
  product_name,
  product_type,
  COUNT(*) as total_checkouts,
  COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned_count,
  COUNT(*) FILTER (WHERE status = 'recovered') as recovered_count,
  COUNT(*) FILTER (WHERE status = 'recovered')::decimal / NULLIF(COUNT(*) FILTER (WHERE status = 'abandoned'), 0) * 100 as recovery_rate_pct,
  COUNT(*) FILTER (WHERE status = 'abandoned')::decimal / NULLIF(COUNT(*), 0) * 100 as abandonment_rate_pct,
  SUM(price_cents) FILTER (WHERE status = 'recovered') as revenue_recovered_cents,
  AVG(price_cents) as avg_price_cents
FROM abandoned_checkouts
GROUP BY product_name, product_type;

-- View: Abandonment metrics by time period
CREATE OR REPLACE VIEW abandonment_metrics_by_day AS
SELECT
  DATE(started_at) as date,
  COUNT(*) as total_checkouts,
  COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned_count,
  COUNT(*) FILTER (WHERE status = 'recovered') as recovered_count,
  COUNT(*) FILTER (WHERE status = 'recovered')::decimal / NULLIF(COUNT(*) FILTER (WHERE status = 'abandoned'), 0) * 100 as recovery_rate_pct,
  SUM(price_cents) FILTER (WHERE status = 'recovered') as revenue_recovered_cents
FROM abandoned_checkouts
GROUP BY DATE(started_at)
ORDER BY DATE(started_at) DESC;

-- View: Recovery email performance
CREATE OR REPLACE VIEW recovery_email_performance AS
SELECT
  recovery_emails_sent,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'recovered') as recovered_count,
  COUNT(*) FILTER (WHERE status = 'recovered')::decimal / NULLIF(COUNT(*), 0) * 100 as recovery_rate_pct,
  AVG(EXTRACT(EPOCH FROM (recovered_at - last_recovery_email_sent_at)) / 3600) as avg_hours_to_recovery
FROM abandoned_checkouts
WHERE recovery_emails_sent > 0
GROUP BY recovery_emails_sent
ORDER BY recovery_emails_sent;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Mark checkout as abandoned (called by cron job)
CREATE OR REPLACE FUNCTION mark_checkouts_as_abandoned()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark checkouts as abandoned if:
  -- - Status is 'started'
  -- - Started more than 30 minutes ago
  -- - No associated completed order
  UPDATE abandoned_checkouts
  SET
    status = 'abandoned',
    abandoned_at = now(),
    updated_at = now()
  WHERE
    status = 'started'
    AND started_at < (now() - INTERVAL '30 minutes')
    AND NOT EXISTS (
      SELECT 1 FROM orders
      WHERE orders.stripe_session_id = abandoned_checkouts.stripe_session_id
      AND orders.status = 'paid'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get checkouts needing recovery emails
CREATE OR REPLACE FUNCTION get_checkouts_needing_recovery()
RETURNS TABLE (
  id UUID,
  email TEXT,
  product_name TEXT,
  price_cents INTEGER,
  currency TEXT,
  recovery_token TEXT,
  recovery_emails_sent INTEGER,
  started_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.id,
    ac.email,
    ac.product_name,
    ac.price_cents,
    ac.currency,
    ac.recovery_token,
    ac.recovery_emails_sent,
    ac.started_at,
    ac.abandoned_at
  FROM abandoned_checkouts ac
  WHERE
    ac.status = 'abandoned'
    AND (
      -- First email: 1 hour after abandonment
      (ac.recovery_emails_sent = 0 AND ac.abandoned_at < (now() - INTERVAL '1 hour'))
      -- Second email: 24 hours after first
      OR (ac.recovery_emails_sent = 1 AND ac.last_recovery_email_sent_at < (now() - INTERVAL '24 hours'))
      -- Third email: 72 hours after second
      OR (ac.recovery_emails_sent = 2 AND ac.last_recovery_email_sent_at < (now() - INTERVAL '72 hours'))
    )
    -- Don't send more than 3 emails
    AND ac.recovery_emails_sent < 3
  ORDER BY ac.abandoned_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate recovery token
CREATE OR REPLACE FUNCTION generate_recovery_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA FOR TESTING (Optional)
-- ============================================================================

-- Example: Insert a test abandoned checkout
-- Uncomment for local testing
/*
INSERT INTO abandoned_checkouts (
  email,
  product_name,
  product_type,
  price_cents,
  stripe_session_id,
  started_at,
  status,
  recovery_token
) VALUES (
  'test@example.com',
  'Test Course',
  'course',
  9900,
  'cs_test_123',
  now() - INTERVAL '2 hours',
  'started',
  generate_recovery_token()
);
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE abandoned_checkouts IS 'Tracks checkout abandonment events for recovery email sequences';
COMMENT ON COLUMN abandoned_checkouts.recovery_token IS 'Secure token for recovery links in emails';
COMMENT ON COLUMN abandoned_checkouts.cart_contents IS 'JSON array of items in cart at abandonment';
COMMENT ON COLUMN abandoned_checkouts.status IS 'Lifecycle: started -> abandoned -> recovered/expired';
COMMENT ON FUNCTION mark_checkouts_as_abandoned() IS 'Cron job: Mark old checkouts as abandoned';
COMMENT ON FUNCTION get_checkouts_needing_recovery() IS 'Cron job: Get checkouts needing recovery emails';
