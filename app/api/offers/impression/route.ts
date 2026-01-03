import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { placementKey, offerKeys, anonSessionId } = await req.json();

    if (!placementKey || !Array.isArray(offerKeys) || offerKeys.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const supabase = supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id ?? null;

    const rows = offerKeys.map((offerKey: string) => ({
      placement_key: placementKey,
      offer_key: offerKey,
      user_id: userId,
      anon_session_id: anonSessionId || null,
    }));

    await supabase.from("offer_impressions").insert(rows);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
