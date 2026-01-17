import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AutomationEditor } from "./AutomationEditor";

export default async function AutomationEditorPage({ params }: { params: { id: string } }) {
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

  const { data: automation } = await supabase
    .from("email_automations")
    .select(`
      *,
      automation_steps(*)
    `)
    .eq("id", params.id)
    .single();

  if (!automation) {
    redirect("/admin/email-automations");
  }

  // Sort steps by step_order
  const sortedSteps = Array.isArray(automation.automation_steps)
    ? automation.automation_steps.sort((a: any, b: any) => a.step_order - b.step_order)
    : [];

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/email-automations">← Back to Automations</Link>
      </div>

      <AutomationEditor automation={{ ...automation, automation_steps: sortedSteps }} />
    </main>
  );
}
