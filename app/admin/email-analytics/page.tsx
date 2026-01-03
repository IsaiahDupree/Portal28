import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EmailAnalyticsPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/app");

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
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Email Analytics</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/admin/email-programs">Email Programs</Link>
          <Link href="/admin">← Admin</Link>
        </div>
      </div>

      {/* Overview Stats */}
      <section style={{ marginBottom: 32 }}>
        <h2>Program Performance</h2>
        {!programs || programs.length === 0 ? (
          <p style={{ color: "#666" }}>No programs yet. <Link href="/admin/email-programs/new">Create one</Link></p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Program</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Delivered</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Open Rate</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Click Rate</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Human Clicks</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Reply Rate</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => {
                const stats = Array.isArray(program.email_program_stats)
                  ? program.email_program_stats[0]
                  : program.email_program_stats;
                return (
                  <tr key={program.id}>
                    <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                      <Link href={`/admin/email-analytics/programs/${program.id}`} style={{ fontWeight: 500 }}>
                        {program.name}
                      </Link>
                      <span style={{
                        marginLeft: 8,
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 11,
                        backgroundColor: program.status === "active" ? "#d4edda" : "#e2e3e5"
                      }}>
                        {program.status}
                      </span>
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                      {stats?.total_delivered || 0}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                      <span style={{ color: (stats?.open_rate || 0) > 0.2 ? "#28a745" : "#666" }}>
                        {((stats?.open_rate || 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                      {((stats?.click_rate || 0) * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                      <span style={{ color: "#28a745", fontWeight: 500 }}>
                        {((stats?.human_click_rate || 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                      <span style={{ color: (stats?.reply_rate || 0) > 0 ? "#007bff" : "#666" }}>
                        {((stats?.reply_rate || 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                      ${((stats?.attributed_revenue_cents || 0) / 100).toFixed(2)}
                      {stats?.attributed_orders > 0 && (
                        <span style={{ color: "#666", fontSize: 12 }}> ({stats.attributed_orders} orders)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Recent Events */}
        <section>
          <h2>Recent Activity</h2>
          {!recentEvents || recentEvents.length === 0 ? (
            <p style={{ color: "#666" }}>No events yet</p>
          ) : (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    backgroundColor: event.is_suspected_bot ? "#fff3cd" : "#f8f9fa",
                    borderRadius: 6,
                    borderLeft: `4px solid ${getEventColor(event.event_type)}`
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{event.event_type}</span>
                      {event.is_suspected_bot && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: "#856404" }}>🤖 Bot</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <Link
                    href={`/admin/email-analytics/contacts/${encodeURIComponent(event.email)}`}
                    style={{ fontSize: 13, color: "#007bff" }}
                  >
                    {event.email}
                  </Link>
                  {event.clicked_link && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666", wordBreak: "break-all" }}>
                      → {event.clicked_link}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Engaged Contacts */}
        <section>
          <h2>Top Engaged Contacts</h2>
          {!topContacts || topContacts.length === 0 ? (
            <p style={{ color: "#666" }}>No engagement data yet</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd", fontSize: 13 }}>Contact</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #ddd", fontSize: 13 }}>Score</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #ddd", fontSize: 13 }}>Opens</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #ddd", fontSize: 13 }}>Clicks</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #ddd", fontSize: 13 }}>Replies</th>
                </tr>
              </thead>
              <tbody>
                {topContacts.map((contact) => (
                  <tr key={contact.email}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <Link
                        href={`/admin/email-analytics/contacts/${encodeURIComponent(contact.email)}`}
                        style={{ fontSize: 13 }}
                      >
                        {contact.email}
                      </Link>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: contact.engagement_score >= 20 ? "#d4edda" :
                                        contact.engagement_score >= 10 ? "#fff3cd" : "#e2e3e5"
                      }}>
                        {contact.engagement_score}
                      </span>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right", fontSize: 13 }}>
                      {contact.total_opens}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right", fontSize: 13 }}>
                      {contact.total_clicks}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right", fontSize: 13 }}>
                      {contact.total_replies}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
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
