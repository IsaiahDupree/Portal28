import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EmailAutomationsPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  const { data: automations } = await supabase
    .from("email_automations")
    .select(`
      id, name, description, status, trigger_event,
      created_at,
      automation_steps(id)
    `)
    .order("created_at", { ascending: false });

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Email Automations</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/admin">← Admin</Link>
          <Link
            href="/admin/email-automations/new"
            style={{
              backgroundColor: "#111",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14
            }}
          >
            + New Automation
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 24, padding: 16, backgroundColor: "#f0f7ff", borderRadius: 8 }}>
        <strong>⚡ Drip Sequences</strong>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#444" }}>
          Create automated email sequences triggered by events (signup, purchase, etc.).
          Define delays between emails and enroll users automatically.
        </p>
      </div>

      {!automations || automations.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <p style={{ margin: 0, color: "#666" }}>No automations yet.</p>
          <Link href="/admin/email-automations/new" style={{ color: "#111", fontWeight: 500 }}>
            Create your first automation →
          </Link>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Name</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Trigger</th>
              <th style={{ textAlign: "center", padding: 12, borderBottom: "2px solid #ddd" }}>Steps</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Status</th>
              <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {automations.map((automation) => (
              <tr key={automation.id}>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                  <strong>{automation.name}</strong>
                  {automation.description && (
                    <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
                      {automation.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", fontSize: 14 }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    backgroundColor: "#e3f2fd",
                    color: "#1565c0"
                  }}>
                    {automation.trigger_event}
                  </span>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "center", fontSize: 14 }}>
                  {Array.isArray(automation.automation_steps) ? automation.automation_steps.length : 0}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor:
                      automation.status === "active" ? "#d4edda" :
                      automation.status === "paused" ? "#fff3cd" :
                      automation.status === "draft" ? "#e2e3e5" : "#f8d7da",
                    color:
                      automation.status === "active" ? "#155724" :
                      automation.status === "paused" ? "#856404" :
                      automation.status === "draft" ? "#383d41" : "#721c24"
                  }}>
                    {automation.status}
                  </span>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                  <Link
                    href={`/admin/email-automations/${automation.id}`}
                    style={{ color: "#111", textDecoration: "underline" }}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 32 }}>
        <Link href="/admin/email-programs" style={{ color: "#666" }}>
          ← Back to Email Programs
        </Link>
      </div>
    </main>
  );
}
