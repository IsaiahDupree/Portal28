/**
 * Growth Data Plane - Subscription Management
 * GDP-008: Upsert subscription status, plan, MRR from Stripe events
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreatePerson, getPersonByStripeCustomerId } from "./person";
import type Stripe from "stripe";

export interface SubscriptionData {
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  plan_id?: string;
  plan_name?: string;
  price_cents: number;
  interval: string; // 'month' or 'year'
  current_period_start: Date;
  current_period_end: Date;
  cancel_at?: Date;
  canceled_at?: Date;
  user_id?: string;
  email?: string;
}

/**
 * Calculate MRR (Monthly Recurring Revenue) from subscription
 */
function calculateMRR(priceCents: number, interval: string): number {
  const priceInDollars = priceCents / 100;

  if (interval === "year") {
    // Annual subscription: divide by 12
    return priceInDollars / 12;
  }

  // Monthly subscription
  return priceInDollars;
}

/**
 * Sync Stripe subscription to GDP subscription table
 * GDP-007 & GDP-008
 */
export async function syncSubscriptionToGDP(data: SubscriptionData): Promise<void> {
  try {
    // Get or create person record
    const personId = await getOrCreatePerson({
      email: data.email,
      user_id: data.user_id,
      stripe_customer_id: data.stripe_customer_id,
    });

    if (!personId) {
      console.error("[GDP] Failed to get/create person for subscription sync");
      return;
    }

    // Calculate MRR
    const mrr = calculateMRR(data.price_cents, data.interval);

    // Upsert subscription in GDP table
    const { error } = await supabaseAdmin.from("subscription").upsert(
      {
        person_id: personId,
        stripe_subscription_id: data.stripe_subscription_id,
        stripe_customer_id: data.stripe_customer_id,
        status: data.status,
        plan_id: data.plan_id,
        plan_name: data.plan_name,
        mrr: mrr,
        currency: "usd",
        current_period_start: data.current_period_start.toISOString(),
        current_period_end: data.current_period_end.toISOString(),
        cancel_at: data.cancel_at ? data.cancel_at.toISOString() : null,
        canceled_at: data.canceled_at ? data.canceled_at.toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );

    if (error) {
      console.error("[GDP] Error upserting subscription:", error);
    } else {
      console.log(
        `[GDP] Synced subscription ${data.stripe_subscription_id} for person ${personId}`
      );
    }
  } catch (error) {
    console.error("[GDP] Error syncing subscription:", error);
  }
}

/**
 * Sync Stripe subscription from Stripe webhook event
 */
export async function syncStripeSubscriptionEvent(
  subscription: Stripe.Subscription,
  eventType: string
): Promise<void> {
  const userId = subscription.metadata?.user_id;
  const stripeCustomerId = subscription.customer as string;

  // Extract price details
  const priceData = subscription.items.data[0]?.price;
  const priceCents = priceData?.unit_amount || 0;
  const interval = priceData?.recurring?.interval || "month";

  // Get email from metadata or customer object
  let email: string | undefined = subscription.metadata?.email;

  await syncSubscriptionToGDP({
    stripe_subscription_id: subscription.id,
    stripe_customer_id: stripeCustomerId,
    status: subscription.status,
    plan_id: priceData?.id,
    plan_name: subscription.metadata?.tier || "member",
    price_cents: priceCents,
    interval: interval as "month" | "year",
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000),
    cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : undefined,
    user_id: userId,
    email: email,
  });
}

/**
 * Handle subscription cancellation
 */
export async function handleSubscriptionCanceled(
  subscription: Stripe.Subscription
): Promise<void> {
  const stripeCustomerId = subscription.customer as string;

  // Get person by stripe customer ID
  const personId = await getPersonByStripeCustomerId(stripeCustomerId);

  if (!personId) {
    console.error(`[GDP] Person not found for stripe customer ${stripeCustomerId}`);
    return;
  }

  // Update subscription status
  await supabaseAdmin
    .from("subscription")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  console.log(`[GDP] Marked subscription ${subscription.id} as canceled`);
}
