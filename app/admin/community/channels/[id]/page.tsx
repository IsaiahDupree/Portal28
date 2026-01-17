import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ChatChannelForm from "@/components/admin/ChatChannelForm";
import Link from "next/link";

type Props = {
  params: { id: string };
};

export default async function EditChannelPage({ params }: Props) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login?next=/admin/community/channels/" + params.id);

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") redirect("/app");

  const { data: channel } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!channel) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Channel Not Found</h1>
        <Link href="/admin/community" className="text-blue-600 hover:underline">
          ← Back to Community Admin
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Chat Channel</h1>
        <Link href="/admin/community" className="text-sm text-gray-600 hover:text-black">
          ← Back
        </Link>
      </div>
      <ChatChannelForm channel={channel} />
    </main>
  );
}
