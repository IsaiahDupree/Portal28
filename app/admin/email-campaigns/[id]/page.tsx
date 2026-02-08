import { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Edit Campaign | Admin",
  description: "Edit email campaign"
};

async function checkAdmin() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return user;
}

export default async function EditCampaignPage({
  params
}: {
  params: { id: string };
}) {
  await checkAdmin();

  const { data: campaign } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!campaign) {
    redirect("/admin/email-campaigns");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Campaign: {campaign.name}</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-500">Status:</span>
            <span className="ml-2 px-3 py-1 rounded-full text-sm bg-gray-100">
              {campaign.status}
            </span>
          </div>

          <div>
            <span className="text-sm text-gray-500">Subject:</span>
            <p className="font-medium">{campaign.subject}</p>
          </div>

          <div>
            <span className="text-sm text-gray-500">Segment:</span>
            <p className="font-medium">{campaign.segment_type}</p>
          </div>

          {campaign.total_recipients > 0 && (
            <div>
              <span className="text-sm text-gray-500">Recipients:</span>
              <p className="font-medium">{campaign.total_recipients}</p>
            </div>
          )}

          <p className="text-gray-500 mt-4">
            Edit form will be implemented as a client component.
          </p>
        </div>
      </div>
    </div>
  );
}
