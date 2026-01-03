import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, Crown, TrendingUp, Calendar, DollarSign, ArrowLeft } from "lucide-react";

export default async function EnrollmentsAnalyticsPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/analytics/enrollments");
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (userProfile?.role !== "admin") {
    redirect("/app");
  }

  // Fetch all courses with enrollment counts
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      slug,
      status,
      price_cents,
      is_membership,
      created_at
    `)
    .order("created_at", { ascending: false });

  // Fetch all entitlements with user info
  const { data: entitlements } = await supabase
    .from("entitlements")
    .select(`
      id,
      user_id,
      course_id,
      access_type,
      status,
      expires_at,
      created_at,
      user:users(id, email, full_name)
    `)
    .order("created_at", { ascending: false });

  // Fetch subscription data for MRR calculation
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(`
      id,
      user_id,
      status,
      price_cents,
      interval,
      current_period_end,
      cancel_at_period_end,
      created_at,
      user:users(id, email, full_name)
    `)
    .order("current_period_end", { ascending: true });

  // Calculate stats per course
  const courseStats = (courses || []).map(course => {
    const courseEntitlements = (entitlements || []).filter(e => e.course_id === course.id);
    const activeCount = courseEntitlements.filter(e => e.status === "active").length;
    const totalCount = courseEntitlements.length;
    
    return {
      ...course,
      activeEnrollments: activeCount,
      totalEnrollments: totalCount,
      entitlements: courseEntitlements,
    };
  });

  // Separate courses and memberships
  const regularCourses = courseStats.filter(c => !c.is_membership);
  const memberships = courseStats.filter(c => c.is_membership);

  // Calculate MRR from active subscriptions
  const activeSubscriptions = (subscriptions || []).filter(s => 
    s.status === "active" && !s.cancel_at_period_end
  );
  
  const monthlyMRR = activeSubscriptions.reduce((sum, sub) => {
    if (sub.interval === "month") {
      return sum + (sub.price_cents || 0);
    } else if (sub.interval === "year") {
      return sum + ((sub.price_cents || 0) / 12);
    }
    return sum;
  }, 0);

  // Get renewals coming up in next 30 days
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const upcomingRenewals = (subscriptions || [])
    .filter(s => {
      if (s.status !== "active") return false;
      const renewalDate = new Date(s.current_period_end);
      return renewalDate >= now && renewalDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => new Date(a.current_period_end).getTime() - new Date(b.current_period_end).getTime());

  // Get at-risk subscriptions (canceling at period end)
  const atRiskSubscriptions = (subscriptions || []).filter(s => 
    s.status === "active" && s.cancel_at_period_end
  );

  const potentialChurn = atRiskSubscriptions.reduce((sum, sub) => {
    if (sub.interval === "month") {
      return sum + (sub.price_cents || 0);
    } else if (sub.interval === "year") {
      return sum + ((sub.price_cents || 0) / 12);
    }
    return sum;
  }, 0);

  const totalActiveMembers = activeSubscriptions.length;
  const totalCourseEnrollments = regularCourses.reduce((sum, c) => sum + c.activeEnrollments, 0);

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/analytics">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Analytics
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enrollment Analytics</h1>
        <p className="text-muted-foreground">
          Course enrollments, membership stats, and revenue metrics
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(monthlyMRR / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {activeSubscriptions.length} active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveMembers}</div>
            <p className="text-xs text-muted-foreground">
              Membership subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course Enrollments</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourseEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              Across {regularCourses.length} courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${(potentialChurn / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {atRiskSubscriptions.length} canceling at period end
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Memberships Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Memberships
          </h2>
        </div>
        
        {memberships.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No memberships created yet. Create a membership product to start tracking subscribers.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memberships.map((membership) => (
              <Card key={membership.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{membership.title}</CardTitle>
                  <CardDescription>
                    {membership.price_cents ? `$${(membership.price_cents / 100).toFixed(2)}/mo` : "Free"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Members</span>
                      <span className="font-semibold">{membership.activeEnrollments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Signups</span>
                      <span className="font-semibold">{membership.totalEnrollments}</span>
                    </div>
                    <Badge variant={membership.status === "published" ? "success" : "secondary"}>
                      {membership.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Individual Courses Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Course Enrollments
          </h2>
        </div>

        {regularCourses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No courses created yet.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Course</th>
                  <th className="text-right p-4 font-medium">Price</th>
                  <th className="text-right p-4 font-medium">Active</th>
                  <th className="text-right p-4 font-medium">Total</th>
                  <th className="text-right p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {regularCourses.map((course) => (
                  <tr key={course.id} className="border-t">
                    <td className="p-4">
                      <div className="font-medium">{course.title}</div>
                      <div className="text-xs text-muted-foreground">/{course.slug}</div>
                    </td>
                    <td className="p-4 text-right">
                      {course.price_cents ? `$${(course.price_cents / 100).toFixed(2)}` : "Free"}
                    </td>
                    <td className="p-4 text-right font-semibold">{course.activeEnrollments}</td>
                    <td className="p-4 text-right text-muted-foreground">{course.totalEnrollments}</td>
                    <td className="p-4 text-right">
                      <Badge variant={course.status === "published" ? "success" : "secondary"}>
                        {course.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Renewal Timeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Renewals (Next 30 Days)
          </h2>
        </div>

        {upcomingRenewals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No renewals coming up in the next 30 days.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Member</th>
                  <th className="text-left p-4 font-medium">Renewal Date</th>
                  <th className="text-right p-4 font-medium">Amount</th>
                  <th className="text-right p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingRenewals.map((sub) => {
                  const renewalDate = new Date(sub.current_period_end);
                  const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const user = sub.user as any;
                  
                  return (
                    <tr key={sub.id} className="border-t">
                      <td className="p-4">
                        <div className="font-medium">{user?.full_name || user?.email || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{user?.email}</div>
                      </td>
                      <td className="p-4">
                        <div>{renewalDate.toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                        </div>
                      </td>
                      <td className="p-4 text-right font-semibold">
                        ${((sub.price_cents || 0) / 100).toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        {sub.cancel_at_period_end ? (
                          <Badge variant="destructive">Canceling</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* At-Risk Subscriptions */}
      {atRiskSubscriptions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-orange-600">
              <TrendingUp className="h-5 w-5" />
              At-Risk Subscriptions
            </h2>
          </div>

          <div className="rounded-xl border border-orange-200 overflow-hidden bg-orange-50/50">
            <table className="w-full text-sm">
              <thead className="bg-orange-100/50">
                <tr>
                  <th className="text-left p-4 font-medium">Member</th>
                  <th className="text-left p-4 font-medium">Cancels On</th>
                  <th className="text-right p-4 font-medium">Monthly Value</th>
                </tr>
              </thead>
              <tbody>
                {atRiskSubscriptions.map((sub) => {
                  const cancelDate = new Date(sub.current_period_end);
                  const user = sub.user as any;
                  const monthlyValue = sub.interval === "year" 
                    ? (sub.price_cents || 0) / 12 
                    : (sub.price_cents || 0);
                  
                  return (
                    <tr key={sub.id} className="border-t border-orange-200">
                      <td className="p-4">
                        <div className="font-medium">{user?.full_name || user?.email || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{user?.email}</div>
                      </td>
                      <td className="p-4">
                        {cancelDate.toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right font-semibold text-orange-600">
                        ${(monthlyValue / 100).toFixed(2)}/mo
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
