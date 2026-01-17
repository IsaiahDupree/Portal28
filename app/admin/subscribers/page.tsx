import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, DollarSign, TrendingUp, Users } from "lucide-react";
import {
  getSubscriberList,
  getMRRByPlan,
  getCurrentMRR,
  getChurnRate,
} from "@/lib/db/mrr";

export default async function SubscribersPage() {
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

  // Get MRR data
  const mrrData = await getCurrentMRR();
  const churnData = await getChurnRate(30);
  const mrrByPlan = await getMRRByPlan();

  // Get active and canceled subscribers
  const activeSubscribers = await getSubscriberList("active", 100);
  const trialingSubscribers = await getSubscriberList("trialing", 100);
  const canceledSubscribers = await getSubscriberList("canceled", 20);

  // Calculate ARR
  const arr = mrrData.current_mrr * 12;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscribers</h1>
            <p className="text-muted-foreground">
              Manage subscriptions and track recurring revenue
            </p>
          </div>
        </div>
      </div>

      {/* MRR Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(mrrData.current_mrr / 100).toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Monthly Recurring Revenue
            </p>
            {mrrData.growth_rate !== 0 && (
              <p className="text-xs text-green-600 mt-1">
                {mrrData.growth_rate > 0 ? '+' : ''}{mrrData.growth_rate.toFixed(1)}% vs 30 days ago
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(arr / 100).toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Annual Recurring Revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mrrData.subscriber_count}</div>
            <p className="text-xs text-muted-foreground">
              {trialingSubscribers.length} in trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{churnData.churn_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {churnData.churned_count} churned (30d)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown by Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown by Plan</CardTitle>
          <CardDescription>MRR contribution by tier and interval</CardDescription>
        </CardHeader>
        <CardContent>
          {mrrByPlan.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active subscriptions</p>
          ) : (
            <div className="space-y-3">
              {mrrByPlan.map((plan, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium capitalize">
                      {plan.tier} - {plan.billing_interval === "month" ? "Monthly" : "Annual"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {plan.subscriber_count} subscribers
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${(plan.total_mrr / 100).toFixed(0)} MRR</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.billing_interval === "month"
                        ? `$${(plan.monthly_revenue / 100).toFixed(0)}/mo`
                        : `$${(plan.annual_revenue / 100).toFixed(0)}/yr`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Subscribers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Subscribers</CardTitle>
            <CardDescription>
              {activeSubscribers.length} active subscriptions
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {activeSubscribers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active subscribers yet.</p>
          ) : (
            <div className="space-y-2">
              {activeSubscribers.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">{sub.user_email}</p>
                    <p className="text-sm text-muted-foreground">{sub.user_name || "—"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {sub.tier}
                    </Badge>
                    <Badge variant="secondary">
                      {sub.billing_interval === "month" ? "Monthly" : "Annual"}
                    </Badge>
                    <div className="text-right min-w-[80px]">
                      <p className="font-medium">
                        ${(sub.price_cents / 100).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        /{sub.billing_interval === "month" ? "mo" : "yr"}
                      </p>
                    </div>
                    {sub.cancel_at_period_end && (
                      <Badge variant="destructive">Canceling</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trialing Subscribers */}
      {trialingSubscribers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trial Subscriptions</CardTitle>
            <CardDescription>
              {trialingSubscribers.length} subscribers in trial period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trialingSubscribers.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">{sub.user_email}</p>
                    <p className="text-sm text-muted-foreground">
                      Trial ends: {new Date(sub.trial_end!).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {sub.tier}
                    </Badge>
                    <Badge variant="secondary">Trial</Badge>
                    <div className="text-right min-w-[80px]">
                      <p className="font-medium">
                        ${(sub.price_cents / 100).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">after trial</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently Canceled */}
      {canceledSubscribers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Canceled</CardTitle>
            <CardDescription>Last 20 canceled subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {canceledSubscribers.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3 opacity-60">
                  <div className="flex-1">
                    <p className="font-medium">{sub.user_email}</p>
                    <p className="text-sm text-muted-foreground">
                      Canceled: {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {sub.tier}
                    </Badge>
                    <Badge variant="destructive">Canceled</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
