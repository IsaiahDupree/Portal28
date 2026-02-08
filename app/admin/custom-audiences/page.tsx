/**
 * Custom Audiences Admin Page
 * META-007: Configure custom audiences based on user behavior
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AudiencesList } from "@/components/admin/custom-audiences/AudiencesList";

export default async function CustomAudiencesPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/admin/custom-audiences");
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    redirect("/app");
  }

  const { data: audiences } = await supabase
    .from("custom_audiences")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-black">
            ← Admin
          </Link>
          <h1 className="text-2xl font-semibold mt-1">Meta Custom Audiences</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and sync custom audiences to Meta for targeted advertising
          </p>
        </div>
        <Link
          href="/admin/custom-audiences/new"
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Create Audience
        </Link>
      </div>

      {!audiences || audiences.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center space-y-4">
          <div className="text-4xl">📊</div>
          <div>
            <h3 className="font-medium text-lg mb-1">No custom audiences yet</h3>
            <p className="text-gray-600 text-sm mb-4">
              Create your first custom audience to start retargeting users on Meta.
            </p>
            <Link
              href="/admin/custom-audiences/new"
              className="inline-block px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Create First Audience
            </Link>
          </div>
        </div>
      ) : (
        <AudiencesList initialAudiences={audiences} />
      )}
    </main>
  );
}
