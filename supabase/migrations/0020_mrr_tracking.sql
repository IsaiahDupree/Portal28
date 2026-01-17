-- Portal28 Academy - MRR & Subscription Metrics Tracking
-- Migration for feat-024: MRR & Subscription Metrics

-- Add price_cents and interval to subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'price_cents') THEN
    ALTER TABLE subscriptions ADD COLUMN price_cents INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'interval') THEN
    ALTER TABLE subscriptions ADD COLUMN interval TEXT; -- 'month' or 'year'
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'trial_start') THEN
    ALTER TABLE subscriptions ADD COLUMN trial_start TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'trial_end') THEN
    ALTER TABLE subscriptions ADD COLUMN trial_end TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'stripe_price_id') THEN
    ALTER TABLE subscriptions ADD COLUMN stripe_price_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'current_period_start') THEN
    ALTER TABLE subscriptions ADD COLUMN current_period_start TIMESTAMPTZ;
  END IF;
END $$;

-- Create subscription_history table for tracking plan changes
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'plan_changed', 'canceled', 'renewed', 'payment_failed'
  old_tier TEXT,
  new_tier TEXT,
  old_price_cents INTEGER,
  new_price_cents INTEGER,
  old_interval TEXT,
  new_interval TEXT,
  old_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription
  ON subscription_history(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user
  ON subscription_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type
  ON subscription_history(event_type);

-- RLS policies for subscription_history
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription history" ON subscription_history;
CREATE POLICY "Users can view own subscription history" ON subscription_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscription history" ON subscription_history;
CREATE POLICY "Admins can view all subscription history" ON subscription_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to calculate current MRR
CREATE OR REPLACE FUNCTION calculate_current_mrr()
RETURNS NUMERIC AS $$
DECLARE
  total_mrr NUMERIC := 0;
  sub_record RECORD;
BEGIN
  -- Sum up all active and trialing subscriptions normalized to monthly
  FOR sub_record IN
    SELECT
      price_cents,
      interval,
      COALESCE(price_cents, 0) as price
    FROM subscriptions
    WHERE status IN ('active', 'trialing')
      AND price_cents IS NOT NULL
  LOOP
    IF sub_record.interval = 'year' THEN
      -- Annual subscriptions: divide by 12 for MRR
      total_mrr := total_mrr + (sub_record.price / 12.0);
    ELSIF sub_record.interval = 'month' THEN
      -- Monthly subscriptions: use as-is
      total_mrr := total_mrr + sub_record.price;
    END IF;
  END LOOP;

  RETURN total_mrr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get MRR breakdown by plan
CREATE OR REPLACE FUNCTION get_mrr_by_plan()
RETURNS TABLE (
  tier TEXT,
  billing_interval TEXT,
  subscriber_count BIGINT,
  monthly_revenue NUMERIC,
  annual_revenue NUMERIC,
  total_mrr NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.tier,
    s.interval as billing_interval,
    COUNT(*) as subscriber_count,
    SUM(CASE WHEN s.interval = 'month' THEN COALESCE(s.price_cents, 0) ELSE 0 END) as monthly_revenue,
    SUM(CASE WHEN s.interval = 'year' THEN COALESCE(s.price_cents, 0) ELSE 0 END) as annual_revenue,
    -- MRR: monthly as-is, annual divided by 12
    SUM(
      CASE
        WHEN s.interval = 'month' THEN COALESCE(s.price_cents, 0)
        WHEN s.interval = 'year' THEN COALESCE(s.price_cents, 0) / 12.0
        ELSE 0
      END
    ) as total_mrr
  FROM subscriptions s
  WHERE s.status IN ('active', 'trialing')
  GROUP BY s.tier, s.interval
  ORDER BY total_mrr DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate churn rate for a period
CREATE OR REPLACE FUNCTION calculate_churn_rate(p_days INTEGER DEFAULT 30)
RETURNS NUMERIC AS $$
DECLARE
  start_date TIMESTAMPTZ;
  subscribers_at_start BIGINT;
  churned_count BIGINT;
  churn_rate NUMERIC;
BEGIN
  start_date := NOW() - (p_days || ' days')::INTERVAL;

  -- Count active subscribers at start of period
  SELECT COUNT(*)
  INTO subscribers_at_start
  FROM subscriptions
  WHERE status IN ('active', 'trialing')
    AND created_at < start_date;

  -- Count subscriptions that were canceled during the period
  SELECT COUNT(*)
  INTO churned_count
  FROM subscriptions
  WHERE status = 'canceled'
    AND canceled_at >= start_date
    AND canceled_at < NOW()
    AND created_at < start_date; -- Only count subs that existed at period start

  -- Calculate churn rate as percentage
  IF subscribers_at_start > 0 THEN
    churn_rate := (churned_count::NUMERIC / subscribers_at_start::NUMERIC) * 100;
  ELSE
    churn_rate := 0;
  END IF;

  RETURN ROUND(churn_rate, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscriber list with details
CREATE OR REPLACE FUNCTION get_subscriber_list(
  p_status TEXT DEFAULT 'active',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  tier TEXT,
  status TEXT,
  price_cents INTEGER,
  billing_interval TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  created_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    u.email as user_email,
    u.full_name as user_name,
    s.tier,
    s.status,
    s.price_cents,
    s.interval as billing_interval,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.created_at,
    s.trial_start,
    s.trial_end
  FROM subscriptions s
  LEFT JOIN auth.users u ON u.id = s.user_id
  WHERE s.status = p_status OR p_status = 'all'
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get MRR history over time (daily snapshots)
CREATE OR REPLACE FUNCTION get_mrr_history(p_days INTEGER DEFAULT 90)
RETURNS TABLE (
  date DATE,
  mrr NUMERIC,
  subscriber_count BIGINT
) AS $$
DECLARE
  v_start_date DATE;
  v_current_date DATE;
BEGIN
  v_start_date := CURRENT_DATE - p_days;
  v_current_date := v_start_date;

  WHILE v_current_date <= CURRENT_DATE LOOP
    RETURN QUERY
    SELECT
      v_current_date as date,
      -- Calculate MRR for subscriptions active on this date
      SUM(
        CASE
          WHEN s.interval = 'month' THEN COALESCE(s.price_cents, 0)
          WHEN s.interval = 'year' THEN COALESCE(s.price_cents, 0) / 12.0
          ELSE 0
        END
      ) as mrr,
      COUNT(*) as subscriber_count
    FROM subscriptions s
    WHERE s.status IN ('active', 'trialing')
      AND s.created_at <= v_current_date
      AND (s.canceled_at IS NULL OR s.canceled_at > v_current_date);

    v_current_date := v_current_date + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to track subscription changes
CREATE OR REPLACE FUNCTION track_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT (new subscription)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO subscription_history (
      subscription_id, user_id, event_type,
      new_tier, new_price_cents, new_interval, new_status
    ) VALUES (
      NEW.id, NEW.user_id, 'created',
      NEW.tier, NEW.price_cents, NEW.interval, NEW.status
    );
    RETURN NEW;
  END IF;

  -- On UPDATE (status change, plan change, cancellation)
  IF TG_OP = 'UPDATE' THEN
    -- Detect event type
    DECLARE
      v_event_type TEXT;
    BEGIN
      IF OLD.status != NEW.status THEN
        IF NEW.status = 'canceled' THEN
          v_event_type := 'canceled';
        ELSIF NEW.status = 'active' AND OLD.status IN ('past_due', 'unpaid') THEN
          v_event_type := 'renewed';
        ELSIF NEW.status = 'past_due' THEN
          v_event_type := 'payment_failed';
        ELSE
          v_event_type := 'status_changed';
        END IF;
      ELSIF OLD.tier != NEW.tier OR OLD.price_cents != NEW.price_cents THEN
        v_event_type := 'plan_changed';
      ELSE
        v_event_type := 'updated';
      END IF;

      INSERT INTO subscription_history (
        subscription_id, user_id, event_type,
        old_tier, new_tier,
        old_price_cents, new_price_cents,
        old_interval, new_interval,
        old_status, new_status
      ) VALUES (
        NEW.id, NEW.user_id, v_event_type,
        OLD.tier, NEW.tier,
        OLD.price_cents, NEW.price_cents,
        OLD.interval, NEW.interval,
        OLD.status, NEW.status
      );
    END;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for subscription changes
DROP TRIGGER IF EXISTS subscription_change_tracker ON subscriptions;
CREATE TRIGGER subscription_change_tracker
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION track_subscription_change();

-- Add comment to document the migration
COMMENT ON TABLE subscription_history IS 'Tracks all subscription lifecycle events for analytics and MRR calculations';
COMMENT ON FUNCTION calculate_current_mrr() IS 'Calculates total MRR from all active/trialing subscriptions, normalizing annual to monthly';
COMMENT ON FUNCTION get_mrr_by_plan() IS 'Returns MRR breakdown by tier and interval';
COMMENT ON FUNCTION calculate_churn_rate(INTEGER) IS 'Calculates churn rate as percentage of subscribers lost in the period';
COMMENT ON FUNCTION get_subscriber_list(TEXT, INTEGER, INTEGER) IS 'Returns paginated list of subscribers with user details';
COMMENT ON FUNCTION get_mrr_history(INTEGER) IS 'Returns daily MRR snapshots over the specified period';
