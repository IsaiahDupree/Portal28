-- Growth Data Plane Schema
-- Unified event tracking and customer data platform for Portal28

-- =====================================================
-- TABLE: person
-- =====================================================
-- Canonical person table - single source of truth for all users/contacts
CREATE TABLE IF NOT EXISTS person (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  email_hash TEXT, -- SHA256 hash for Meta CAPI
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to auth user if exists
  stripe_customer_id TEXT,
  posthog_distinct_id TEXT,
  meta_external_id TEXT
);

-- Indexes for performance
CREATE INDEX idx_person_email ON person(email);
CREATE INDEX idx_person_email_hash ON person(email_hash);
CREATE INDEX idx_person_user_id ON person(user_id);
CREATE INDEX idx_person_stripe_customer_id ON person(stripe_customer_id);
CREATE INDEX idx_person_posthog_distinct_id ON person(posthog_distinct_id);
CREATE INDEX idx_person_created_at ON person(created_at DESC);

-- =====================================================
-- TABLE: identity_link
-- =====================================================
-- Links external identities to canonical person record
CREATE TABLE IF NOT EXISTS identity_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  identity_type TEXT NOT NULL, -- 'posthog', 'stripe', 'meta', 'email', 'anonymous_id', 'session_id'
  identity_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(identity_type, identity_value)
);

CREATE INDEX idx_identity_link_person_id ON identity_link(person_id);
CREATE INDEX idx_identity_link_type_value ON identity_link(identity_type, identity_value);

-- =====================================================
-- TABLE: event
-- =====================================================
-- Unified event stream from all sources
CREATE TABLE IF NOT EXISTS event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL, -- 'landing_view', 'course_preview', 'signup_completed', etc.
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id UUID, -- For pre-identification tracking
  session_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL, -- 'web', 'app', 'email', 'stripe', 'booking', 'meta'
  properties JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb, -- page, referrer, utm params, device info
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_event_event_name ON event(event_name);
CREATE INDEX idx_event_person_id ON event(person_id);
CREATE INDEX idx_event_user_id ON event(user_id);
CREATE INDEX idx_event_anonymous_id ON event(anonymous_id);
CREATE INDEX idx_event_session_id ON event(session_id);
CREATE INDEX idx_event_timestamp ON event(timestamp DESC);
CREATE INDEX idx_event_source ON event(source);
CREATE INDEX idx_event_properties ON event USING gin(properties);

-- =====================================================
-- TABLE: email_message
-- =====================================================
-- Sent emails (from Resend or other providers)
CREATE TABLE IF NOT EXISTS email_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  subject TEXT,
  from_email TEXT,
  resend_id TEXT UNIQUE, -- Resend message ID
  sent_at TIMESTAMPTZ DEFAULT now(),
  tags JSONB DEFAULT '[]'::jsonb, -- ['onboarding', 'newsletter', etc.]
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_message_person_id ON email_message(person_id);
CREATE INDEX idx_email_message_email ON email_message(email);
CREATE INDEX idx_email_message_resend_id ON email_message(resend_id);
CREATE INDEX idx_email_message_sent_at ON email_message(sent_at DESC);
CREATE INDEX idx_email_message_tags ON email_message USING gin(tags);

-- =====================================================
-- TABLE: email_event
-- =====================================================
-- Email engagement events (delivered, opened, clicked, bounced)
CREATE TABLE IF NOT EXISTS email_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID REFERENCES email_message(id) ON DELETE CASCADE,
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'delivered', 'opened', 'clicked', 'bounced', 'complained'
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  link_url TEXT, -- For clicked events
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_event_message_id ON email_event(email_message_id);
CREATE INDEX idx_email_event_person_id ON email_event(person_id);
CREATE INDEX idx_email_event_type ON email_event(event_type);
CREATE INDEX idx_email_event_timestamp ON email_event(timestamp DESC);

-- =====================================================
-- TABLE: subscription
-- =====================================================
-- Subscription snapshots from Stripe
CREATE TABLE IF NOT EXISTS subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing', etc.
  plan_id TEXT,
  plan_name TEXT,
  mrr DECIMAL(10, 2), -- Monthly recurring revenue
  currency TEXT DEFAULT 'usd',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscription_person_id ON subscription(person_id);
CREATE INDEX idx_subscription_stripe_subscription_id ON subscription(stripe_subscription_id);
CREATE INDEX idx_subscription_stripe_customer_id ON subscription(stripe_customer_id);
CREATE INDEX idx_subscription_status ON subscription(status);
CREATE INDEX idx_subscription_updated_at ON subscription(updated_at DESC);

-- =====================================================
-- TABLE: deal
-- =====================================================
-- Opportunities and deals (course purchases, coaching, etc.)
CREATE TABLE IF NOT EXISTS deal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES person(id) ON DELETE SET NULL,
  deal_type TEXT NOT NULL, -- 'course_purchase', 'subscription', 'coaching', 'consulting'
  deal_name TEXT,
  stage TEXT NOT NULL, -- 'lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'usd',
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  closed_date DATE,
  stripe_payment_intent_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_person_id ON deal(person_id);
CREATE INDEX idx_deal_type ON deal(deal_type);
CREATE INDEX idx_deal_stage ON deal(stage);
CREATE INDEX idx_deal_closed_date ON deal(closed_date DESC);
CREATE INDEX idx_deal_expected_close_date ON deal(expected_close_date);

-- =====================================================
-- TABLE: person_features
-- =====================================================
-- Computed features for segmentation and personalization
CREATE TABLE IF NOT EXISTS person_features (
  person_id UUID PRIMARY KEY REFERENCES person(id) ON DELETE CASCADE,
  -- Creator funnel features
  courses_created INTEGER DEFAULT 0,
  courses_published INTEGER DEFAULT 0,
  total_course_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  first_course_created_at TIMESTAMPTZ,
  first_course_published_at TIMESTAMPTZ,
  first_sale_at TIMESTAMPTZ,
  last_sale_at TIMESTAMPTZ,

  -- Student funnel features
  courses_enrolled INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  certificates_earned INTEGER DEFAULT 0,
  first_enrollment_at TIMESTAMPTZ,
  last_lesson_completed_at TIMESTAMPTZ,

  -- Engagement features
  email_opens_30d INTEGER DEFAULT 0,
  email_clicks_30d INTEGER DEFAULT 0,
  last_email_opened_at TIMESTAMPTZ,
  last_email_clicked_at TIMESTAMPTZ,
  login_count_30d INTEGER DEFAULT 0,
  last_login_at TIMESTAMPTZ,

  -- Attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  first_landing_page TEXT,
  first_referrer TEXT,

  -- Computed at
  computed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_person_features_courses_created ON person_features(courses_created);
CREATE INDEX idx_person_features_courses_enrolled ON person_features(courses_enrolled);
CREATE INDEX idx_person_features_total_revenue ON person_features(total_revenue DESC);
CREATE INDEX idx_person_features_computed_at ON person_features(computed_at DESC);

-- =====================================================
-- TABLE: segment
-- =====================================================
-- Segment definitions and membership
CREATE TABLE IF NOT EXISTS segment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  segment_type TEXT NOT NULL, -- 'creator', 'student', 'engagement', 'revenue'
  conditions JSONB NOT NULL, -- SQL condition or rules JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE: segment_membership
-- =====================================================
-- Join table for person <-> segment relationships
CREATE TABLE IF NOT EXISTS segment_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES segment(id) ON DELETE CASCADE,
  entered_at TIMESTAMPTZ DEFAULT now(),
  exited_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(person_id, segment_id, entered_at)
);

CREATE INDEX idx_segment_membership_person_id ON segment_membership(person_id);
CREATE INDEX idx_segment_membership_segment_id ON segment_membership(segment_id);
CREATE INDEX idx_segment_membership_is_active ON segment_membership(is_active);

-- =====================================================
-- FUNCTION: upsert_person_from_email
-- =====================================================
-- Creates or updates person record from email, returns person_id
CREATE OR REPLACE FUNCTION upsert_person_from_email(
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_person_id UUID;
  v_email_hash TEXT;
BEGIN
  -- Generate SHA256 hash for Meta CAPI
  v_email_hash := encode(digest(lower(trim(p_email)), 'sha256'), 'hex');

  -- Upsert person
  INSERT INTO person (email, email_hash, first_name, last_name, user_id, last_seen_at)
  VALUES (lower(trim(p_email)), v_email_hash, p_first_name, p_last_name, p_user_id, now())
  ON CONFLICT (email)
  DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, person.first_name),
    last_name = COALESCE(EXCLUDED.last_name, person.last_name),
    user_id = COALESCE(EXCLUDED.user_id, person.user_id),
    last_seen_at = now(),
    updated_at = now()
  RETURNING id INTO v_person_id;

  RETURN v_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: link_identity
-- =====================================================
-- Links an external identity to a person
CREATE OR REPLACE FUNCTION link_identity(
  p_person_id UUID,
  p_identity_type TEXT,
  p_identity_value TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_link_id UUID;
BEGIN
  INSERT INTO identity_link (person_id, identity_type, identity_value, metadata)
  VALUES (p_person_id, p_identity_type, p_identity_value, p_metadata)
  ON CONFLICT (identity_type, identity_value)
  DO UPDATE SET
    person_id = EXCLUDED.person_id,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_link_id;

  RETURN v_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: track_event
-- =====================================================
-- Records an event in the unified event stream
CREATE OR REPLACE FUNCTION track_event(
  p_event_name TEXT,
  p_person_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_anonymous_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'web',
  p_properties JSONB DEFAULT '{}'::jsonb,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO event (
    event_name,
    person_id,
    user_id,
    anonymous_id,
    session_id,
    source,
    properties,
    context,
    timestamp
  ) VALUES (
    p_event_name,
    p_person_id,
    p_user_id,
    p_anonymous_id,
    p_session_id,
    p_source,
    p_properties,
    p_context,
    now()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: compute_person_features
-- =====================================================
-- Computes all features for a person
CREATE OR REPLACE FUNCTION compute_person_features(p_person_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO person_features (
    person_id,

    -- Creator features
    courses_created,
    courses_published,
    total_course_sales,
    total_revenue,
    first_course_created_at,
    first_course_published_at,
    first_sale_at,
    last_sale_at,

    -- Student features
    courses_enrolled,
    lessons_completed,
    certificates_earned,
    first_enrollment_at,
    last_lesson_completed_at,

    -- Engagement features
    email_opens_30d,
    email_clicks_30d,
    last_email_opened_at,
    last_email_clicked_at,
    login_count_30d,
    last_login_at,

    computed_at,
    updated_at
  )
  SELECT
    p_person_id,

    -- Creator features
    COALESCE((SELECT COUNT(*) FROM courses WHERE instructor_id = p.user_id), 0),
    COALESCE((SELECT COUNT(*) FROM courses WHERE instructor_id = p.user_id AND published = true), 0),
    COALESCE((SELECT COUNT(*) FROM entitlements e JOIN courses c ON e.course_id = c.id WHERE c.instructor_id = p.user_id), 0),
    COALESCE((SELECT SUM(amount / 100.0) FROM payments WHERE instructor_id = p.user_id), 0),
    (SELECT MIN(created_at) FROM courses WHERE instructor_id = p.user_id),
    (SELECT MIN(published_at) FROM courses WHERE instructor_id = p.user_id AND published = true),
    (SELECT MIN(created_at) FROM payments WHERE instructor_id = p.user_id),
    (SELECT MAX(created_at) FROM payments WHERE instructor_id = p.user_id),

    -- Student features
    COALESCE((SELECT COUNT(*) FROM entitlements WHERE user_id = p.user_id), 0),
    COALESCE((SELECT COUNT(*) FROM lesson_progress WHERE user_id = p.user_id AND completed = true), 0),
    COALESCE((SELECT COUNT(*) FROM certificates WHERE user_id = p.user_id), 0),
    (SELECT MIN(created_at) FROM entitlements WHERE user_id = p.user_id),
    (SELECT MAX(completed_at) FROM lesson_progress WHERE user_id = p.user_id AND completed = true),

    -- Engagement features (last 30 days)
    COALESCE((SELECT COUNT(*) FROM email_event ee
      JOIN email_message em ON ee.email_message_id = em.id
      WHERE em.person_id = p_person_id
        AND ee.event_type = 'opened'
        AND ee.timestamp > now() - INTERVAL '30 days'), 0),
    COALESCE((SELECT COUNT(*) FROM email_event ee
      JOIN email_message em ON ee.email_message_id = em.id
      WHERE em.person_id = p_person_id
        AND ee.event_type = 'clicked'
        AND ee.timestamp > now() - INTERVAL '30 days'), 0),
    (SELECT MAX(ee.timestamp) FROM email_event ee
      JOIN email_message em ON ee.email_message_id = em.id
      WHERE em.person_id = p_person_id AND ee.event_type = 'opened'),
    (SELECT MAX(ee.timestamp) FROM email_event ee
      JOIN email_message em ON ee.email_message_id = em.id
      WHERE em.person_id = p_person_id AND ee.event_type = 'clicked'),
    COALESCE((SELECT COUNT(*) FROM event WHERE person_id = p_person_id
      AND event_name = 'login' AND timestamp > now() - INTERVAL '30 days'), 0),
    (SELECT MAX(timestamp) FROM event WHERE person_id = p_person_id AND event_name = 'login'),

    now(),
    now()
  FROM person p
  WHERE p.id = p_person_id
  ON CONFLICT (person_id)
  DO UPDATE SET
    courses_created = EXCLUDED.courses_created,
    courses_published = EXCLUDED.courses_published,
    total_course_sales = EXCLUDED.total_course_sales,
    total_revenue = EXCLUDED.total_revenue,
    first_course_created_at = EXCLUDED.first_course_created_at,
    first_course_published_at = EXCLUDED.first_course_published_at,
    first_sale_at = EXCLUDED.first_sale_at,
    last_sale_at = EXCLUDED.last_sale_at,
    courses_enrolled = EXCLUDED.courses_enrolled,
    lessons_completed = EXCLUDED.lessons_completed,
    certificates_earned = EXCLUDED.certificates_earned,
    first_enrollment_at = EXCLUDED.first_enrollment_at,
    last_lesson_completed_at = EXCLUDED.last_lesson_completed_at,
    email_opens_30d = EXCLUDED.email_opens_30d,
    email_clicks_30d = EXCLUDED.email_clicks_30d,
    last_email_opened_at = EXCLUDED.last_email_opened_at,
    last_email_clicked_at = EXCLUDED.last_email_clicked_at,
    login_count_30d = EXCLUDED.login_count_30d,
    last_login_at = EXCLUDED.last_login_at,
    computed_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES
-- =====================================================
-- Note: Most tables use SECURITY DEFINER functions for access
-- RLS provides additional safety layer

ALTER TABLE person ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_membership ENABLE ROW LEVEL SECURITY;

-- Admin/service role can manage all data
DROP POLICY IF EXISTS "Service role can manage person" ON person;
CREATE POLICY "Service role can manage person"
  ON person FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage identity_link" ON identity_link;
CREATE POLICY "Service role can manage identity_link"
  ON identity_link FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage event" ON event;
CREATE POLICY "Service role can manage event"
  ON event FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage email_message" ON email_message;
CREATE POLICY "Service role can manage email_message"
  ON email_message FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage email_event" ON email_event;
CREATE POLICY "Service role can manage email_event"
  ON email_event FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage subscription" ON subscription;
CREATE POLICY "Service role can manage subscription"
  ON subscription FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage deal" ON deal;
CREATE POLICY "Service role can manage deal"
  ON deal FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage person_features" ON person_features;
CREATE POLICY "Service role can manage person_features"
  ON person_features FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage segment" ON segment;
CREATE POLICY "Service role can manage segment"
  ON segment FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage segment_membership" ON segment_membership;
CREATE POLICY "Service role can manage segment_membership"
  ON segment_membership FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can view their own person record
DROP POLICY IF EXISTS "Users can view own person" ON person;
CREATE POLICY "Users can view own person"
  ON person FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own features
DROP POLICY IF EXISTS "Users can view own features" ON person_features;
CREATE POLICY "Users can view own features"
  ON person_features FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM person
    WHERE person.id = person_features.person_id
      AND person.user_id = auth.uid()
  ));

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE person IS 'Canonical person table - single source of truth for all users/contacts';
COMMENT ON TABLE identity_link IS 'Links external identities (PostHog, Stripe, Meta) to person records';
COMMENT ON TABLE event IS 'Unified event stream from all sources (web, app, email, stripe, etc.)';
COMMENT ON TABLE email_message IS 'Sent emails from Resend or other providers';
COMMENT ON TABLE email_event IS 'Email engagement events (delivered, opened, clicked, bounced)';
COMMENT ON TABLE subscription IS 'Subscription snapshots from Stripe';
COMMENT ON TABLE deal IS 'Opportunities and deals (course purchases, coaching, etc.)';
COMMENT ON TABLE person_features IS 'Computed features for segmentation and personalization';
COMMENT ON TABLE segment IS 'Segment definitions';
COMMENT ON TABLE segment_membership IS 'Person membership in segments';

COMMENT ON FUNCTION upsert_person_from_email IS 'Creates or updates person record from email';
COMMENT ON FUNCTION link_identity IS 'Links an external identity to a person';
COMMENT ON FUNCTION track_event IS 'Records an event in the unified event stream';
COMMENT ON FUNCTION compute_person_features IS 'Computes all features for a person';
