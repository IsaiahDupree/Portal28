/**
 * Segment Engine
 * GDP-012: Evaluate segment membership and trigger automations
 *
 * This engine evaluates whether a person matches segment criteria
 * and triggers appropriate automations (emails, Meta audiences, webhooks).
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a service client for segment evaluation
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface SegmentConditions {
  type: "sql" | "rules";
  // SQL-based condition
  sql?: string;
  // Rules-based conditions (AND logic)
  rules?: Array<{
    field: string; // e.g., "courses_created", "email_clicks_30d"
    operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "not_contains" | "is_null" | "is_not_null";
    value?: any;
  }>;
}

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  segment_type: string;
  conditions: SegmentConditions;
  is_active: boolean;
}

/**
 * Evaluate if a person matches segment conditions
 */
export async function evaluateSegmentMembership(
  personId: string,
  segmentConditions: SegmentConditions
): Promise<boolean> {
  try {
    if (segmentConditions.type === "sql" && segmentConditions.sql) {
      return await evaluateSQLCondition(personId, segmentConditions.sql);
    } else if (segmentConditions.type === "rules" && segmentConditions.rules) {
      return await evaluateRulesCondition(personId, segmentConditions.rules);
    }

    return false;
  } catch (error) {
    console.error("Error evaluating segment membership:", error);
    return false;
  }
}

/**
 * Evaluate SQL-based segment condition
 */
async function evaluateSQLCondition(
  personId: string,
  sqlCondition: string
): Promise<boolean> {
  try {
    // Execute parameterized SQL query
    // The SQL should be a WHERE clause that returns boolean
    const { data, error } = await supabase.rpc("evaluate_segment_sql", {
      p_person_id: personId,
      p_sql_condition: sqlCondition,
    });

    if (error) {
      console.error("SQL condition evaluation error:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("SQL evaluation failed:", error);
    return false;
  }
}

/**
 * Evaluate rules-based segment condition
 */
async function evaluateRulesCondition(
  personId: string,
  rules: Array<{
    field: string;
    operator: string;
    value?: any;
  }>
): Promise<boolean> {
  try {
    // Fetch person features
    const { data: features, error } = await supabase
      .from("person_features")
      .select("*")
      .eq("person_id", personId)
      .single();

    if (error || !features) {
      return false;
    }

    // Evaluate all rules (AND logic)
    for (const rule of rules) {
      const fieldValue = features[rule.field];
      const matches = evaluateRule(fieldValue, rule.operator, rule.value);

      if (!matches) {
        return false; // Any rule failure = no match
      }
    }

    return true; // All rules passed
  } catch (error) {
    console.error("Rules evaluation failed:", error);
    return false;
  }
}

/**
 * Evaluate a single rule
 */
function evaluateRule(
  fieldValue: any,
  operator: string,
  ruleValue: any
): boolean {
  switch (operator) {
    case "equals":
      return fieldValue === ruleValue;
    case "not_equals":
      return fieldValue !== ruleValue;
    case "greater_than":
      return fieldValue > ruleValue;
    case "less_than":
      return fieldValue < ruleValue;
    case "contains":
      return String(fieldValue).includes(String(ruleValue));
    case "not_contains":
      return !String(fieldValue).includes(String(ruleValue));
    case "is_null":
      return fieldValue === null || fieldValue === undefined;
    case "is_not_null":
      return fieldValue !== null && fieldValue !== undefined;
    default:
      return false;
  }
}

/**
 * Evaluate all active segments for a person
 * Updates segment_membership table
 */
export async function evaluateAllSegmentsForPerson(
  personId: string
): Promise<{
  evaluated: number;
  entered: number;
  exited: number;
}> {
  try {
    // Get all active segments
    const { data: segments, error: segmentsError } = await supabase
      .from("segment")
      .select("*")
      .eq("is_active", true);

    if (segmentsError || !segments) {
      throw new Error("Failed to fetch segments");
    }

    let evaluated = 0;
    let entered = 0;
    let exited = 0;

    for (const segment of segments) {
      evaluated++;

      const matches = await evaluateSegmentMembership(
        personId,
        segment.conditions as SegmentConditions
      );

      // Check current membership
      const { data: membership } = await supabase
        .from("segment_membership")
        .select("*")
        .eq("person_id", personId)
        .eq("segment_id", segment.id)
        .eq("is_active", true)
        .maybeSingle();

      if (matches && !membership) {
        // Person entered segment
        await enterSegment(personId, segment.id);
        entered++;
      } else if (!matches && membership) {
        // Person exited segment
        await exitSegment(personId, segment.id);
        exited++;
      }
    }

    return { evaluated, entered, exited };
  } catch (error) {
    console.error("Error evaluating segments:", error);
    throw error;
  }
}

/**
 * Add person to segment
 */
async function enterSegment(personId: string, segmentId: string): Promise<void> {
  try {
    await supabase.from("segment_membership").insert({
      person_id: personId,
      segment_id: segmentId,
      entered_at: new Date().toISOString(),
      is_active: true,
    });

    // Trigger automations
    await triggerSegmentAutomations(personId, segmentId, "entered");
  } catch (error) {
    console.error("Error entering segment:", error);
  }
}

/**
 * Remove person from segment
 */
async function exitSegment(personId: string, segmentId: string): Promise<void> {
  try {
    await supabase
      .from("segment_membership")
      .update({
        exited_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("person_id", personId)
      .eq("segment_id", segmentId)
      .eq("is_active", true);

    // Trigger automations
    await triggerSegmentAutomations(personId, segmentId, "exited");
  } catch (error) {
    console.error("Error exiting segment:", error);
  }
}

/**
 * Trigger automations when person enters/exits segment
 */
async function triggerSegmentAutomations(
  personId: string,
  segmentId: string,
  event: "entered" | "exited"
): Promise<void> {
  try {
    // Fetch segment details
    const { data: segment } = await supabase
      .from("segment")
      .select("name")
      .eq("id", segmentId)
      .single();

    // Fetch person details
    const { data: person } = await supabase
      .from("person")
      .select("email, first_name")
      .eq("id", personId)
      .single();

    if (!segment || !person) {
      return;
    }

    console.log(`[Segment Engine] Person ${person.email} ${event} segment: ${segment.name}`);

    // Here you can trigger various automations:
    // 1. Send email via Resend
    // 2. Add to Meta Custom Audience
    // 3. Call webhook
    // 4. Create task in CRM

    // Example: Log to event table
    await supabase.rpc("track_event", {
      p_event_name: `segment_${event}`,
      p_person_id: personId,
      p_source: "segment_engine",
      p_properties: {
        segment_id: segmentId,
        segment_name: segment.name,
      },
    });
  } catch (error) {
    console.error("Error triggering automations:", error);
  }
}

/**
 * Get all persons in a segment
 */
export async function getSegmentMembers(
  segmentId: string
): Promise<Array<{ person_id: string; entered_at: string }>> {
  try {
    const { data, error } = await supabase
      .from("segment_membership")
      .select("person_id, entered_at")
      .eq("segment_id", segmentId)
      .eq("is_active", true)
      .order("entered_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error getting segment members:", error);
    return [];
  }
}

/**
 * Get segment membership count
 */
export async function getSegmentMemberCount(
  segmentId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("segment_membership")
      .select("*", { count: "exact", head: true })
      .eq("segment_id", segmentId)
      .eq("is_active", true);

    if (error) {
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error("Error getting segment member count:", error);
    return 0;
  }
}
