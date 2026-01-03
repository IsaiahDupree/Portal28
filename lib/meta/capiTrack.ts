import crypto from "crypto";

type CapiEventName = "InitiateCheckout" | "Purchase" | "Lead" | "ViewContent";

type CapiArgs = {
  eventName: CapiEventName;
  eventId: string;
  offerKey?: string;
  customData?: Record<string, any>;
  userData?: {
    email?: string;
    external_id?: string;
    fbp?: string;
    fbc?: string;
  };
  client?: {
    ip?: string | null;
    ua?: string | null;
  };
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function capiTrack(args: CapiArgs): Promise<{ success: boolean; error?: string }> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  const version = process.env.META_API_VERSION || "v20.0";

  if (!pixelId || !token) {
    return { success: false, error: "Missing Meta Pixel ID or CAPI token" };
  }

  const userData: Record<string, any> = {};

  if (args.userData?.email) {
    userData.em = [sha256(args.userData.email)];
  }
  if (args.userData?.external_id) {
    userData.external_id = [sha256(args.userData.external_id)];
  }
  if (args.userData?.fbp) {
    userData.fbp = args.userData.fbp;
  }
  if (args.userData?.fbc) {
    userData.fbc = args.userData.fbc;
  }
  if (args.client?.ip) {
    userData.client_ip_address = args.client.ip;
  }
  if (args.client?.ua) {
    userData.client_user_agent = args.client.ua;
  }

  const body: Record<string, any> = {
    data: [
      {
        event_name: args.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: args.eventId,
        action_source: "website",
        user_data: userData,
        custom_data: {
          currency: "USD",
          ...args.customData,
        },
      },
    ],
  };

  if (process.env.META_TEST_EVENT_CODE) {
    body.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${pixelId}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: text };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
