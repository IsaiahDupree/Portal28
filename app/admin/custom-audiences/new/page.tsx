/**
 * Create New Custom Audience Page
 * META-007: Form to create a new custom audience
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CreateAudienceForm } from "@/components/admin/custom-audiences/CreateAudienceForm";

export default async function NewCustomAudiencePage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/custom-audiences/new");
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/custom-audiences"
          className="text-sm text-gray-600 hover:text-black"
        >
          ← Custom Audiences
        </Link>
        <h1 className="text-2xl font-semibold mt-1">Create Custom Audience</h1>
        <p className="text-sm text-gray-600 mt-1">
          Define a new audience segment to sync with Meta for targeted ads
        </p>
      </div>

      <CreateAudienceForm />
    </main>
  );
}
