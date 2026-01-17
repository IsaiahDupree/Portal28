import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getDashboardStats,
  getRevenueTimeSeries,
  getConversionFunnel,
  getTopCourses,
  getOfferAnalytics,
} from "@/lib/db/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Eye,
  Download,
  ArrowLeft,
} from "lucide-react";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { ConversionFunnel } from "@/components/analytics/ConversionFunnel";
import { TopCoursesTable } from "@/components/analytics/TopCoursesTable";
import { TimeFilterButtons } from "@/components/analytics/TimeFilterButtons";
import { ExportButton } from "@/components/analytics/ExportButton";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
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

  // Get time period from URL (default 30 days)
  const days = parseInt(searchParams.days ?? "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all analytics data
  const [stats, revenueData, funnelData, topCourses, offerAnalytics] =
    await Promise.all([
      getDashboardStats(days),
      getRevenueTimeSeries("day", days),
      getConversionFunnel(days),
      getTopCourses(10),
      getOfferAnalytics(days),
    ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Admin
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Analytics</h1>
          <p className="text-muted-foreground">
            Revenue, conversions, and offer performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeFilterButtons currentDays={days} />
          <ExportButton days={days} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.totalRevenue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Completed purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalImpressions}</div>
            <p className="text-xs text-muted-foreground">
              Offer views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checkouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCheckouts}</div>
            <p className="text-xs text-muted-foreground">
              Checkout attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Checkout to purchase
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>
              Daily revenue for the last {days} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>
              From impression to purchase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionFunnel data={funnelData} />
          </CardContent>
        </Card>

        {/* Top Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Top Courses by Revenue</CardTitle>
            <CardDescription>
              Best performing products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopCoursesTable courses={topCourses} />
          </CardContent>
        </Card>
      </div>

      {/* Offer Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Offer Performance</CardTitle>
          <CardDescription>
            Impressions, checkouts, and conversions by offer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Offer</th>
                  <th className="text-right p-3 font-medium">Impressions</th>
                  <th className="text-right p-3 font-medium">Checkouts</th>
                  <th className="text-right p-3 font-medium">Conversions</th>
                  <th className="text-right p-3 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {offerAnalytics.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No offer data yet
                    </td>
                  </tr>
                ) : (
                  offerAnalytics.map((offer) => (
                    <tr key={offer.offer_key} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{offer.offer_title}</div>
                        <div className="text-xs text-muted-foreground">{offer.offer_key}</div>
                      </td>
                      <td className="p-3 text-right">{offer.impressions}</td>
                      <td className="p-3 text-right">{offer.checkouts}</td>
                      <td className="p-3 text-right">{offer.conversions}</td>
                      <td className="p-3 text-right">{offer.conversion_rate.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
