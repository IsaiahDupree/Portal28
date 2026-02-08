-- Conversion Metrics Migration
-- META-008: Conversion Optimization tracking
-- Stores conversion data for ROAS calculation and optimization

-- Conversion Events Table
-- Tracks all conversion events with their values for analytics
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_id TEXT, -- Meta event ID for deduplication
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,

  -- Conversion value
  value DECIMAL(10, 2), -- Conversion value in dollars
  currency TEXT DEFAULT 'USD',
  predicted_ltv DECIMAL(10, 2), -- Predicted lifetime value (for subscriptions)

  -- Attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT, -- Facebook click ID
  referrer TEXT,

  -- Event metadata
  content_ids TEXT[], -- Array of product/course IDs
  content_type TEXT,
  content_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversion Funnel Steps Table
-- Tracks user progression through conversion funnels
CREATE TABLE IF NOT EXISTS conversion_funnel_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  funnel_type TEXT NOT NULL, -- 'course_purchase', 'subscription', etc.
  step_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ad Campaign Performance Table (for ROAS tracking)
-- Stores ad campaign spend and performance metrics
CREATE TABLE IF NOT EXISTS ad_campaign_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL, -- UTM campaign ID
  campaign_name TEXT,
  date DATE NOT NULL,

  -- Spend data (manually entered or imported)
  ad_spend DECIMAL(10, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- Conversion data (calculated from conversion_events)
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,

  -- Calculated metrics
  roas DECIMAL(10, 2), -- Return on ad spend
  cpa DECIMAL(10, 2), -- Cost per acquisition
  ctr DECIMAL(5, 2), -- Click-through rate
  cvr DECIMAL(5, 2), -- Conversion rate

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(campaign_id, date)
);

-- Indexes
CREATE INDEX idx_conversion_events_user ON conversion_events(user_id);
CREATE INDEX idx_conversion_events_name ON conversion_events(event_name);
CREATE INDEX idx_conversion_events_created ON conversion_events(created_at DESC);
CREATE INDEX idx_conversion_events_utm_campaign ON conversion_events(utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX idx_conversion_events_fbclid ON conversion_events(fbclid) WHERE fbclid IS NOT NULL;

CREATE INDEX idx_funnel_steps_user ON conversion_funnel_steps(user_id);
CREATE INDEX idx_funnel_steps_session ON conversion_funnel_steps(session_id);
CREATE INDEX idx_funnel_steps_funnel_type ON conversion_funnel_steps(funnel_type);
CREATE INDEX idx_funnel_steps_created ON conversion_funnel_steps(created_at DESC);

CREATE INDEX idx_ad_performance_campaign ON ad_campaign_performance(campaign_id);
CREATE INDEX idx_ad_performance_date ON ad_campaign_performance(date DESC);

-- RLS Policies
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaign_performance ENABLE ROW LEVEL SECURITY;

-- Service role can insert conversion events (tracking API)
CREATE POLICY "Service can insert conversion events"
  ON conversion_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can view all conversion events
CREATE POLICY "Admins can view conversion events"
  ON conversion_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can view their own conversion events
CREATE POLICY "Users can view own conversion events"
  ON conversion_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert funnel steps
CREATE POLICY "Service can insert funnel steps"
  ON conversion_funnel_steps
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can view their own funnel steps
CREATE POLICY "Users can view own funnel steps"
  ON conversion_funnel_steps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all funnel steps
CREATE POLICY "Admins can view all funnel steps"
  ON conversion_funnel_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can manage ad campaign performance
CREATE POLICY "Admins can manage ad performance"
  ON ad_campaign_performance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ad_campaign_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ad_campaign_performance_updated_at
  BEFORE UPDATE ON ad_campaign_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_campaign_performance_updated_at();

-- Function to calculate ROAS for a campaign
CREATE OR REPLACE FUNCTION calculate_campaign_roas(
  campaign_uuid UUID
)
RETURNS DECIMAL AS $$
DECLARE
  total_spend DECIMAL;
  total_revenue DECIMAL;
  calculated_roas DECIMAL;
BEGIN
  SELECT ad_spend, revenue INTO total_spend, total_revenue
  FROM ad_campaign_performance
  WHERE id = campaign_uuid;

  IF total_spend = 0 OR total_spend IS NULL THEN
    RETURN 0;
  END IF;

  calculated_roas = total_revenue / total_spend;
  RETURN ROUND(calculated_roas, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get conversion funnel drop-off rates
CREATE OR REPLACE FUNCTION get_funnel_dropoff_rates(
  funnel_type_param TEXT,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  step_name TEXT,
  step_number INTEGER,
  user_count BIGINT,
  drop_off_count BIGINT,
  drop_off_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH step_counts AS (
    SELECT
      s.step_name,
      s.step_number,
      COUNT(DISTINCT s.user_id) as users
    FROM conversion_funnel_steps s
    WHERE s.funnel_type = funnel_type_param
      AND s.created_at >= start_date
      AND s.created_at <= end_date
    GROUP BY s.step_name, s.step_number
    ORDER BY s.step_number
  ),
  step_with_next AS (
    SELECT
      sc.step_name,
      sc.step_number,
      sc.users as user_count,
      COALESCE(
        LAG(sc.users) OVER (ORDER BY sc.step_number DESC),
        sc.users
      ) - sc.users as drop_off_count
    FROM step_counts sc
  )
  SELECT
    swn.step_name,
    swn.step_number,
    swn.user_count,
    swn.drop_off_count,
    CASE
      WHEN swn.user_count + swn.drop_off_count = 0 THEN 0
      ELSE ROUND(
        (swn.drop_off_count::DECIMAL / (swn.user_count + swn.drop_off_count)) * 100,
        2
      )
    END as drop_off_rate
  FROM step_with_next swn
  ORDER BY swn.step_number;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE conversion_events IS 'META-008: Tracks all conversion events with values for optimization';
COMMENT ON TABLE conversion_funnel_steps IS 'META-008: Tracks user progression through conversion funnels';
COMMENT ON TABLE ad_campaign_performance IS 'META-008: Stores ad campaign performance for ROAS tracking';
COMMENT ON COLUMN conversion_events.predicted_ltv IS 'Predicted customer lifetime value for Subscribe events';
COMMENT ON COLUMN ad_campaign_performance.roas IS 'Return on ad spend (revenue / ad_spend)';
COMMENT ON COLUMN ad_campaign_performance.cpa IS 'Cost per acquisition (ad_spend / conversions)';
