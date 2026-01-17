import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getDefaultSpace, getChatChannels } from "@/lib/community/queries";

export default async function ChatPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=/app/community/chat");
  }

  const space = await getDefaultSpace();
  if (!space) {
    return (
      <div className="p-6">
        <p className="text-red-500">Community space not found</p>
      </div>
    );
  }

  const channels = await getChatChannels(space.id);

  if (channels.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Chat</h1>
        <p className="text-gray-600">No chat channels available</p>
      </div>
    );
  }

  // Redirect to first channel
  redirect(`/app/community/chat/${channels[0].slug}`);
}
