import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { GraduationCap, ShoppingCart, Users, DollarSign, TrendingUp, Plus, Shield, BarChart3, Crown, FileX } from "lucide-react";
import { getCurrentMRR, getChurnRate } from "@/lib/db/mrr";

export default async function AdminPage() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        <Button asChild>
          <Link href="/app">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const { data: courses } = await supabase
    .from("courses")
    .select("id,title,slug,status,created_at")
    .order("created_at", { ascending: false });

  const { data: orders } = await supabase
    .from("orders")
    .select("id,email,status,amount,currency,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;

  // Get MRR and churn data
  const mrrData = await getCurrentMRR();
  const churnData = await getChurnRate(30);

  return (
    <div className="space-y-6">
      {/* Page Header - Using new reusable component */}
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your academy."
        actions={
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              New Course
            </Link>
          </Button>
        }
      />

      {/* Stats Cards - Using new reusable StatCard components */}
      <StatCardGrid columns={4}>
        <StatCard
          title="MRR"
          value={`$${(mrrData.current_mrr / 100).toFixed(0)}`}
          description={`${mrrData.subscriber_count} active subscribers`}
          change={mrrData.growth_rate !== 0 ? `${mrrData.growth_rate > 0 ? '+' : ''}${mrrData.growth_rate.toFixed(1)}%` : undefined}
          changeType={mrrData.growth_rate > 0 ? "positive" : mrrData.growth_rate < 0 ? "negative" : "neutral"}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Revenue"
          value={`$${(totalRevenue / 100).toFixed(2)}`}
          description={`From ${orders?.length || 0} orders`}
          icon={DollarSign}
        />
        <StatCard
          title="Courses"
          value={courses?.length || 0}
          description={`${courses?.filter(c => c.status === "published").length || 0} published`}
          icon={GraduationCap}
        />
        <StatCard
          title="Users"
          value={totalUsers || 0}
          description={`Churn: ${churnData.churn_rate.toFixed(1)}%`}
          icon={Users}
        />
      </StatCardGrid>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/admin/subscribers">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Crown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Subscribers & MRR</CardTitle>
                <CardDescription>Manage subscriptions and revenue</CardDescription>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/admin/moderation">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-base">Content Moderation</CardTitle>
                <CardDescription>Review & manage posts</CardDescription>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/admin/analytics">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Sales Analytics</CardTitle>
                <CardDescription>Offers, checkouts, conversions</CardDescription>
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Courses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Courses</CardTitle>
              <CardDescription>Manage your course catalog</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/courses">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!courses || courses.length === 0 ? (
              <EmptyState
                icon={FileX}
                title="No courses yet"
                description="Create your first course to get started"
                action={
                  <Button asChild size="sm">
                    <Link href="/admin/courses/new">Create Course</Link>
                  </Button>
                }
                className="min-h-[200px] border-0"
              />
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-sm text-muted-foreground">/{c.slug}</p>
                    </div>
                    <Badge variant={c.status === "published" ? "success" : "secondary"}>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/analytics">View Analytics</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!orders || orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{o.email ?? "—"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {o.amount ? `$${(o.amount / 100).toFixed(2)}` : "—"}
                      </p>
                      <Badge variant={o.status === "completed" ? "success" : "outline"}>
                        {o.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
