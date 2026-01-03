import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ProgramEditor from "./ProgramEditor";
import PromptStudio from "./PromptStudio";
import VersionHistory from "./VersionHistory";

interface Props {
  params: { id: string };
}

export default async function EditEmailProgramPage({ params }: Props) {
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

  const { data: program } = await supabase
    .from("email_programs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!program) notFound();

  const { data: versions } = await supabase
    .from("email_versions")
    .select("*")
    .eq("program_id", params.id)
    .order("version_number", { ascending: false });

  const { data: runs } = await supabase
    .from("email_runs")
    .select("*")
    .eq("program_id", params.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/admin/email-programs">← Back to Programs</Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            padding: "4px 12px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor:
              program.status === "active" ? "#d4edda" :
              program.status === "paused" ? "#fff3cd" : "#e2e3e5",
            color:
              program.status === "active" ? "#155724" :
              program.status === "paused" ? "#856404" : "#383d41"
          }}>
            {program.status.toUpperCase()}
          </span>
        </div>
      </div>

      <h1 style={{ marginBottom: 8 }}>{program.name}</h1>
      {program.description && (
        <p style={{ color: "#666", marginBottom: 24 }}>{program.description}</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <section>
          <h2>Program Settings</h2>
          <ProgramEditor program={program} />

          <h2 style={{ marginTop: 32 }}>Recent Runs</h2>
          {!runs || runs.length === 0 ? (
            <p style={{ color: "#666" }}>No runs yet</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Scheduled</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Status</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Recipients</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {new Date(run.scheduled_for).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 11,
                        backgroundColor: run.status === "sent" ? "#d4edda" : "#f8d7da"
                      }}>
                        {run.status}
                      </span>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {run.recipient_count || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>Prompt Studio</h2>
          <PromptStudio
            programId={program.id}
            currentVersion={versions?.[0] || null}
            promptBase={program.prompt_base}
          />

          <h2 style={{ marginTop: 32 }}>Version History</h2>
          <VersionHistory programId={program.id} versions={versions || []} />
        </section>
      </div>
    </main>
  );
}
