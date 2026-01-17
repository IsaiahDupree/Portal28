"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type Message = {
  id: string;
  channel_id: string;
  user_id: string;
  body: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
};

type Channel = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

type Reaction = {
  emoji: string;
  count: number;
  users: string[];
};

type Props = {
  channelId: string;
  channelSlug: string;
  channels: Channel[];
  userId: string;
};

export default function ChatChannelView({
  channelId,
  channelSlug,
  channels,
  userId,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Load initial messages
  useEffect(() => {
    loadMessages();
  }, [channelId]);

  // Subscribe to new messages
  useEffect(() => {
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
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_reactions",
        },
        () => {
          // Reload reactions when they change
          loadReactions();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_typing",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const typingUserId = (payload.new as any).user_id;
            if (typingUserId !== userId) {
              setTypingUsers((prev) => {
                const uniqueSet = new Set([...prev, typingUserId]);
                return Array.from(uniqueSet);
              });
              // Remove after 5 seconds
              setTimeout(() => {
                setTypingUsers((prev) => prev.filter((id) => id !== typingUserId));
              }, 5000);
            }
          } else if (payload.eventType === "DELETE") {
            const typingUserId = (payload.old as any).user_id;
            setTypingUsers((prev) => prev.filter((id) => id !== typingUserId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, userId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/chat/${channelId}/messages?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadReactions = async () => {
    // Load reactions for all visible messages
    const messageIds = messages.map((m) => m.id);
    // For now, we'll just refetch when reactions change
    // In production, you'd want a more efficient approach
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/community/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          body: newMessage.trim(),
        }),
      });

      if (res.ok) {
        setNewMessage("");
        // Clear typing indicator
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    // Send typing indicator
    fetch("/api/community/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    }).catch((err) => console.error("Error updating typing:", err));

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to clear typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      // Typing stopped
    }, 3000);
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch("/api/community/chat/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Channel list sidebar */}
      <div className="w-48 border-r bg-gray-50 p-2 space-y-1">
        <h3 className="text-xs uppercase font-semibold text-gray-500 px-2 mb-2">
          Channels
        </h3>
        {channels.map((ch) => (
          <Link
            key={ch.id}
            href={`/app/community/chat/${ch.slug}`}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
              ch.slug === channelSlug
                ? "bg-blue-100 text-blue-900 font-semibold"
                : "hover:bg-gray-100"
            }`}
          >
            <span>{ch.icon}</span>
            <span>{ch.name}</span>
          </Link>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p>No messages yet. Be the first to say something!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {msg.user_id.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">
                      {msg.user_id === userId ? "You" : `User ${msg.user_id.substring(0, 8)}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                    {msg.is_edited && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{msg.body}</p>
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={() => addReaction(msg.id, "👍")}
                      className="text-sm px-2 py-1 rounded hover:bg-gray-100"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => addReaction(msg.id, "❤️")}
                      className="text-sm px-2 py-1 rounded hover:bg-gray-100"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => addReaction(msg.id, "🔥")}
                      className="text-sm px-2 py-1 rounded hover:bg-gray-100"
                    >
                      🔥
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-500 italic">
            {typingUsers.length === 1
              ? "Someone is typing..."
              : `${typingUsers.length} people are typing...`}
          </div>
        )}

        {/* Message input */}
        <div className="border-t p-4">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
