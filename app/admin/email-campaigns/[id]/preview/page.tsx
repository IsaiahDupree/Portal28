import { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Preview Campaign | Admin",
  description: "Preview email campaign"
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

export default async function PreviewCampaignPage({
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
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Preview: {campaign.name}</h1>
        <p className="text-gray-600 mb-8">Subject: {campaign.subject}</p>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Email header preview */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="text-sm">
              <div className="mb-2">
                <span className="text-gray-500">From:</span>{" "}
                <span className="font-medium">Portal28 Academy</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-500">Subject:</span>{" "}
                <span className="font-medium">{campaign.subject}</span>
              </div>
              {campaign.preview_text && (
                <div>
                  <span className="text-gray-500">Preview:</span>{" "}
                  <span className="text-gray-600">{campaign.preview_text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Email content preview */}
          <div
            className="p-6"
            dangerouslySetInnerHTML={{ __html: campaign.html_content }}
          />
        </div>
      </div>
    </div>
  );
}
