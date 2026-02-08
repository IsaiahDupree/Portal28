/**
 * Email Click Tracking & Redirect
 * GDP-006: Attribution tracking for email clicks
 *
 * Usage: /api/track/click?m=message_id&u=encoded_url&p=person_id
 */

import { NextRequest, NextResponse } from "next/server";
import { trackEmailClickAttribution } from "@/lib/growth-data-plane/attribution";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const messageId = searchParams.get("m"); // email_message_id
  const encodedUrl = searchParams.get("u"); // destination URL (base64 encoded)
  const personId = searchParams.get("p"); // person_id (optional)

  if (!messageId || !encodedUrl) {
    return NextResponse.json(
      { error: "Missing required parameters: m (message_id), u (url)" },
      { status: 400 }
    );
  }

  // Decode the destination URL
  let destinationUrl: string;
  try {
    destinationUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");

    // Validate URL
    new URL(destinationUrl);
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid destination URL" },
      { status: 400 }
    );
  }

  // Track the click attribution (async, don't block redirect)
  trackEmailClickAttribution(messageId, destinationUrl, personId || undefined).catch(
    (err) => {
      console.error("Failed to track email click attribution:", err);
    }
  );

  // Redirect to destination
  return NextResponse.redirect(destinationUrl);
}
