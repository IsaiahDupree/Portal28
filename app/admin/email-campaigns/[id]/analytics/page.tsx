import { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Campaign Analytics | Admin",
  description: "View campaign analytics"
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

export default async function CampaignAnalyticsPage({
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
      <h1 className="text-3xl font-bold mb-8">
        Campaign Analytics: {campaign.name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm text-gray-500 mb-2">Total Recipients</h3>
          <p className="text-3xl font-bold">{campaign.total_recipients || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm text-gray-500 mb-2">Delivered</h3>
          <p className="text-3xl font-bold">{campaign.total_delivered || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm text-gray-500 mb-2">Opens</h3>
          <p className="text-3xl font-bold">{campaign.unique_opens || 0}</p>
          <p className="text-sm text-gray-500">
            {campaign.total_delivered > 0
              ? `${((campaign.unique_opens / campaign.total_delivered) * 100).toFixed(1)}% rate`
              : "0% rate"}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm text-gray-500 mb-2">Clicks</h3>
          <p className="text-3xl font-bold">{campaign.unique_clicks || 0}</p>
          <p className="text-sm text-gray-500">
            {campaign.total_delivered > 0
              ? `${((campaign.unique_clicks / campaign.total_delivered) * 100).toFixed(1)}% rate`
              : "0% rate"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">
          Detailed analytics charts will be implemented as client components.
        </p>
      </div>
    </div>
  );
}
