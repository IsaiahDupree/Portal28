import { NextRequest, NextResponse } from "next/server";
import { retryWebhookEvent } from "@/lib/webhooks/logger";
import { createServerClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendCapiPurchase } from "@/lib/meta/capi";
import { sendCourseAccessEmail } from "@/lib/email/sendCourseAccessEmail";
import { enrollInAutomation } from "@/lib/email/automation-scheduler";
import { processEmailEvent } from "@/lib/email/analytics";
import { processGDPEmailEvent } from "@/lib/growth-data-plane/email-events";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

// Map event types to processing functions
const EVENT_TYPE_MAP: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.unsubscribed": "unsubscribed",
  "email.received": "replied"
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const eventId = params.id;

  // Get the event to determine the source
  const { data: event } = await supabaseAdmin
    .from("webhook_events")
    .select("source, payload")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Retry the event based on its source
  let processFn: (payload: any) => Promise<any>;

  if (event.source === "stripe") {
    processFn = async (payload: any) => {
      await processStripeEvent(payload);
    };
  } else if (event.source === "resend") {
    processFn = async (payload: any) => {
      await processResendEvent(payload);
    };
  } else {
    return NextResponse.json({ error: "Unsupported event source" }, { status: 400 });
  }

  const result = await retryWebhookEvent(eventId, processFn);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Copy of the Stripe event processing logic
async function processStripeEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const courseId = session.metadata?.course_id;
    const bundleCourseIds = session.metadata?.bundle_course_ids
      ? JSON.parse(session.metadata.bundle_course_ids)
      : null;
    const kind = session.metadata?.kind || null;
    const event_id = session.metadata?.event_id || session.metadata?.meta_event_id;
    const userId = session.metadata?.user_id || null;
    const email = session.customer_details?.email || null;

    const emailSendId = session.metadata?.eid || null;
    const emailProgramId = session.metadata?.email_program_id || null;
    const emailCampaign = session.metadata?.utm_campaign || null;

    const amountTotal = (session.amount_total ?? 0) / 100;
    const currency = (session.currency ?? "usd").toUpperCase();

    if ((courseId || bundleCourseIds) && event_id) {
      const { data: existing } = await supabaseAdmin
        .from("orders")
        .select("id,status")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existing?.status !== "paid") {
        await supabaseAdmin
          .from("orders")
          .update({
            status: "paid",
            stripe_payment_intent: (session.payment_intent as string) ?? null,
            amount: session.amount_total ?? null,
            currency: session.currency ?? null,
            email,
            email_send_id: emailSendId,
            email_program_id: emailProgramId,
            email_campaign: emailCampaign,
          })
          .eq("stripe_session_id", session.id);

        const courseIdsToGrant = bundleCourseIds || [courseId];
        const entitlements = courseIdsToGrant.map((cid: string) => ({
          course_id: cid,
          user_id: userId || null,
          email,
          status: "active"
        }));

        await supabaseAdmin.from("entitlements").insert(entitlements);

        const affiliateCode = session.metadata?.affiliate_code;
        if (affiliateCode) {
          try {
            const { data: order } = await supabaseAdmin
              .from("orders")
              .select("id")
              .eq("stripe_session_id", session.id)
              .single();

            if (order) {
              await supabaseAdmin.rpc("process_affiliate_referral", {
                p_order_id: order.id,
                p_affiliate_code: affiliateCode,
              });
            }
          } catch (affiliateErr) {
            console.error("Error processing affiliate referral:", affiliateErr);
          }
        }

        await sendCapiPurchase({
          event_id,
          value: amountTotal,
          currency: currency.toLowerCase(),
          email: email ?? undefined,
          content_ids: courseIdsToGrant
        });

        if (email) {
          if (kind === "bundle" && bundleCourseIds) {
            const { data: courses } = await supabaseAdmin
              .from("courses")
              .select("title,slug")
              .in("id", bundleCourseIds);

            if (courses && courses.length > 0) {
              await sendCourseAccessEmail({
                to: email,
                courseName: `Bundle: ${courses.map(c => c.title).join(", ")}`,
                courseSlug: courses[0].slug
              });
            }
          } else if (courseId) {
            const { data: course } = await supabaseAdmin
              .from("courses")
              .select("title,slug")
              .eq("id", courseId)
              .single();

            if (course) {
              await sendCourseAccessEmail({
                to: email,
                courseName: course.title,
                courseSlug: course.slug
              });
            }
          }

          await supabaseAdmin
            .from("email_contacts")
            .upsert(
              { email, is_customer: true, source: "purchase" },
              { onConflict: "email" }
            );

          const { data: onboardingAutomation } = await supabaseAdmin
            .from("email_automations")
            .select("id")
            .eq("trigger_event", "purchase_completed")
            .eq("status", "active")
            .single();

          if (onboardingAutomation) {
            await enrollInAutomation(
              onboardingAutomation.id,
              email,
              userId,
              {
                course_id: courseId,
                bundle_course_ids: bundleCourseIds,
                purchase_amount: amountTotal,
                purchase_date: new Date().toISOString()
              }
            );
          }
        }

        if (emailProgramId) {
          await supabaseAdmin.rpc("attribute_revenue_to_program", {
            p_program_id: emailProgramId,
            p_revenue_cents: session.amount_total ?? 0
          });
        }
      }
    }
  }
  // Add more event types as needed
}

// Copy of the Resend event processing logic
async function processResendEvent(payload: any) {
  const resendEventType = payload.type;
  const internalEventType = EVENT_TYPE_MAP[resendEventType] || resendEventType.replace("email.", "");
  const emailId = payload.data?.email_id;
  const toAddresses = payload.data?.to ?? [];

  for (const email of toAddresses) {
    await processEmailEvent({
      event_type: internalEventType,
      email,
      resend_email_id: emailId,
      clicked_link: payload.data?.click?.link,
      user_agent: payload.data?.click?.userAgent || payload.data?.open?.userAgent,
      ip_address: payload.data?.click?.ipAddress || payload.data?.open?.ipAddress,
      bounce_type: payload.data?.bounce?.type,
      bounce_reason: payload.data?.bounce?.message,
      raw_payload: payload.data as Record<string, unknown>
    });

    if (emailId && ["delivered", "opened", "clicked", "bounced", "complained"].includes(internalEventType)) {
      await processGDPEmailEvent({
        email,
        event_type: internalEventType as "delivered" | "opened" | "clicked" | "bounced" | "complained",
        resend_email_id: emailId,
        subject: payload.data?.subject,
        from_email: payload.data?.from,
        link_url: payload.data?.click?.link,
        user_agent: payload.data?.click?.userAgent || payload.data?.open?.userAgent,
        ip_address: payload.data?.click?.ipAddress || payload.data?.open?.ipAddress,
        metadata: {
          bounce_type: payload.data?.bounce?.type,
          bounce_message: payload.data?.bounce?.message,
        },
      });
    }
  }
}
