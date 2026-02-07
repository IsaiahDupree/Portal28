import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UpsellAnalyticsPage() {
  // Fetch all upsell purchases
  const { data: purchases } = await supabaseAdmin
    .from("upsell_purchases")
    .select(`
      *,
      upsell_offer:upsell_offer_key (
        key,
        title,
        price_label
      ),
      original_order:original_order_id (
        id,
        offer_key,
        amount
      )
    `)
    .order("created_at", { ascending: false });

  // Calculate metrics
  const totalShown = purchases?.length || 0;
  const totalAccepted = purchases?.filter(p => p.accepted_at)?.length || 0;
  const totalPurchased = purchases?.filter(p => p.status === "paid")?.length || 0;
  const totalRevenue = purchases
    ?.filter(p => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  const conversionRate = totalShown > 0 ? ((totalPurchased / totalShown) * 100).toFixed(1) : "0";
  const acceptanceRate = totalShown > 0 ? ((totalAccepted / totalShown) * 100).toFixed(1) : "0";
  const purchaseRate = totalAccepted > 0 ? ((totalPurchased / totalAccepted) * 100).toFixed(1) : "0";

  // Group by offer
  const byOffer = purchases?.reduce((acc: any, p: any) => {
    const key = p.upsell_offer_key;
    if (!acc[key]) {
      acc[key] = {
        key,
        title: p.upsell_offer?.title || key,
        shown: 0,
        accepted: 0,
        purchased: 0,
        revenue: 0
      };
    }
    acc[key].shown++;
    if (p.accepted_at) acc[key].accepted++;
    if (p.status === "paid") {
      acc[key].purchased++;
      acc[key].revenue += p.amount || 0;
    }
    return acc;
  }, {});

  const offerStats = Object.values(byOffer || {}) as any[];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Upsell Analytics</h1>
        <p className="text-gray-600">Track post-purchase upsell performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-6">
          <div className="text-sm text-gray-600">Total Shown</div>
          <div className="text-3xl font-bold mt-1">{totalShown}</div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="text-sm text-gray-600">Conversion Rate</div>
          <div className="text-3xl font-bold mt-1 text-green-600">{conversionRate}%</div>
          <div className="text-xs text-gray-500 mt-1">{totalPurchased} purchased</div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="text-sm text-gray-600">Acceptance Rate</div>
          <div className="text-3xl font-bold mt-1 text-blue-600">{acceptanceRate}%</div>
          <div className="text-xs text-gray-500 mt-1">{totalAccepted} clicked "Yes"</div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="text-sm text-gray-600">Upsell Revenue</div>
          <div className="text-3xl font-bold mt-1">${(totalRevenue / 100).toFixed(2)}</div>
        </div>
      </div>

      {/* By Offer Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Performance by Offer</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Offer</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Shown</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Accepted</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Purchased</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Conv. Rate</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {offerStats.map((offer) => {
                const convRate = offer.shown > 0
                  ? ((offer.purchased / offer.shown) * 100).toFixed(1)
                  : "0";

                return (
                  <tr key={offer.key} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">{offer.title}</div>
                      <div className="text-xs text-gray-500">{offer.key}</div>
                    </td>
                    <td className="p-4 text-right">{offer.shown}</td>
                    <td className="p-4 text-right">{offer.accepted}</td>
                    <td className="p-4 text-right">{offer.purchased}</td>
                    <td className="p-4 text-right">
                      <span className={`font-medium ${parseFloat(convRate) > 10 ? "text-green-600" : ""}`}>
                        {convRate}%
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium">
                      ${(offer.revenue / 100).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {offerStats.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No upsell data yet. Create upsell offers and start converting!
            </div>
          )}
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Recent Upsell Purchases</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Date</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Email</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Offer</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {purchases?.slice(0, 20).map((purchase: any) => (
                <tr key={purchase.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-sm">
                    {new Date(purchase.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-sm">{purchase.email}</td>
                  <td className="p-4 text-sm">
                    {purchase.upsell_offer?.title || purchase.upsell_offer_key}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        purchase.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : purchase.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {purchase.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium">
                    ${((purchase.amount || 0) / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!purchases || purchases.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No purchases yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
