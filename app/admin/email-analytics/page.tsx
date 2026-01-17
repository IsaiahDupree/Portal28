import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEmailStats, getEmailTemplates } from "@/lib/email/analytics";
import { TemplateFilter } from "./TemplateFilter";

export default async function EmailAnalyticsPage({
  searchParams
}: {
  searchParams: { template?: string };
}) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/app");

  // Get template filter from query params
  const templateFilter = searchParams.template || "all";

  // Get overall aggregate stats (filtered by template if specified)
  const aggregateStats = await getEmailStats(templateFilter);

  // Get list of all templates for filter dropdown
  const templates = await getEmailTemplates();

  // Get program stats
  const { data: programs } = await supabase
    .from("email_programs")
    .select(`
      id, name, status, type,
      email_program_stats (
        total_sends, total_delivered, total_opened, total_clicked,
        total_human_clicked, total_replied, total_bounced,
        open_rate, click_rate, human_click_rate, reply_rate,
        attributed_revenue_cents, attributed_orders
      )
    `)
    .order("created_at", { ascending: false });

  // Get recent events
  const { data: recentEvents } = await supabase
    .from("email_events")
    .select("id, email, event_type, clicked_link, is_suspected_bot, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Get top engaged contacts
  const { data: topContacts } = await supabase
    .from("contact_engagement")
    .select("email, engagement_score, total_opens, total_clicks, total_replies, last_engaged_at")
    .order("engagement_score", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Analytics</h1>
          <p className="text-muted-foreground">
            Track email performance, engagement, and deliverability
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/admin/email-programs">Email Programs</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">← Admin</Link>
          </Button>
        </div>
      </div>

      {/* Template Filter */}
      <TemplateFilter templates={templates} currentTemplate={templateFilter} />

      {/* Aggregate Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.total_sends.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {aggregateStats.total_delivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregateStats.open_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {aggregateStats.total_opened} opened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregateStats.click_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {aggregateStats.total_human_clicked} human clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregateStats.bounce_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {aggregateStats.total_bounced} bounced
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Program Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Program Performance</CardTitle>
          <CardDescription>Detailed metrics for each email program</CardDescription>
        </CardHeader>
        <CardContent>
          {!programs || programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No programs yet. <Link href="/admin/email-programs/new" className="text-primary hover:underline">Create one</Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Program</th>
                    <th className="text-right p-3 font-medium">Delivered</th>
                    <th className="text-right p-3 font-medium">Open Rate</th>
                    <th className="text-right p-3 font-medium">Click Rate</th>
                    <th className="text-right p-3 font-medium">Human Clicks</th>
                    <th className="text-right p-3 font-medium">Reply Rate</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((program) => {
                    const stats = Array.isArray(program.email_program_stats)
                      ? program.email_program_stats[0]
                      : program.email_program_stats;
                    return (
                      <tr key={program.id} className="border-b">
                        <td className="p-3">
                          <Link
                            href={`/admin/email-analytics/programs/${program.id}`}
                            className="font-medium hover:underline"
                          >
                            {program.name}
                          </Link>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            program.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {program.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">{stats?.total_delivered || 0}</td>
                        <td className="p-3 text-right">
                          <span className={(stats?.open_rate || 0) > 0.2 ? "text-green-600 font-medium" : ""}>
                            {((stats?.open_rate || 0) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {((stats?.click_rate || 0) * 100).toFixed(1)}%
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-green-600 font-medium">
                            {((stats?.human_click_rate || 0) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={(stats?.reply_rate || 0) > 0 ? "text-blue-600" : ""}>
                            {((stats?.reply_rate || 0) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          ${((stats?.attributed_revenue_cents || 0) / 100).toFixed(2)}
                          {stats?.attributed_orders > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({stats.attributed_orders} orders)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest email events and interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentEvents || recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-md border-l-4 ${
                      event.is_suspected_bot ? "bg-yellow-50" : "bg-muted"
                    }`}
                    style={{ borderLeftColor: getEventColor(event.event_type) }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium capitalize">{event.event_type}</span>
                        {event.is_suspected_bot && (
                          <span className="ml-2 text-xs text-yellow-800">🤖 Bot</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <Link
                      href={`/admin/email-analytics/contacts/${encodeURIComponent(event.email)}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {event.email}
                    </Link>
                    {event.clicked_link && (
                      <p className="mt-1 text-xs text-muted-foreground break-all">
                        → {event.clicked_link}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Engaged Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Engaged Contacts</CardTitle>
            <CardDescription>Most active email recipients</CardDescription>
          </CardHeader>
          <CardContent>
            {!topContacts || topContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No engagement data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm">
                      <th className="text-left p-2 font-medium">Contact</th>
                      <th className="text-right p-2 font-medium">Score</th>
                      <th className="text-right p-2 font-medium">Opens</th>
                      <th className="text-right p-2 font-medium">Clicks</th>
                      <th className="text-right p-2 font-medium">Replies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topContacts.map((contact) => (
                      <tr key={contact.email} className="border-b">
                        <td className="p-2">
                          <Link
                            href={`/admin/email-analytics/contacts/${encodeURIComponent(contact.email)}`}
                            className="text-sm hover:underline"
                          >
                            {contact.email}
                          </Link>
                        </td>
                        <td className="p-2 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            contact.engagement_score >= 20
                              ? "bg-green-100 text-green-800"
                              : contact.engagement_score >= 10
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {contact.engagement_score}
                          </span>
                        </td>
                        <td className="p-2 text-right text-sm">{contact.total_opens}</td>
                        <td className="p-2 text-right text-sm">{contact.total_clicks}</td>
                        <td className="p-2 text-right text-sm">{contact.total_replies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case "delivered": return "#28a745";
    case "opened": return "#17a2b8";
    case "clicked": return "#007bff";
    case "replied": return "#6f42c1";
    case "bounced": return "#dc3545";
    case "complained": return "#dc3545";
    case "unsubscribed": return "#ffc107";
    default: return "#6c757d";
  }
}
