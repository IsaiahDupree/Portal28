"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Widget = {
  key: string;
  name: string;
  nav_label: string | null;
  saleswall_config: Record<string, any> | null;
};

export default function ChatApp({ widget }: { widget: Widget }) {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const defaultChannel = widget.saleswall_config?.defaultChannelSlug ?? "general";

  const [channels, setChannels] = useState<any[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: space } = await supabase
        .from("community_spaces")
        .select("id")
        .eq("slug", "portal28")
        .single();

      if (!space) return;

      const { data: chs } = await supabase
        .from("chat_channels")
        .select("id,slug,name")
        .eq("space_id", space.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      setChannels(chs ?? []);

      const chosen = (chs ?? []).find((c) => c.slug === defaultChannel) ?? (chs ?? [])[0];
      if (chosen) setChannelId(chosen.id);
    })();
  }, [defaultChannel, supabase]);

  useEffect(() => {
    if (!channelId) return;

    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id,body,author_user_id,created_at")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!mounted) return;
      setMessages((data ?? []).reverse());
    })();

    const channel = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase]);

  async function send() {
    if (!channelId || !body.trim()) return;

    setSending(true);
    const { data: auth } = await supabase.auth.getUser();

    const { error } = await supabase.from("chat_messages").insert({
      channel_id: channelId,
      body: body.trim(),
      author_user_id: auth.user?.id,
    });

    setSending(false);
    if (!error) setBody("");
  }

  return (
    <div className="grid grid-cols-[220px_1fr] gap-4 h-[calc(100vh-180px)]">
      <aside className="rounded-xl border p-4 space-y-2 overflow-auto">
        <div className="font-semibold mb-3">{widget.nav_label ?? widget.name}</div>
        {channels.map((c) => (
          <button
            key={c.id}
            onClick={() => setChannelId(c.id)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              c.id === channelId
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            # {c.name}
          </button>
        ))}
      </aside>

      <section className="rounded-xl border flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((m: any) => (
              <div key={m.id} className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">
                  {new Date(m.created_at).toLocaleString()}
                </div>
                <div className="mt-1">{m.body}</div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Type a message..."
          />
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </section>
    </div>
  );
}
