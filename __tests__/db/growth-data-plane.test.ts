/**
 * Growth Data Plane Schema Tests
 * Feature: GDP-001
 * Test IDs: GDP-001-SCHEMA, GDP-001-FUNCTIONS
 *
 * Tests the Growth Data Plane database schema:
 * - person, identity_link, event tables
 * - email_message, email_event tables
 * - subscription, deal, person_features, segment tables
 * - Helper functions for data management
 */

import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
const GDP_MIGRATION_FILE = "20260208013000_growth_data_plane.sql";

describe("Growth Data Plane Schema (GDP-001)", () => {
  let migrationContent: string;

  beforeAll(() => {
    const migrationPath = path.join(MIGRATIONS_DIR, GDP_MIGRATION_FILE);
    expect(fs.existsSync(migrationPath)).toBe(true);
    migrationContent = fs.readFileSync(migrationPath, "utf-8");
  });

  describe("GDP-001-SCHEMA: Core Tables", () => {
    it("should create person table", () => {
      expect(migrationContent).toContain("CREATE TABLE IF NOT EXISTS person");
      expect(migrationContent).toContain("email TEXT UNIQUE");
      expect(migrationContent).toContain("email_hash TEXT");
      expect(migrationContent).toContain("user_id UUID");
      expect(migrationContent).toContain("stripe_customer_id TEXT");
      expect(migrationContent).toContain("posthog_distinct_id TEXT");
      expect(migrationContent).toContain("meta_external_id TEXT");
    });

    it("should create identity_link table", () => {
      expect(migrationContent).toContain(
        "CREATE TABLE IF NOT EXISTS identity_link"
      );
      expect(migrationContent).toContain("person_id UUID NOT NULL");
      expect(migrationContent).toContain("identity_type TEXT NOT NULL");
      expect(migrationContent).toContain("identity_value TEXT NOT NULL");
      expect(migrationContent).toContain(
        "UNIQUE(identity_type, identity_value)"
      );
    });

    it("should create event table", () => {
      expect(migrationContent).toContain("CREATE TABLE IF NOT EXISTS event");
      expect(migrationContent).toContain("event_name TEXT NOT NULL");
      expect(migrationContent).toContain("person_id UUID");
      expect(migrationContent).toContain("user_id UUID");
      expect(migrationContent).toContain("anonymous_id UUID");
      expect(migrationContent).toContain("session_id UUID");
      expect(migrationContent).toContain("source TEXT NOT NULL");
      expect(migrationContent).toContain("properties JSONB");
      expect(migrationContent).toContain("context JSONB");
    });

    it("should create email_message table", () => {
      expect(migrationContent).toContain(
        "CREATE TABLE IF NOT EXISTS email_message"
      );
      expect(migrationContent).toContain("person_id UUID");
      expect(migrationContent).toContain("email TEXT NOT NULL");
      expect(migrationContent).toContain("subject TEXT");
      expect(migrationContent).toContain("resend_id TEXT UNIQUE");
      expect(migrationContent).toContain("tags JSONB");
    });

    it("should create email_event table", () => {
      expect(migrationContent).toContain(
        "CREATE TABLE IF NOT EXISTS email_event"
      );
      expect(migrationContent).toContain("email_message_id UUID");
      expect(migrationContent).toContain("person_id UUID");
      expect(migrationContent).toContain("event_type TEXT NOT NULL");
      expect(migrationContent).toContain("link_url TEXT");
    });

    it("should create subscription table", () => {
      expect(migrationContent).toContain(
        "CREATE TABLE IF NOT EXISTS subscription"
      );
      expect(migrationContent).toContain("person_id UUID");
      expect(migrationContent).toContain("stripe_subscription_id TEXT UNIQUE");
      expect(migrationContent).toContain("stripe_customer_id TEXT NOT NULL");
      expect(migrationContent).toContain("status TEXT NOT NULL");
      expect(migrationContent).toContain("mrr DECIMAL");
    });

    it("should create deal table", () => {
      expect(migrationContent).toContain("CREATE TABLE IF NOT EXISTS deal");
      expect(migrationContent).toContain("person_id UUID");
      expect(migrationContent).toContain("deal_type TEXT NOT NULL");
      expect(migrationContent).toContain("stage TEXT NOT NULL");
      expect(migrationContent).toContain("amount DECIMAL");
      expect(migrationContent).toContain("stripe_payment_intent_id TEXT");
    });

    it("should create person_features table", () => {
      expect(migrationContent).toContain(
        "CREATE TABLE IF NOT EXISTS person_features"
      );
      expect(migrationContent).toContain("person_id UUID PRIMARY KEY");
      expect(migrationContent).toContain("courses_created INTEGER");
      expect(migrationContent).toContain("courses_published INTEGER");
      expect(migrationContent).toContain("total_revenue DECIMAL");
      expect(migrationContent).toContain("courses_enrolled INTEGER");
      expect(migrationContent).toContain("lessons_completed INTEGER");
      expect(migrationContent).toContain("email_opens_30d INTEGER");
      expect(migrationContent).toContain("email_clicks_30d INTEGER");
    });

    it("should create segment table", () => {
      expect(migrationContent).toContain("CREATE TABLE IF NOT EXISTS segment");
      expect(migrationContent).toContain("name TEXT UNIQUE NOT NULL");
      expect(migrationContent).toContain("segment_type TEXT NOT NULL");
      expect(migrationContent).toContain("conditions JSONB NOT NULL");
      expect(migrationContent).toContain("is_active BOOLEAN");
    });

    it("should create segment_membership table", () => {
      expect(migrationContent).toContain(
        "CREATE TABLE IF NOT EXISTS segment_membership"
      );
      expect(migrationContent).toContain("person_id UUID NOT NULL");
      expect(migrationContent).toContain("segment_id UUID NOT NULL");
      expect(migrationContent).toContain("entered_at TIMESTAMPTZ");
      expect(migrationContent).toContain("exited_at TIMESTAMPTZ");
      expect(migrationContent).toContain("is_active BOOLEAN");
    });
  });

  describe("GDP-001-INDEXES: Performance Indexes", () => {
    it("should create indexes on person table", () => {
      expect(migrationContent).toContain("idx_person_email");
      expect(migrationContent).toContain("idx_person_email_hash");
      expect(migrationContent).toContain("idx_person_user_id");
      expect(migrationContent).toContain("idx_person_stripe_customer_id");
      expect(migrationContent).toContain("idx_person_posthog_distinct_id");
    });

    it("should create indexes on event table", () => {
      expect(migrationContent).toContain("idx_event_event_name");
      expect(migrationContent).toContain("idx_event_person_id");
      expect(migrationContent).toContain("idx_event_user_id");
      expect(migrationContent).toContain("idx_event_timestamp");
      expect(migrationContent).toContain("idx_event_source");
    });

    it("should create indexes on email tables", () => {
      expect(migrationContent).toContain("idx_email_message_person_id");
      expect(migrationContent).toContain("idx_email_message_resend_id");
      expect(migrationContent).toContain("idx_email_event_message_id");
      expect(migrationContent).toContain("idx_email_event_type");
    });

    it("should create indexes on subscription table", () => {
      expect(migrationContent).toContain("idx_subscription_person_id");
      expect(migrationContent).toContain(
        "idx_subscription_stripe_subscription_id"
      );
      expect(migrationContent).toContain("idx_subscription_status");
    });
  });

  describe("GDP-001-FUNCTIONS: Helper Functions", () => {
    it("should create upsert_person_from_email function", () => {
      expect(migrationContent).toContain(
        "CREATE OR REPLACE FUNCTION upsert_person_from_email"
      );
      expect(migrationContent).toContain("p_email TEXT");
      expect(migrationContent).toContain("p_first_name TEXT");
      expect(migrationContent).toContain("p_last_name TEXT");
      expect(migrationContent).toContain("p_user_id UUID");
      expect(migrationContent).toContain("RETURNS UUID");
      // Should generate SHA256 hash for Meta CAPI
      expect(migrationContent).toContain("sha256");
    });

    it("should create link_identity function", () => {
      expect(migrationContent).toContain(
        "CREATE OR REPLACE FUNCTION link_identity"
      );
      expect(migrationContent).toContain("p_person_id UUID");
      expect(migrationContent).toContain("p_identity_type TEXT");
      expect(migrationContent).toContain("p_identity_value TEXT");
      expect(migrationContent).toContain("RETURNS UUID");
    });

    it("should create track_event function", () => {
      expect(migrationContent).toContain(
        "CREATE OR REPLACE FUNCTION track_event"
      );
      expect(migrationContent).toContain("p_event_name TEXT");
      expect(migrationContent).toContain("p_person_id UUID");
      expect(migrationContent).toContain("p_user_id UUID");
      expect(migrationContent).toContain("p_anonymous_id UUID");
      expect(migrationContent).toContain("p_session_id UUID");
      expect(migrationContent).toContain("p_source TEXT");
      expect(migrationContent).toContain("p_properties JSONB");
      expect(migrationContent).toContain("p_context JSONB");
      expect(migrationContent).toContain("RETURNS UUID");
    });

    it("should create compute_person_features function", () => {
      expect(migrationContent).toContain(
        "CREATE OR REPLACE FUNCTION compute_person_features"
      );
      expect(migrationContent).toContain("p_person_id UUID");
      expect(migrationContent).toContain("RETURNS VOID");
      // Should compute creator features
      expect(migrationContent).toContain("courses_created");
      expect(migrationContent).toContain("courses_published");
      // Should compute student features
      expect(migrationContent).toContain("courses_enrolled");
      expect(migrationContent).toContain("lessons_completed");
      // Should compute engagement features
      expect(migrationContent).toContain("email_opens_30d");
      expect(migrationContent).toContain("email_clicks_30d");
    });
  });

  describe("GDP-001-RLS: Row Level Security", () => {
    it("should enable RLS on all tables", () => {
      const tables = [
        "person",
        "identity_link",
        "event",
        "email_message",
        "email_event",
        "subscription",
        "deal",
        "person_features",
        "segment",
        "segment_membership",
      ];

      tables.forEach((table) => {
        const rlsPattern = new RegExp(
          `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
          "i"
        );
        expect(migrationContent).toMatch(rlsPattern);
      });
    });

    it("should create service role policies", () => {
      expect(migrationContent).toContain(
        'CREATE POLICY "Service role can manage'
      );
    });

    it("should create user policies for own data", () => {
      expect(migrationContent).toContain(
        'CREATE POLICY "Users can view own'
      );
    });
  });

  describe("GDP-001-COMMENTS: Documentation", () => {
    it("should have table comments", () => {
      expect(migrationContent).toContain("COMMENT ON TABLE person IS");
      expect(migrationContent).toContain("COMMENT ON TABLE identity_link IS");
      expect(migrationContent).toContain("COMMENT ON TABLE event IS");
      expect(migrationContent).toContain("COMMENT ON TABLE email_message IS");
      expect(migrationContent).toContain("COMMENT ON TABLE email_event IS");
    });

    it("should have function comments", () => {
      expect(migrationContent).toContain(
        "COMMENT ON FUNCTION upsert_person_from_email IS"
      );
      expect(migrationContent).toContain("COMMENT ON FUNCTION link_identity IS");
      expect(migrationContent).toContain("COMMENT ON FUNCTION track_event IS");
      expect(migrationContent).toContain(
        "COMMENT ON FUNCTION compute_person_features IS"
      );
    });

    it("should have section headers", () => {
      expect(migrationContent).toContain("Growth Data Plane");
      expect(migrationContent).toContain("TABLE: person");
      expect(migrationContent).toContain("TABLE: event");
      expect(migrationContent).toContain("FUNCTION:");
      expect(migrationContent).toContain("RLS POLICIES");
    });
  });

  describe("GDP-001-REFERENCES: Foreign Keys", () => {
    it("should have proper foreign key relationships", () => {
      // identity_link -> person
      expect(migrationContent).toMatch(
        /identity_link.*person_id.*REFERENCES person/is
      );

      // event -> person
      expect(migrationContent).toMatch(/event.*person_id.*REFERENCES person/is);

      // email_message -> person
      expect(migrationContent).toMatch(
        /email_message.*person_id.*REFERENCES person/is
      );

      // email_event -> email_message
      expect(migrationContent).toMatch(
        /email_event.*email_message_id.*REFERENCES email_message/is
      );

      // subscription -> person
      expect(migrationContent).toMatch(
        /subscription.*person_id.*REFERENCES person/is
      );

      // person_features -> person
      expect(migrationContent).toMatch(
        /person_features.*person_id.*REFERENCES person/is
      );

      // segment_membership -> person and segment
      expect(migrationContent).toMatch(
        /segment_membership.*person_id.*REFERENCES person/is
      );
      expect(migrationContent).toMatch(
        /segment_membership.*segment_id.*REFERENCES segment/is
      );
    });

    it("should have CASCADE deletes where appropriate", () => {
      // identity_link should cascade when person deleted
      expect(migrationContent).toMatch(
        /identity_link.*person_id.*ON DELETE CASCADE/is
      );

      // email_event should cascade when email_message deleted
      expect(migrationContent).toMatch(
        /email_event.*email_message_id.*ON DELETE CASCADE/is
      );

      // person_features should cascade when person deleted
      expect(migrationContent).toMatch(
        /person_features.*person_id.*ON DELETE CASCADE/is
      );
    });
  });

  describe("GDP-001-INTEGRATION: System Integration Points", () => {
    it("should support Meta CAPI integration via email_hash", () => {
      expect(migrationContent).toContain("email_hash TEXT");
      expect(migrationContent).toContain("sha256");
    });

    it("should support PostHog integration", () => {
      expect(migrationContent).toContain("posthog_distinct_id TEXT");
    });

    it("should support Stripe integration", () => {
      expect(migrationContent).toContain("stripe_customer_id TEXT");
      expect(migrationContent).toContain("stripe_subscription_id TEXT");
      expect(migrationContent).toContain("stripe_payment_intent_id TEXT");
    });

    it("should support Resend email integration", () => {
      expect(migrationContent).toContain("resend_id TEXT");
    });

    it("should support anonymous tracking", () => {
      expect(migrationContent).toContain("anonymous_id UUID");
    });

    it("should support session tracking", () => {
      expect(migrationContent).toContain("session_id UUID");
    });
  });

  describe("GDP-001-DATA-TYPES: Proper Data Types", () => {
    it("should use JSONB for flexible data", () => {
      const jsonbCount = (migrationContent.match(/JSONB/g) || []).length;
      expect(jsonbCount).toBeGreaterThan(5); // properties, context, metadata, tags, conditions
    });

    it("should use TIMESTAMPTZ for timestamps", () => {
      const timestampCount = (migrationContent.match(/TIMESTAMPTZ/g) || [])
        .length;
      expect(timestampCount).toBeGreaterThan(15);
    });

    it("should use DECIMAL for money amounts", () => {
      expect(migrationContent).toContain("mrr DECIMAL");
      expect(migrationContent).toContain("amount DECIMAL");
      expect(migrationContent).toContain("total_revenue DECIMAL");
    });

    it("should use UUID for primary keys", () => {
      const uuidPKCount = (
        migrationContent.match(/UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/g) ||
        []
      ).length;
      expect(uuidPKCount).toBeGreaterThan(5);
    });
  });

  describe("GDP-001-CONSTRAINTS: Data Integrity", () => {
    it("should have unique constraints", () => {
      expect(migrationContent).toContain("email TEXT UNIQUE");
      expect(migrationContent).toContain("resend_id TEXT UNIQUE");
      expect(migrationContent).toContain("stripe_subscription_id TEXT UNIQUE");
      expect(migrationContent).toContain(
        "UNIQUE(identity_type, identity_value)"
      );
    });

    it("should have NOT NULL constraints on critical fields", () => {
      expect(migrationContent).toContain("event_name TEXT NOT NULL");
      expect(migrationContent).toContain("source TEXT NOT NULL");
      expect(migrationContent).toContain("identity_type TEXT NOT NULL");
      expect(migrationContent).toContain("identity_value TEXT NOT NULL");
      expect(migrationContent).toContain("event_type TEXT NOT NULL");
    });

    it("should have check constraints where needed", () => {
      expect(migrationContent).toContain("CHECK (probability >= 0");
      expect(migrationContent).toContain("AND probability <= 100");
    });
  });

  describe("GDP-001-SECURITY: Security Definer Functions", () => {
    it("should use SECURITY DEFINER for system functions", () => {
      const securityDefinerCount = (
        migrationContent.match(/SECURITY DEFINER/g) || []
      ).length;
      expect(securityDefinerCount).toBeGreaterThanOrEqual(4);
    });
  });
});
