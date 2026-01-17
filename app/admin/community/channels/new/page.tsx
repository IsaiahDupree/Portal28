import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ChatChannelForm from "@/components/admin/ChatChannelForm";
import Link from "next/link";

export default async function NewChannelPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login?next=/admin/community/channels/new");

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") redirect("/app");

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create Chat Channel</h1>
        <Link href="/admin/community" className="text-sm text-gray-600 hover:text-black">
          ← Back
        </Link>
      </div>
      <ChatChannelForm />
    </main>
  );
}
