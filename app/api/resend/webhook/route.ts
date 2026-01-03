import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { processEmailEvent } from "@/lib/email/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    created_at?: string;
    // Click tracking
    click?: {
      link?: string;
      timestamp?: string;
      userAgent?: string;
      ipAddress?: string;
    };
    // Bounce details
    bounce?: {
      type?: string;
      message?: string;
    };
    // Open tracking
    open?: {
      timestamp?: string;
      userAgent?: string;
      ipAddress?: string;
    };
  };
}

// Map Resend event types to our internal types
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

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  let payload: ResendWebhookPayload;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature
    }) as ResendWebhookPayload;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const resendEventType = payload.type;
  const internalEventType = EVENT_TYPE_MAP[resendEventType] || resendEventType.replace("email.", "");
  const emailId = payload.data?.email_id;
  const toAddresses = payload.data?.to ?? [];

  // Process each recipient
  for (const email of toAddresses) {
    try {
      await processEmailEvent({
        event_type: internalEventType,
        email,
        resend_email_id: emailId,
        // Click data
        clicked_link: payload.data?.click?.link,
        user_agent: payload.data?.click?.userAgent || payload.data?.open?.userAgent,
        ip_address: payload.data?.click?.ipAddress || payload.data?.open?.ipAddress,
        // Bounce data
        bounce_type: payload.data?.bounce?.type,
        bounce_reason: payload.data?.bounce?.message,
        // Raw payload for debugging
        raw_payload: payload.data as Record<string, unknown>
      });
    } catch (err) {
      console.error(`Failed to process event for ${email}:`, err);
    }
  }

  return NextResponse.json({ received: true, processed: toAddresses.length });
}
