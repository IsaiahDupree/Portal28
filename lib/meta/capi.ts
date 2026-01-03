import crypto from "crypto";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendCapiPurchase(args: {
  event_id: string;
  value: number;
  currency: string;
  email?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  content_ids?: string[];
}) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID!;
  const token = process.env.META_CAPI_ACCESS_TOKEN!;
  const version = process.env.META_API_VERSION || "v20.0";

  if (!pixelId || !token) return;

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: args.event_id,
        action_source: "website",
        user_data: {
          em: args.email ? [sha256(args.email)] : undefined,
          client_ip_address: args.client_ip_address,
          client_user_agent: args.client_user_agent
        },
        custom_data: {
          currency: args.currency,
          value: args.value,
          content_ids: args.content_ids ?? []
        }
      }
    ]
  };

  await fetch(`https://graph.facebook.com/${version}/${pixelId}/events?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
