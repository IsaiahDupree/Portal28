import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

const UpdatePreferenceSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL']),
});

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Return default currency for unauthenticated users
    return NextResponse.json({ currency: 'USD' });
  }

  // Get user's currency preference
  const { data: preference } = await supabase
    .from("user_currency_preferences")
    .select("currency_code")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    currency: preference?.currency_code || 'USD'
  });
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = UpdatePreferenceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const { currency } = parsed.data;

  // Upsert user's currency preference
  const { data, error } = await supabase
    .from("user_currency_preferences")
    .upsert({
      user_id: user.id,
      currency_code: currency,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    console.error("Error updating currency preference:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ currency: data.currency_code });
}
