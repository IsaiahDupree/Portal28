-- Portal28 Academy - Cohort Analytics Migration
-- Feature: feat-061 - Cohort Analytics
-- Description: Track user cohorts by signup date, retention rates, and LTV

-- ============================================================================
-- Database Functions for Cohort Analytics
-- ============================================================================

-- Function: Get cohort data with retention and LTV metrics
-- Groups users by signup cohort (week/month) and calculates retention + LTV
CREATE OR REPLACE FUNCTION get_cohort_analytics(
  p_cohort_period TEXT DEFAULT 'month', -- 'week' or 'month'
  p_limit INT DEFAULT 12
)
RETURNS TABLE (
  cohort_date TEXT,
  cohort_size INT,
  total_revenue NUMERIC,
  avg_ltv NUMERIC,
  retention_week_1 NUMERIC,
  retention_week_2 NUMERIC,
  retention_week_4 NUMERIC,
  retention_week_8 NUMERIC,
  retention_week_12 NUMERIC
) AS $$
DECLARE
  date_format TEXT;
BEGIN
  -- Set date format based on period
  IF p_cohort_period = 'week' THEN
    date_format := 'IYYY-IW'; -- ISO week
  ELSE
    date_format := 'YYYY-MM'; -- Month
  END IF;

  RETURN QUERY
  WITH user_cohorts AS (
    -- Group users by their signup cohort
    SELECT
      u.id AS user_id,
      u.email,
      u.created_at::DATE AS signup_date,
      TO_CHAR(u.created_at, date_format) AS cohort
    FROM public.users u
  ),
  cohort_revenue AS (
    -- Calculate total revenue per cohort
    SELECT
      uc.cohort,
      COUNT(DISTINCT uc.user_id) AS cohort_size,
      COALESCE(SUM(o.amount), 0) AS total_revenue,
      COALESCE(SUM(o.amount) / NULLIF(COUNT(DISTINCT uc.user_id), 0), 0) AS avg_ltv
    FROM user_cohorts uc
    LEFT JOIN public.orders o ON o.user_id = uc.user_id AND o.status = 'completed'
    GROUP BY uc.cohort
  ),
  cohort_retention AS (
    -- Calculate retention rates at different time intervals
    SELECT
      uc.cohort,
      -- Week 1 retention (active within 7 days)
      COUNT(DISTINCT CASE
        WHEN o.created_at <= uc.signup_date + INTERVAL '7 days'
        THEN uc.user_id
      END)::NUMERIC / NULLIF(COUNT(DISTINCT uc.user_id), 0) AS retention_week_1,
      -- Week 2 retention (active within 14 days)
      COUNT(DISTINCT CASE
        WHEN o.created_at <= uc.signup_date + INTERVAL '14 days'
        THEN uc.user_id
      END)::NUMERIC / NULLIF(COUNT(DISTINCT uc.user_id), 0) AS retention_week_2,
      -- Week 4 retention (active within 28 days)
      COUNT(DISTINCT CASE
        WHEN o.created_at <= uc.signup_date + INTERVAL '28 days'
        THEN uc.user_id
      END)::NUMERIC / NULLIF(COUNT(DISTINCT uc.user_id), 0) AS retention_week_4,
      -- Week 8 retention (active within 56 days)
      COUNT(DISTINCT CASE
        WHEN o.created_at <= uc.signup_date + INTERVAL '56 days'
        THEN uc.user_id
      END)::NUMERIC / NULLIF(COUNT(DISTINCT uc.user_id), 0) AS retention_week_8,
      -- Week 12 retention (active within 84 days)
      COUNT(DISTINCT CASE
        WHEN o.created_at <= uc.signup_date + INTERVAL '84 days'
        THEN uc.user_id
      END)::NUMERIC / NULLIF(COUNT(DISTINCT uc.user_id), 0) AS retention_week_12
    FROM user_cohorts uc
    LEFT JOIN public.orders o ON o.user_id = uc.user_id AND o.status = 'completed'
    GROUP BY uc.cohort
  )
  SELECT
    cr.cohort AS cohort_date,
    cr.cohort_size::INT,
    cr.total_revenue::NUMERIC,
    cr.avg_ltv::NUMERIC,
    COALESCE(rt.retention_week_1 * 100, 0)::NUMERIC AS retention_week_1,
    COALESCE(rt.retention_week_2 * 100, 0)::NUMERIC AS retention_week_2,
    COALESCE(rt.retention_week_4 * 100, 0)::NUMERIC AS retention_week_4,
    COALESCE(rt.retention_week_8 * 100, 0)::NUMERIC AS retention_week_8,
    COALESCE(rt.retention_week_12 * 100, 0)::NUMERIC AS retention_week_12
  FROM cohort_revenue cr
  LEFT JOIN cohort_retention rt ON cr.cohort = rt.cohort
  ORDER BY cr.cohort DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Get retention curve for a specific cohort
-- Returns retention percentage at each week for visualization
CREATE OR REPLACE FUNCTION get_cohort_retention_curve(
  p_cohort_date TEXT,
  p_cohort_period TEXT DEFAULT 'month'
)
RETURNS TABLE (
  week_number INT,
  retention_rate NUMERIC,
  active_users INT,
  total_users INT
) AS $$
DECLARE
  date_format TEXT;
BEGIN
  -- Set date format based on period
  IF p_cohort_period = 'week' THEN
    date_format := 'IYYY-IW';
  ELSE
    date_format := 'YYYY-MM';
  END IF;

  RETURN QUERY
  WITH cohort_users AS (
    SELECT
      u.id AS user_id,
      u.created_at::DATE AS signup_date
    FROM public.users u
    WHERE TO_CHAR(u.created_at, date_format) = p_cohort_date
  ),
  weekly_retention AS (
    SELECT
      week_num,
      COUNT(DISTINCT cu.user_id) AS total_users,
      COUNT(DISTINCT CASE
        WHEN o.created_at <= cu.signup_date + (week_num * INTERVAL '7 days')
        THEN cu.user_id
      END) AS active_users
    FROM cohort_users cu
    CROSS JOIN generate_series(0, 52) AS week_num -- Up to 52 weeks (1 year)
    LEFT JOIN public.orders o ON o.user_id = cu.user_id AND o.status = 'completed'
    GROUP BY week_num
  )
  SELECT
    week_num::INT AS week_number,
    (active_users::NUMERIC / NULLIF(total_users, 0) * 100)::NUMERIC AS retention_rate,
    active_users::INT,
    total_users::INT
  FROM weekly_retention
  ORDER BY week_num;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Get LTV comparison across cohorts
-- Useful for comparing performance of different cohorts
CREATE OR REPLACE FUNCTION get_cohort_ltv_comparison(
  p_cohort_period TEXT DEFAULT 'month',
  p_limit INT DEFAULT 6
)
RETURNS TABLE (
  cohort_date TEXT,
  cohort_size INT,
  total_revenue NUMERIC,
  avg_ltv NUMERIC,
  median_ltv NUMERIC,
  max_ltv NUMERIC
) AS $$
DECLARE
  date_format TEXT;
BEGIN
  -- Set date format based on period
  IF p_cohort_period = 'week' THEN
    date_format := 'IYYY-IW';
  ELSE
    date_format := 'YYYY-MM';
  END IF;

  RETURN QUERY
  WITH user_cohorts AS (
    SELECT
      u.id AS user_id,
      TO_CHAR(u.created_at, date_format) AS cohort
    FROM public.users u
  ),
  user_ltv AS (
    SELECT
      uc.cohort,
      uc.user_id,
      COALESCE(SUM(o.amount), 0) AS ltv
    FROM user_cohorts uc
    LEFT JOIN public.orders o ON o.user_id = uc.user_id AND o.status = 'completed'
    GROUP BY uc.cohort, uc.user_id
  )
  SELECT
    ul.cohort AS cohort_date,
    COUNT(DISTINCT ul.user_id)::INT AS cohort_size,
    SUM(ul.ltv)::NUMERIC AS total_revenue,
    AVG(ul.ltv)::NUMERIC AS avg_ltv,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ul.ltv)::NUMERIC AS median_ltv,
    MAX(ul.ltv)::NUMERIC AS max_ltv
  FROM user_ltv ul
  GROUP BY ul.cohort
  ORDER BY ul.cohort DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant execute permissions to authenticated users (admin will access via service key)
GRANT EXECUTE ON FUNCTION get_cohort_analytics(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cohort_retention_curve(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cohort_ltv_comparison(TEXT, INT) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION get_cohort_analytics IS 'Get cohort data with retention and LTV metrics grouped by week or month';
COMMENT ON FUNCTION get_cohort_retention_curve IS 'Get retention curve data for a specific cohort showing weekly retention rates';
COMMENT ON FUNCTION get_cohort_ltv_comparison IS 'Compare LTV metrics across different cohorts';
