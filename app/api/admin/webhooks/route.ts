import { NextRequest, NextResponse } from "next/server";
import { getWebhookEvents } from "@/lib/webhooks/logger";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
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

  // Get query parameters
  const searchParams = req.nextUrl.searchParams;
  const source = searchParams.get("source") || undefined;
  const status = searchParams.get("status") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const { data: events, count, error } = await getWebhookEvents({
    source: source as any,
    status: status as any,
    limit,
    offset,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch webhook events" }, { status: 500 });
  }

  return NextResponse.json({
    events: events || [],
    count: count || 0,
  });
}
