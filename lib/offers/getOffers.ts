import { supabaseServer } from "@/lib/supabase/server";

export type Offer = {
  key: string;
  kind: "membership" | "course" | "bundle";
  title: string;
  subtitle: string | null;
  badge: string | null;
  cta_text: string;
  price_label: string | null;
  compare_at_label: string | null;
  bullets: string[];
  payload: Record<string, any>;
  is_active: boolean;
};

export async function getOfferByKey(key: string): Promise<Offer | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("key", key)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as Offer;
}

export async function getOffersByPlacement(placementKey: string): Promise<Offer[]> {
  const supabase = supabaseServer();

  const { data: placements, error: pErr } = await supabase
    .from("offer_placements")
    .select("offer_key, sort_order")
    .eq("placement_key", placementKey)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (pErr || !placements || placements.length === 0) return [];

  const offerKeys = placements.map((p: { offer_key: string }) => p.offer_key);

  const { data: offers, error: oErr } = await supabase
    .from("offers")
    .select("*")
    .in("key", offerKeys)
    .eq("is_active", true);

  if (oErr || !offers) return [];

  const offerMap = new Map(offers.map((o: Offer) => [o.key, o]));
  return placements
    .map((p: { offer_key: string }) => offerMap.get(p.offer_key))
    .filter(Boolean) as Offer[];
}

export async function getAllOffers(): Promise<Offer[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Offer[];
}
