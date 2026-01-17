import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import PlacementsManager from "./PlacementsManager";

export default async function AdminPlacementsPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/offers/placements");
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  // Get all active offers for the dropdown
  const { data: offers } = await supabase
    .from("offers")
    .select("key, kind, title, is_active")
    .order("created_at", { ascending: false });

  // Get all unique placement keys
  const { data: placements } = await supabase
    .from("offer_placements")
    .select("placement_key")
    .order("placement_key");

  const uniquePlacements = Array.from(
    new Set(placements?.map((p: any) => p.placement_key) ?? [])
  );

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/offers" className="text-sm text-gray-600 hover:text-black">
            ← Offers
          </Link>
          <h1 className="text-2xl font-semibold mt-1">Offer Placements</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage where offers appear and their display order
          </p>
        </div>
      </div>

      <PlacementsManager
        offers={offers ?? []}
        initialPlacements={uniquePlacements}
      />
    </main>
  );
}
