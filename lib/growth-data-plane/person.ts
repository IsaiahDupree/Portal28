/**
 * Growth Data Plane - Person Management
 * GDP-007: Map stripe_customer_id to person_id
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

export interface PersonData {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  user_id?: string;
  stripe_customer_id?: string;
  posthog_distinct_id?: string;
  meta_external_id?: string;
}

/**
 * Hash email with SHA256 for Meta CAPI
 */
function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * Get or create a person record by email
 * Returns the person_id
 */
export async function getOrCreatePerson(data: PersonData): Promise<string | null> {
  // Try to find by email first
  if (data.email) {
    const { data: existingPerson } = await supabaseAdmin
      .from("person")
      .select("id")
      .eq("email", data.email)
      .single();

    if (existingPerson) {
      // Update existing person with new data
      await supabaseAdmin
        .from("person")
        .update({
          first_name: data.first_name || undefined,
          last_name: data.last_name || undefined,
          phone: data.phone || undefined,
          user_id: data.user_id || undefined,
          stripe_customer_id: data.stripe_customer_id || undefined,
          posthog_distinct_id: data.posthog_distinct_id || undefined,
          meta_external_id: data.meta_external_id || undefined,
          email_hash: hashEmail(data.email),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPerson.id);

      return existingPerson.id;
    }
  }

  // Try to find by user_id
  if (data.user_id) {
    const { data: existingPerson } = await supabaseAdmin
      .from("person")
      .select("id")
      .eq("user_id", data.user_id)
      .single();

    if (existingPerson) {
      // Update existing person with new data
      await supabaseAdmin
        .from("person")
        .update({
          email: data.email || undefined,
          first_name: data.first_name || undefined,
          last_name: data.last_name || undefined,
          phone: data.phone || undefined,
          stripe_customer_id: data.stripe_customer_id || undefined,
          posthog_distinct_id: data.posthog_distinct_id || undefined,
          meta_external_id: data.meta_external_id || undefined,
          email_hash: data.email ? hashEmail(data.email) : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPerson.id);

      return existingPerson.id;
    }
  }

  // Try to find by stripe_customer_id
  if (data.stripe_customer_id) {
    const { data: existingPerson } = await supabaseAdmin
      .from("person")
      .select("id")
      .eq("stripe_customer_id", data.stripe_customer_id)
      .single();

    if (existingPerson) {
      // Update existing person with new data
      await supabaseAdmin
        .from("person")
        .update({
          email: data.email || undefined,
          first_name: data.first_name || undefined,
          last_name: data.last_name || undefined,
          phone: data.phone || undefined,
          user_id: data.user_id || undefined,
          posthog_distinct_id: data.posthog_distinct_id || undefined,
          meta_external_id: data.meta_external_id || undefined,
          email_hash: data.email ? hashEmail(data.email) : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPerson.id);

      return existingPerson.id;
    }
  }

  // Create new person
  const { data: newPerson, error } = await supabaseAdmin
    .from("person")
    .insert({
      email: data.email,
      email_hash: data.email ? hashEmail(data.email) : undefined,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      user_id: data.user_id,
      stripe_customer_id: data.stripe_customer_id,
      posthog_distinct_id: data.posthog_distinct_id,
      meta_external_id: data.meta_external_id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[GDP] Error creating person:", error);
    return null;
  }

  return newPerson?.id || null;
}

/**
 * Get person by stripe_customer_id
 */
export async function getPersonByStripeCustomerId(
  stripeCustomerId: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("person")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  return data?.id || null;
}

/**
 * Get person by user_id
 */
export async function getPersonByUserId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("person")
    .select("id")
    .eq("user_id", userId)
    .single();

  return data?.id || null;
}

/**
 * Link stripe_customer_id to person
 */
export async function linkStripeCustomerToPerson(
  personId: string,
  stripeCustomerId: string
): Promise<void> {
  await supabaseAdmin
    .from("person")
    .update({
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId);

  // Create identity link
  await supabaseAdmin
    .from("identity_link")
    .upsert(
      {
        person_id: personId,
        identity_type: "stripe",
        identity_value: stripeCustomerId,
      },
      { onConflict: "identity_type,identity_value" }
    );
}
