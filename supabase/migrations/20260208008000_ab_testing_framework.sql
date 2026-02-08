-- A/B Testing Framework Migration
-- Created: 2026-02-08
-- Feature: feat-133 - A/B Testing Framework

-- Main A/B tests table
CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT, -- What we're testing
  test_type TEXT NOT NULL, -- 'pricing', 'landing_page', 'checkout', 'offer', 'email'
  target_entity_type TEXT, -- 'course', 'offer', 'bundle', 'email_template'
  target_entity_id UUID, -- References the entity being tested
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  traffic_allocation DECIMAL(5,2) NOT NULL DEFAULT 100.00, -- % of traffic to include (0-100)
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  winner_variant_id UUID, -- Set when test concludes
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Test variants table (each test has 2+ variants)
CREATE TABLE IF NOT EXISTS public.ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Control', 'Variant A', 'Variant B', etc.
  description TEXT,
  is_control BOOLEAN NOT NULL DEFAULT false, -- One variant should be control
  traffic_weight DECIMAL(5,2) NOT NULL DEFAULT 50.00, -- % of test traffic (weights should sum to 100)

  -- Variant configuration (JSON for flexibility)
  config JSONB NOT NULL DEFAULT '{}'::JSONB, -- Store variant-specific settings

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assignments table (which user saw which variant)
CREATE TABLE IF NOT EXISTS public.ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.ab_test_variants(id) ON DELETE CASCADE,

  -- User identification (use anon_id for non-logged-in users)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id TEXT, -- For anonymous users

  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one assignment per user per test
  UNIQUE(test_id, user_id),
  UNIQUE(test_id, anon_id)
);

-- Conversion events table (track actions/conversions per variant)
CREATE TABLE IF NOT EXISTS public.ab_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.ab_test_variants(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.ab_test_assignments(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL, -- 'view', 'click', 'add_to_cart', 'purchase', 'signup', etc.
  event_value DECIMAL(10,2), -- For revenue tracking

  metadata JSONB, -- Store additional event data

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Metrics summary view (aggregated stats per variant)
CREATE TABLE IF NOT EXISTS public.ab_test_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.ab_test_variants(id) ON DELETE CASCADE,

  -- Computed metrics
  impressions INT NOT NULL DEFAULT 0,
  unique_visitors INT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0,
  conversion_rate DECIMAL(5,2), -- Percentage
  total_revenue DECIMAL(10,2),
  average_order_value DECIMAL(10,2),

  -- Statistical significance
  confidence_level DECIMAL(5,2), -- % confidence (e.g., 95.00)
  p_value DECIMAL(10,8), -- Statistical significance
  is_significant BOOLEAN DEFAULT false,

  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(test_id, variant_id)
);

-- Indexes for performance
CREATE INDEX idx_ab_tests_status ON public.ab_tests(status);
CREATE INDEX idx_ab_tests_target ON public.ab_tests(target_entity_type, target_entity_id);
CREATE INDEX idx_ab_test_variants_test_id ON public.ab_test_variants(test_id);
CREATE INDEX idx_ab_test_assignments_test_id ON public.ab_test_assignments(test_id);
CREATE INDEX idx_ab_test_assignments_user_id ON public.ab_test_assignments(user_id);
CREATE INDEX idx_ab_test_assignments_anon_id ON public.ab_test_assignments(anon_id);
CREATE INDEX idx_ab_test_events_test_id ON public.ab_test_events(test_id);
CREATE INDEX idx_ab_test_events_variant_id ON public.ab_test_events(variant_id);
CREATE INDEX idx_ab_test_events_occurred_at ON public.ab_test_events(occurred_at);
CREATE INDEX idx_ab_test_metrics_test_id ON public.ab_test_metrics(test_id);

-- Enable Row Level Security
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- ab_tests: Admins can manage, public can read active tests
CREATE POLICY "ab_tests_admin_all" ON public.ab_tests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "ab_tests_public_read_active" ON public.ab_tests
FOR SELECT USING (status = 'active');

-- ab_test_variants: Same as ab_tests
CREATE POLICY "ab_test_variants_admin_all" ON public.ab_test_variants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "ab_test_variants_public_read_active" ON public.ab_test_variants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.ab_tests
    WHERE ab_tests.id = test_id AND ab_tests.status = 'active'
  )
);

-- ab_test_assignments: Users can read their own, admins all
CREATE POLICY "ab_test_assignments_user_read_own" ON public.ab_test_assignments
FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "ab_test_assignments_insert" ON public.ab_test_assignments
FOR INSERT WITH CHECK (true); -- Anyone can be assigned

-- ab_test_events: Public can insert events, admins can read all
CREATE POLICY "ab_test_events_public_insert" ON public.ab_test_events
FOR INSERT WITH CHECK (true);

CREATE POLICY "ab_test_events_admin_read" ON public.ab_test_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- ab_test_metrics: Admins can manage, public can read for active tests
CREATE POLICY "ab_test_metrics_admin_all" ON public.ab_test_metrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "ab_test_metrics_public_read_active" ON public.ab_test_metrics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.ab_tests
    WHERE ab_tests.id = test_id AND ab_tests.status = 'active'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ab_test_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ab_tests_updated_at
BEFORE UPDATE ON public.ab_tests
FOR EACH ROW
EXECUTE FUNCTION update_ab_test_updated_at();

-- Function to calculate metrics (called via cron or admin action)
CREATE OR REPLACE FUNCTION calculate_ab_test_metrics(test_id_param UUID)
RETURNS void AS $$
DECLARE
  variant_record RECORD;
  total_impressions INT;
  total_conversions INT;
  conversion_rate_val DECIMAL(5,2);
  control_conversion_rate DECIMAL(5,2);
  variant_conversion_rate DECIMAL(5,2);
  p_value_result DECIMAL(10,8);
  is_sig BOOLEAN;
BEGIN
  -- Loop through each variant in the test
  FOR variant_record IN
    SELECT v.id, v.is_control
    FROM public.ab_test_variants v
    WHERE v.test_id = test_id_param
  LOOP
    -- Count impressions (assignments)
    SELECT COUNT(*) INTO total_impressions
    FROM public.ab_test_assignments
    WHERE test_id = test_id_param AND variant_id = variant_record.id;

    -- Count conversions (purchase events)
    SELECT COUNT(DISTINCT assignment_id) INTO total_conversions
    FROM public.ab_test_events
    WHERE test_id = test_id_param
      AND variant_id = variant_record.id
      AND event_type = 'purchase';

    -- Calculate conversion rate
    IF total_impressions > 0 THEN
      conversion_rate_val := (total_conversions::DECIMAL / total_impressions::DECIMAL) * 100;
    ELSE
      conversion_rate_val := 0;
    END IF;

    -- Calculate total revenue
    -- Calculate average order value

    -- Upsert metrics
    INSERT INTO public.ab_test_metrics (
      test_id,
      variant_id,
      impressions,
      unique_visitors,
      conversions,
      conversion_rate,
      total_revenue,
      average_order_value,
      last_calculated_at
    )
    SELECT
      test_id_param,
      variant_record.id,
      total_impressions,
      total_impressions, -- Simplified: assume 1 assignment per visitor
      total_conversions,
      conversion_rate_val,
      COALESCE(SUM(event_value), 0),
      CASE
        WHEN total_conversions > 0 THEN COALESCE(SUM(event_value), 0) / total_conversions
        ELSE 0
      END,
      NOW()
    FROM public.ab_test_events
    WHERE test_id = test_id_param
      AND variant_id = variant_record.id
      AND event_type = 'purchase'
    ON CONFLICT (test_id, variant_id)
    DO UPDATE SET
      impressions = EXCLUDED.impressions,
      unique_visitors = EXCLUDED.unique_visitors,
      conversions = EXCLUDED.conversions,
      conversion_rate = EXCLUDED.conversion_rate,
      total_revenue = EXCLUDED.total_revenue,
      average_order_value = EXCLUDED.average_order_value,
      last_calculated_at = EXCLUDED.last_calculated_at;
  END LOOP;

  -- TODO: Calculate statistical significance (Z-test for proportions)
  -- This would require more complex statistical calculations
  -- For MVP, we'll mark as significant if confidence > 95% and sample size > 100

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT ON public.ab_test_assignments TO authenticated, anon;
GRANT SELECT, INSERT ON public.ab_test_events TO authenticated, anon;
GRANT SELECT ON public.ab_tests TO authenticated, anon;
GRANT SELECT ON public.ab_test_variants TO authenticated, anon;
GRANT SELECT ON public.ab_test_metrics TO authenticated, anon;

COMMENT ON TABLE public.ab_tests IS 'A/B tests for optimizing conversions and user experience';
COMMENT ON TABLE public.ab_test_variants IS 'Variants for each A/B test (control + treatment variants)';
COMMENT ON TABLE public.ab_test_assignments IS 'User assignments to test variants';
COMMENT ON TABLE public.ab_test_events IS 'Events/conversions tracked per variant';
COMMENT ON TABLE public.ab_test_metrics IS 'Aggregated metrics and statistical analysis per variant';
