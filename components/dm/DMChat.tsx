'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface DMMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface DMChatProps {
  threadId: string;
  currentUserId: string;
  otherUser: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export function DMChat({ threadId, currentUserId, otherUser }: DMChatProps) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMessages();

    // Subscribe to realtime messages
    const messagesChannel = supabaseClient
      .channel(`dm:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = payload.new as DMMessage;
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_typing',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload: any) => {
          if (payload.new.user_id !== currentUserId) {
            setOtherUserTyping(true);
            setTimeout(() => setOtherUserTyping(false), 3000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'dm_typing',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          setOtherUserTyping(false);
        }
      )
      .subscribe();

    setChannel(messagesChannel);

    return () => {
      messagesChannel.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadMessages() {
    const response = await fetch(`/api/dm/threads/${threadId}/messages`);
    if (response.ok) {
      const data = await response.json();
      setMessages(data.messages || []);
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/dm/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });

      if (response.ok) {
        setNewMessage('');
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }

  async function handleTyping() {
    if (!isTyping) {
      setIsTyping(true);
      await fetch('/api/dm/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId }),
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTyping();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold">
          {otherUser.full_name || otherUser.email}
        </h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-500">No messages yet</p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isOwn
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`mt-1 text-xs ${
                        isOwn ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}

        {/* Typing indicator */}
        {otherUserTyping && (
          <div className="mt-2 text-sm text-gray-500">
            {otherUser.full_name || otherUser.email} is typing...
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 resize-none"
            rows={3}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
