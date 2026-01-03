import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminAnalyticsPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/analytics");
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [impressionsRes, attemptsRes] = await Promise.all([
    supabase
      .from("offer_impressions")
      .select("placement_key, offer_key, created_at")
      .gte("created_at", since),
    supabase
      .from("checkout_attempts")
      .select("offer_key, placement_key, status, created_at")
      .gte("created_at", since),
  ]);

  const impressions = impressionsRes.data ?? [];
  const attempts = attemptsRes.data ?? [];

  type Stats = { impressions: number; checkouts: number; purchases: number };
  const byPlacement: Record<string, Stats> = {};
  const byOffer: Record<string, Stats> = {};

  for (const imp of impressions) {
    const p = (imp as any).placement_key || "unknown";
    const o = (imp as any).offer_key || "unknown";
    byPlacement[p] ||= { impressions: 0, checkouts: 0, purchases: 0 };
    byOffer[o] ||= { impressions: 0, checkouts: 0, purchases: 0 };
    byPlacement[p].impressions++;
    byOffer[o].impressions++;
  }

  for (const a of attempts) {
    const p = (a as any).placement_key || "unknown";
    const o = (a as any).offer_key || "unknown";
    byPlacement[p] ||= { impressions: 0, checkouts: 0, purchases: 0 };
    byOffer[o] ||= { impressions: 0, checkouts: 0, purchases: 0 };

    if ((a as any).status === "redirected" || (a as any).status === "completed") {
      byPlacement[p].checkouts++;
      byOffer[o].checkouts++;
    }
    if ((a as any).status === "completed") {
      byPlacement[p].purchases++;
      byOffer[o].purchases++;
    }
  }

  const placementRows = Object.entries(byPlacement)
    .map(([key, v]) => ({
      key,
      ...v,
      checkoutRate: v.impressions ? v.checkouts / v.impressions : 0,
      purchaseRate: v.impressions ? v.purchases / v.impressions : 0,
    }))
    .sort((a, b) => b.purchases - a.purchases);

  const offerRows = Object.entries(byOffer)
    .map(([key, v]) => ({
      key,
      ...v,
      checkoutRate: v.impressions ? v.checkouts / v.impressions : 0,
      purchaseRate: v.impressions ? v.purchases / v.impressions : 0,
    }))
    .sort((a, b) => b.purchases - a.purchases);

  const totalImpressions = impressions.length;
  const totalCheckouts = attempts.filter((a: any) => a.status === "redirected" || a.status === "completed").length;
  const totalPurchases = attempts.filter((a: any) => a.status === "completed").length;

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-gray-600 hover:text-black">
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold mt-1">Analytics</h1>
        <p className="text-gray-600">Last 30 days</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5">
          <div className="text-sm text-gray-600">Impressions</div>
          <div className="text-3xl font-semibold">{totalImpressions.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border p-5">
          <div className="text-sm text-gray-600">Checkouts</div>
          <div className="text-3xl font-semibold">{totalCheckouts.toLocaleString()}</div>
          <div className="text-sm text-gray-500">
            {totalImpressions ? ((totalCheckouts / totalImpressions) * 100).toFixed(1) : 0}% rate
          </div>
        </div>
        <div className="rounded-xl border p-5">
          <div className="text-sm text-gray-600">Purchases</div>
          <div className="text-3xl font-semibold">{totalPurchases.toLocaleString()}</div>
          <div className="text-sm text-gray-500">
            {totalImpressions ? ((totalPurchases / totalImpressions) * 100).toFixed(1) : 0}% rate
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">By Placement</h2>
        {placementRows.length === 0 ? (
          <p className="text-gray-600">No placement data yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Placement</th>
                  <th className="text-right p-3">Impressions</th>
                  <th className="text-right p-3">Checkouts</th>
                  <th className="text-right p-3">Purchases</th>
                  <th className="text-right p-3">Checkout %</th>
                  <th className="text-right p-3">Purchase %</th>
                </tr>
              </thead>
              <tbody>
                {placementRows.map((r) => (
                  <tr key={r.key} className="border-t">
                    <td className="p-3 font-mono text-xs">{r.key}</td>
                    <td className="p-3 text-right">{r.impressions}</td>
                    <td className="p-3 text-right">{r.checkouts}</td>
                    <td className="p-3 text-right">{r.purchases}</td>
                    <td className="p-3 text-right">{(r.checkoutRate * 100).toFixed(1)}%</td>
                    <td className="p-3 text-right">{(r.purchaseRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">By Offer</h2>
        {offerRows.length === 0 ? (
          <p className="text-gray-600">No offer data yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Offer</th>
                  <th className="text-right p-3">Impressions</th>
                  <th className="text-right p-3">Checkouts</th>
                  <th className="text-right p-3">Purchases</th>
                  <th className="text-right p-3">Checkout %</th>
                  <th className="text-right p-3">Purchase %</th>
                </tr>
              </thead>
              <tbody>
                {offerRows.map((r) => (
                  <tr key={r.key} className="border-t">
                    <td className="p-3 font-mono text-xs">{r.key}</td>
                    <td className="p-3 text-right">{r.impressions}</td>
                    <td className="p-3 text-right">{r.checkouts}</td>
                    <td className="p-3 text-right">{r.purchases}</td>
                    <td className="p-3 text-right">{(r.checkoutRate * 100).toFixed(1)}%</td>
                    <td className="p-3 text-right">{(r.purchaseRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
