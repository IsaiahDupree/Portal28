import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getDefaultSpace,
  getChatChannels,
  getChatChannelBySlug,
  ensureCommunityMember,
} from "@/lib/community/queries";
import ChatChannelView from "./ChatChannelView";

export default async function ChatChannelPage({
  params,
}: {
  params: { channelSlug: string };
}) {
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

  // Ensure user is a member
  await ensureCommunityMember(space.id, auth.user.id);

  const channel = await getChatChannelBySlug(space.id, params.channelSlug);
  if (!channel) {
    return (
      <div className="p-6">
        <p className="text-red-500">Channel not found</p>
      </div>
    );
  }

  const channels = await getChatChannels(space.id);

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{channel.icon}</span>
          <div>
            <h1 className="text-xl font-bold">{channel.name}</h1>
            {channel.description && (
              <p className="text-sm text-gray-600">{channel.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatChannelView
          channelId={channel.id}
          channelSlug={channel.slug}
          channels={channels}
          userId={auth.user.id}
        />
      </div>
    </div>
  );
}
