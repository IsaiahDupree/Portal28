import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getCohortAnalytics,
  getCohortLTVComparison,
} from "@/lib/db/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CohortRetentionTable } from "@/components/analytics/CohortRetentionTable";
import { CohortLTVChart } from "@/components/analytics/CohortLTVChart";
import { CohortPeriodFilter } from "@/components/analytics/CohortPeriodFilter";

export default async function CohortAnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/analytics/cohorts");
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  // Get period from URL (default 'month')
  const period = (searchParams.period ?? "month") as "week" | "month";

  // Fetch cohort analytics data
  const [cohortData, ltvComparison] = await Promise.all([
    getCohortAnalytics(period, 12),
    getCohortLTVComparison(period, 6),
  ]);

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b">
        <Link
          href="/admin/analytics"
          className="px-4 py-2 text-muted-foreground hover:text-foreground"
        >
          Sales
        </Link>
        <Link
          href="/admin/analytics/cohorts"
          className="px-4 py-2 border-b-2 border-primary font-medium"
        >
          Cohorts
        </Link>
        <Link
          href="/admin/analytics/enrollments"
          className="px-4 py-2 text-muted-foreground hover:text-foreground"
        >
          Enrollments
        </Link>
        <Link
          href="/admin/analytics/upsells"
          className="px-4 py-2 text-muted-foreground hover:text-foreground"
        >
          Upsells
        </Link>
      </div>

      {/* Page Header */}
      <PageHeader
        title="Cohort Analytics"
        description="User retention and lifetime value by signup cohort"
        actions={<CohortPeriodFilter currentPeriod={period} />}
      />

      {/* Cohort Retention Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention Analysis</CardTitle>
          <CardDescription>
            Percentage of users active at each time interval by cohort
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CohortRetentionTable cohorts={cohortData} period={period} />
        </CardContent>
      </Card>

      {/* LTV Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Lifetime Value by Cohort</CardTitle>
          <CardDescription>
            Compare average, median, and maximum LTV across cohorts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CohortLTVChart cohorts={ltvComparison} />
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Cohorts</CardTitle>
            <CardDescription>Signup cohorts tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{cohortData.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Cohort Size</CardTitle>
            <CardDescription>Most recent {period} cohort</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {cohortData.length > 0 ? cohortData[0].cohort_size : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg LTV (Latest)</CardTitle>
            <CardDescription>Average lifetime value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {cohortData.length > 0
                ? `$${((cohortData[0].avg_ltv || 0) / 100).toFixed(2)}`
                : "$0.00"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
