/**
 * Conversion Metrics Admin Page
 * META-008: Conversion Optimization dashboard
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ConversionMetricsPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/conversion-metrics");
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  // Fetch recent conversion events
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from("conversion_events")
    .select("event_name, value, currency, created_at")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(100);

  // Calculate summary stats
  const totalRevenue = events?.reduce((sum, e) => sum + (Number(e.value) || 0), 0) || 0;
  const totalConversions = events?.length || 0;
  const avgOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;

  // Group by event name
  const eventsByName = events?.reduce((acc: Record<string, any>, event) => {
    if (!acc[event.event_name]) {
      acc[event.event_name] = {
        name: event.event_name,
        count: 0,
        revenue: 0,
      };
    }
    acc[event.event_name].count++;
    acc[event.event_name].revenue += Number(event.value) || 0;
    return acc;
  }, {});

  const eventSummaries = Object.values(eventsByName || {}).sort(
    (a: any, b: any) => b.count - a.count
  );

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-gray-600 hover:text-black">
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold mt-1">Conversion Metrics</h1>
        <p className="text-sm text-gray-600 mt-1">
          Track conversion events and ROAS for the last 30 days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-xl p-6">
          <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
          <div className="text-3xl font-semibold">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
        </div>

        <div className="border rounded-xl p-6">
          <div className="text-sm text-gray-600 mb-1">Total Conversions</div>
          <div className="text-3xl font-semibold">{totalConversions.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">All conversion events</div>
        </div>

        <div className="border rounded-xl p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Order Value</div>
          <div className="text-3xl font-semibold">
            ${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">Per conversion</div>
        </div>
      </div>

      {/* Events by Type */}
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="font-semibold">Conversion Events by Type</h2>
        </div>
        {eventSummaries.length === 0 ? (
          <div className="p-12 text-center text-gray-600">
            No conversion events tracked yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium">Event Name</th>
                <th className="text-right p-3 font-medium">Count</th>
                <th className="text-right p-3 font-medium">Revenue</th>
                <th className="text-right p-3 font-medium">Avg Value</th>
              </tr>
            </thead>
            <tbody>
              {eventSummaries.map((event: any, idx: number) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{event.name}</td>
                  <td className="p-3 text-right font-mono">{event.count.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">
                    ${event.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono">
                    ${(event.revenue / event.count).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-sm mb-2">📊 About Conversion Optimization</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Conversion events are automatically tracked from Meta Pixel</li>
          <li>Revenue values help Meta optimize ad delivery for high-value customers</li>
          <li>Use Custom Audiences to retarget converters and create lookalikes</li>
          <li>Track ROAS by connecting your Meta Ads account data</li>
        </ul>
      </div>
    </main>
  );
}
