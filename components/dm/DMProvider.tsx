'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface DMThread {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  other_user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

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

interface DMContextType {
  threads: DMThread[];
  unreadCount: number;
  isLoading: boolean;
  sendMessage: (threadId: string, content: string) => Promise<DMMessage | null>;
  createThread: (recipientId: string, initialMessage?: string) => Promise<DMThread | null>;
  refreshThreads: () => Promise<void>;
}

const DMContext = createContext<DMContextType | null>(null);

export function useDM() {
  const context = useContext(DMContext);
  if (!context) {
    throw new Error('useDM must be used within DMProvider');
  }
  return context;
}

interface DMProviderProps {
  children: React.ReactNode;
}

export function DMProvider({ children }: DMProviderProps) {
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    initializeDM();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  async function initializeDM() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    setUserId(user.id);

    // Fetch initial data
    await Promise.all([fetchThreads(), fetchUnreadCount()]);

    // Subscribe to realtime updates
    const realtimeChannel = supabaseClient
      .channel('dm_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
        },
        (payload) => {
          // Refresh threads when new message arrives
          fetchThreads();
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dm_messages',
        },
        (payload) => {
          // Update unread count when message is marked as read
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_threads',
        },
        (payload) => {
          fetchThreads();
        }
      )
      .subscribe();

    setChannel(realtimeChannel);
    setIsLoading(false);
  }

  async function fetchThreads() {
    const response = await fetch('/api/dm/threads');
    if (response.ok) {
      const data = await response.json();
      setThreads(data.threads || []);
    }
  }

  async function fetchUnreadCount() {
    const response = await fetch('/api/dm/unread');
    if (response.ok) {
      const data = await response.json();
      setUnreadCount(data.unreadCount || 0);
    }
  }

  async function sendMessage(threadId: string, content: string): Promise<DMMessage | null> {
    const response = await fetch(`/api/dm/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.message;
    }

    return null;
  }

  async function createThread(recipientId: string, initialMessage?: string): Promise<DMThread | null> {
    const response = await fetch('/api/dm/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId, initialMessage }),
    });

    if (response.ok) {
      const data = await response.json();
      await fetchThreads();
      return data.thread;
    }

    return null;
  }

  async function refreshThreads() {
    await Promise.all([fetchThreads(), fetchUnreadCount()]);
  }

  return (
    <DMContext.Provider
      value={{
        threads,
        unreadCount,
        isLoading,
        sendMessage,
        createThread,
        refreshThreads,
      }}
    >
      {children}
    </DMContext.Provider>
  );
}
