import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

interface Props {
  params: { email: string };
}

export default async function ContactTimelinePage({ params }: Props) {
  const email = decodeURIComponent(params.email);
  
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/app");

  // Get contact info
  const { data: contact } = await supabase
    .from("email_contacts")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  // Get engagement stats
  const { data: engagement } = await supabase
    .from("contact_engagement")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  // Get event timeline
  const { data: events } = await supabase
    .from("email_events")
    .select("id, event_type, clicked_link, is_suspected_bot, user_agent, created_at, raw_payload")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(100);

  // Get threads/messages if any
  const { data: threads } = await supabase
    .from("email_threads")
    .select(`
      id, subject, status, message_count, inbound_count, outbound_count,
      first_message_at, last_message_at
    `)
    .eq("contact_email", email)
    .order("last_message_at", { ascending: false });

  if (!contact && !events?.length) notFound();

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/email-analytics">← Back to Analytics</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>{email}</h1>
          {contact && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {contact.first_name && <span>{contact.first_name} {contact.last_name}</span>}
              <span style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 12,
                backgroundColor: contact.is_customer ? "#d4edda" : "#e3f2fd",
                color: contact.is_customer ? "#155724" : "#1565c0"
              }}>
                {contact.is_customer ? "Customer" : "Lead"}
              </span>
              {contact.suppressed && (
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, backgroundColor: "#f8d7da", color: "#721c24" }}>
                  Suppressed
                </span>
              )}
              {contact.unsubscribed && (
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, backgroundColor: "#fff3cd", color: "#856404" }}>
                  Unsubscribed
                </span>
              )}
            </div>
          )}
        </div>

        {engagement && (
          <div style={{
            padding: 16,
            backgroundColor: "#f8f9fa",
            borderRadius: 8,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#28a745" }}>
              {engagement.engagement_score}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>Engagement Score</div>
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      {engagement && (
        <section style={{ marginBottom: 32 }}>
          <h2>Engagement Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            <StatCard label="Sends" value={engagement.total_sends} />
            <StatCard label="Opens" value={engagement.total_opens} color="#17a2b8" />
            <StatCard label="Clicks" value={engagement.total_human_clicks} color="#007bff" />
            <StatCard label="Replies" value={engagement.total_replies} color="#6f42c1" />
            <StatCard label="Bounces" value={engagement.total_bounces} color="#dc3545" />
          </div>
          
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, fontSize: 13 }}>
            {engagement.first_send_at && (
              <div>
                <strong>First Send:</strong> {new Date(engagement.first_send_at).toLocaleDateString()}
              </div>
            )}
            {engagement.last_engaged_at && (
              <div>
                <strong>Last Engaged:</strong> {new Date(engagement.last_engaged_at).toLocaleDateString()}
              </div>
            )}
            {engagement.first_reply_at && (
              <div>
                <strong>First Reply:</strong> {new Date(engagement.first_reply_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Threads */}
      {threads && threads.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2>Conversations</h2>
          {threads.map((thread) => (
            <div
              key={thread.id}
              style={{
                padding: 12,
                marginBottom: 8,
                backgroundColor: "#f8f9fa",
                borderRadius: 6,
                borderLeft: `4px solid ${thread.status === "open" ? "#28a745" : "#6c757d"}`
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{thread.subject || "(No subject)"}</strong>
                <span style={{ fontSize: 12, color: "#666" }}>{thread.status}</span>
              </div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                {thread.outbound_count} sent · {thread.inbound_count} received
                {thread.last_message_at && (
                  <> · Last: {new Date(thread.last_message_at).toLocaleDateString()}</>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Event Timeline */}
      <section>
        <h2>Activity Timeline</h2>
        {!events || events.length === 0 ? (
          <p style={{ color: "#666" }}>No activity recorded</p>
        ) : (
          <div style={{ position: "relative", paddingLeft: 24 }}>
            {/* Timeline line */}
            <div style={{
              position: "absolute",
              left: 8,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: "#ddd"
            }} />

            {events.map((event, index) => (
              <div
                key={event.id}
                style={{
                  position: "relative",
                  paddingBottom: 16,
                  paddingLeft: 24
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: "absolute",
                  left: -16,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: getEventColor(event.event_type),
                  border: "2px solid #fff",
                  boxShadow: "0 0 0 2px #ddd"
                }} />

                <div style={{
                  padding: 12,
                  backgroundColor: event.is_suspected_bot ? "#fff3cd" : "#f8f9fa",
                  borderRadius: 6
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: getEventColor(event.event_type),
                        color: "#fff"
                      }}>
                        {event.event_type}
                      </span>
                      {event.is_suspected_bot && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: "#856404" }}>🤖 Suspected bot</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>

                  {event.clicked_link && (
                    <p style={{ margin: "8px 0 0", fontSize: 13, wordBreak: "break-all" }}>
                      <strong>Link:</strong> {event.clicked_link}
                    </p>
                  )}

                  {event.user_agent && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#666" }}>
                      {event.user_agent}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, color = "#333" }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      padding: 16,
      backgroundColor: "#fff",
      border: "1px solid #ddd",
      borderRadius: 8,
      textAlign: "center"
    }}>
      <div style={{ fontSize: 24, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
    </div>
  );
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case "sent": return "#6c757d";
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
