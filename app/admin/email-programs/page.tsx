import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EmailProgramsPage() {
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

  const { data: programs } = await supabase
    .from("email_programs")
    .select(`
      id, name, type, status, schedule_text, audience_type,
      next_run_at, last_run_at, created_at
    `)
    .order("created_at", { ascending: false });

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Email Programs</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/admin">← Admin</Link>
          <Link
            href="/admin/email-programs/new"
            style={{
              backgroundColor: "#111",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14
            }}
          >
            + New Program
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 24, padding: 16, backgroundColor: "#f0f7ff", borderRadius: 8 }}>
        <strong>📧 Email Scheduler</strong>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#444" }}>
          Create scheduled newsletters and campaigns. Use natural language like "Friday at 3pm ET".
          Programs require approval before sending.
        </p>
      </div>

      {!programs || programs.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <p style={{ margin: 0, color: "#666" }}>No email programs yet.</p>
          <Link href="/admin/email-programs/new" style={{ color: "#111", fontWeight: 500 }}>
            Create your first program →
          </Link>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Name</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Type</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Schedule</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Audience</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Status</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Next Run</th>
              <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((program) => (
              <tr key={program.id}>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                  <strong>{program.name}</strong>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    backgroundColor: program.type === "broadcast" ? "#e3f2fd" : "#fff3e0",
                    color: program.type === "broadcast" ? "#1565c0" : "#e65100"
                  }}>
                    {program.type}
                  </span>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", color: "#666", fontSize: 14 }}>
                  {program.schedule_text || "—"}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", fontSize: 14 }}>
                  {program.audience_type}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor:
                      program.status === "active" ? "#d4edda" :
                      program.status === "paused" ? "#fff3cd" :
                      program.status === "draft" ? "#e2e3e5" : "#f8d7da",
                    color:
                      program.status === "active" ? "#155724" :
                      program.status === "paused" ? "#856404" :
                      program.status === "draft" ? "#383d41" : "#721c24"
                  }}>
                    {program.status}
                  </span>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", color: "#666", fontSize: 13 }}>
                  {program.next_run_at
                    ? new Date(program.next_run_at).toLocaleString()
                    : "—"}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                  <Link
                    href={`/admin/email-programs/${program.id}`}
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
        <Link href="/admin/email-automations" style={{ color: "#666" }}>
          → Manage Automations (drip sequences)
        </Link>
      </div>
    </main>
  );
}
