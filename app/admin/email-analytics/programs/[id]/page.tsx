import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

interface Props {
  params: { id: string };
}

export default async function ProgramAnalyticsPage({ params }: Props) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/app");

  // Get program with stats
  const { data: program } = await supabase
    .from("email_programs")
    .select(`
      *,
      email_program_stats (*)
    `)
    .eq("id", params.id)
    .single();

  if (!program) notFound();

  const stats = Array.isArray(program.email_program_stats)
    ? program.email_program_stats[0]
    : program.email_program_stats;

  // Get sends for this program
  const { data: sends } = await supabase
    .from("email_sends")
    .select("id, email, status, open_count, click_count, human_click_count, created_at")
    .eq("program_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get events for link analysis
  const { data: clickEvents } = await supabase
    .from("email_events")
    .select("clicked_link, is_suspected_bot")
    .eq("event_type", "clicked")
    .not("clicked_link", "is", null)
    .limit(500);

  // Aggregate link clicks
  const linkStats: Record<string, { total: number; human: number; bot: number }> = {};
  clickEvents?.forEach((event) => {
    if (!event.clicked_link) return;
    if (!linkStats[event.clicked_link]) {
      linkStats[event.clicked_link] = { total: 0, human: 0, bot: 0 };
    }
    linkStats[event.clicked_link].total++;
    if (event.is_suspected_bot) {
      linkStats[event.clicked_link].bot++;
    } else {
      linkStats[event.clicked_link].human++;
    }
  });

  const sortedLinks = Object.entries(linkStats)
    .sort((a, b) => b[1].human - a[1].human)
    .slice(0, 10);

  // Get recent runs
  const { data: recentRuns } = await supabase
    .from("email_runs")
    .select("id, status, recipients_count, delivered_count, opened_count, clicked_count, started_at")
    .eq("program_id", params.id)
    .order("started_at", { ascending: false })
    .limit(10);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/email-analytics">← Back to Analytics</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>{program.name}</h1>
          <p style={{ color: "#666", margin: 0 }}>{program.description}</p>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <span style={{
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 12,
              backgroundColor: program.status === "active" ? "#d4edda" : "#e2e3e5",
              color: program.status === "active" ? "#155724" : "#383d41"
            }}>
              {program.status}
            </span>
            <span style={{
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 12,
              backgroundColor: "#e3f2fd",
              color: "#1565c0"
            }}>
              {program.type}
            </span>
          </div>
        </div>
        <Link
          href={`/admin/email-programs/${program.id}`}
          style={{ padding: "8px 16px", backgroundColor: "#111", color: "#fff", borderRadius: 6, textDecoration: "none" }}
        >
          Edit Program →
        </Link>
      </div>

      {/* Stats Overview */}
      <section style={{ marginBottom: 32 }}>
        <h2>Performance Overview</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
          <StatCard
            label="Delivered"
            value={stats?.total_delivered || 0}
            subValue={`${((stats?.delivery_rate || 0) * 100).toFixed(1)}% of sent`}
          />
          <StatCard
            label="Opened"
            value={stats?.total_opened || 0}
            subValue={`${((stats?.open_rate || 0) * 100).toFixed(1)}% open rate`}
            color="#17a2b8"
          />
          <StatCard
            label="Clicked"
            value={stats?.total_clicked || 0}
            subValue={`${((stats?.click_rate || 0) * 100).toFixed(1)}% click rate`}
            color="#007bff"
          />
          <StatCard
            label="Human Clicks"
            value={stats?.total_human_clicked || 0}
            subValue={`${((stats?.human_click_rate || 0) * 100).toFixed(1)}% human rate`}
            color="#28a745"
          />
          <StatCard
            label="Replied"
            value={stats?.total_replied || 0}
            subValue={`${((stats?.reply_rate || 0) * 100).toFixed(1)}% reply rate`}
            color="#6f42c1"
          />
          <StatCard
            label="Bounced"
            value={stats?.total_bounced || 0}
            subValue={`${((stats?.bounce_rate || 0) * 100).toFixed(1)}% bounce rate`}
            color="#dc3545"
          />
        </div>
      </section>

      {/* Bot noise warning */}
      {stats?.suspected_bot_clicks > 0 && (
        <div style={{
          padding: 16,
          marginBottom: 32,
          backgroundColor: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: 8
        }}>
          <strong>🤖 Bot Click Detection</strong>
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>
            {stats.suspected_bot_clicks} clicks detected as likely bots (security scanners, link prefetchers).
            Human click rate ({((stats?.human_click_rate || 0) * 100).toFixed(1)}%) is the metric to optimize against.
          </p>
        </div>
      )}

      {/* Revenue Attribution */}
      {(stats?.attributed_revenue_cents > 0 || stats?.attributed_orders > 0) && (
        <section style={{ marginBottom: 32 }}>
          <h2>Revenue Attribution</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div style={{ padding: 24, backgroundColor: "#d4edda", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#155724" }}>
                ${((stats?.attributed_revenue_cents || 0) / 100).toLocaleString()}
              </div>
              <div style={{ color: "#155724" }}>Attributed Revenue</div>
            </div>
            <div style={{ padding: 24, backgroundColor: "#e3f2fd", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#1565c0" }}>
                {stats?.attributed_orders || 0}
              </div>
              <div style={{ color: "#1565c0" }}>Orders</div>
            </div>
            <div style={{ padding: 24, backgroundColor: "#f5f5f5", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700 }}>
                ${stats?.attributed_orders ? ((stats.attributed_revenue_cents / stats.attributed_orders) / 100).toFixed(2) : "0"}
              </div>
              <div style={{ color: "#666" }}>Avg Order Value</div>
            </div>
          </div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Top Links */}
        <section>
          <h2>Top Clicked Links</h2>
          {sortedLinks.length === 0 ? (
            <p style={{ color: "#666" }}>No link clicks recorded yet</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #ddd", fontSize: 13 }}>Link</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "2px solid #ddd", fontSize: 13 }}>Human</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "2px solid #ddd", fontSize: 13 }}>Bot</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "2px solid #ddd", fontSize: 13 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedLinks.map(([link, counts]) => (
                  <tr key={link}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", fontSize: 12, wordBreak: "break-all", maxWidth: 300 }}>
                      {link}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right", color: "#28a745", fontWeight: 500 }}>
                      {counts.human}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right", color: "#856404" }}>
                      {counts.bot}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                      {counts.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Recent Runs */}
        <section>
          <h2>Recent Runs</h2>
          {!recentRuns || recentRuns.length === 0 ? (
            <p style={{ color: "#666" }}>No runs yet</p>
          ) : (
            <div>
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    backgroundColor: "#f8f9fa",
                    borderRadius: 6,
                    borderLeft: `4px solid ${run.status === "completed" ? "#28a745" : run.status === "failed" ? "#dc3545" : "#ffc107"}`
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{new Date(run.started_at).toLocaleDateString()}</span>
                    <span style={{ fontSize: 12, color: "#666" }}>{run.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    {run.recipients_count} recipients • {run.delivered_count} delivered • {run.opened_count} opened • {run.clicked_count} clicked
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Sends */}
      <section style={{ marginTop: 32 }}>
        <h2>Recent Sends</h2>
        {!sends || sends.length === 0 ? (
          <p style={{ color: "#666" }}>No sends yet</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Recipient</th>
                <th style={{ textAlign: "center", padding: 12, borderBottom: "2px solid #ddd" }}>Status</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Opens</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Clicks</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Human Clicks</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Sent</th>
              </tr>
            </thead>
            <tbody>
              {sends.map((send) => (
                <tr key={send.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    <Link href={`/admin/email-analytics/contacts/${encodeURIComponent(send.email)}`}>
                      {send.email}
                    </Link>
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "center" }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      backgroundColor: getStatusColor(send.status),
                      color: "#fff"
                    }}>
                      {send.status}
                    </span>
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                    {send.open_count || 0}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                    {send.click_count || 0}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right", color: "#28a745", fontWeight: 500 }}>
                    {send.human_click_count || 0}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right", fontSize: 13, color: "#666" }}>
                    {new Date(send.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, subValue, color = "#333" }: { 
  label: string; 
  value: number; 
  subValue?: string;
  color?: string;
}) {
  return (
    <div style={{
      padding: 20,
      backgroundColor: "#fff",
      border: "1px solid #ddd",
      borderRadius: 8,
      textAlign: "center"
    }}>
      <div style={{ fontSize: 28, fontWeight: 600, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{label}</div>
      {subValue && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{subValue}</div>}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "delivered": return "#28a745";
    case "sent": return "#17a2b8";
    case "bounced": return "#dc3545";
    case "complained": return "#dc3545";
    case "failed": return "#dc3545";
    default: return "#6c757d";
  }
}
