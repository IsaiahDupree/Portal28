import { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Email Campaigns | Admin",
  description: "Manage batch email campaigns"
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

export default async function EmailCampaignsPage() {
  await checkAdmin();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-gray-600 mt-2">
            Send batch emails to segmented audiences
          </p>
        </div>
        <Link
          href="/admin/email-campaigns/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          New Campaign
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">
          Email campaigns list will be loaded dynamically via client component.
        </p>
      </div>
    </div>
  );
}
