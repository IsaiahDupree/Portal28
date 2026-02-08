import { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "New Campaign | Admin",
  description: "Create a new email campaign"
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

export default async function NewCampaignPage() {
  await checkAdmin();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Email Campaign</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Campaign Details</h2>
            <p className="text-gray-500">
              Campaign builder form will be implemented as a client component.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Basic info (name, subject)</li>
              <li>Select segment (all, leads, customers, course students)</li>
              <li>Build template (HTML editor with preview)</li>
              <li>Review and send (test email, schedule, or send now)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
