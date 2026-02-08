import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = supabaseServer();

  const { data: rates, error } = await supabase
    .from("currency_rates")
    .select("currency_code, rate_to_usd, last_updated")
    .order("currency_code");

  if (error) {
    console.error("Error fetching currency rates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rates: rates || [] });
}
