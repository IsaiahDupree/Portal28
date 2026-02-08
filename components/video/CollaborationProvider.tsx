'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface CollaborationSession {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'locked';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: string;
  session_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  joined_at: string;
  last_seen_at: string;
}

interface Presence {
  id: string;
  session_id: string;
  user_id: string;
  is_active: boolean;
  cursor_position?: any;
  current_section?: string;
  last_activity_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface Edit {
  id: string;
  session_id: string;
  user_id: string;
  operation_type: 'insert' | 'delete' | 'update' | 'replace';
  path: string;
  old_value?: any;
  new_value: any;
  metadata?: any;
  created_at: string;
}

interface Comment {
  id: string;
  session_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  target_path?: string;
  target_timestamp?: number;
  resolved: boolean;
  created_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface CollaborationContextType {
  session: CollaborationSession | null;
  participants: Participant[];
  presences: Presence[];
  edits: Edit[];
  comments: Comment[];
  isConnected: boolean;
  updatePresence: (data: {
    cursorPosition?: any;
    currentSection?: string;
  }) => Promise<void>;
  createEdit: (edit: {
    operationType: Edit['operation_type'];
    path: string;
    oldValue?: any;
    newValue: any;
  }) => Promise<void>;
  createComment: (comment: {
    content: string;
    targetPath?: string;
    targetTimestamp?: number;
    parentId?: string;
  }) => Promise<void>;
  resolveComment: (commentId: string, resolved: boolean) => Promise<void>;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}

interface CollaborationProviderProps {
  sessionId: string;
  children: React.ReactNode;
}

export function CollaborationProvider({ sessionId, children }: CollaborationProviderProps) {
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Fetch initial session data
    fetchSession();
    fetchPresences();
    fetchEdits();
    fetchComments();

    // Subscribe to realtime updates
    const realtimeChannel = supabaseClient.channel(`collaboration:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_collaboration_presence',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setPresences((prev) => {
              const index = prev.findIndex((p) => p.id === payload.new.id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = payload.new as Presence;
                return updated;
              }
              return [...prev, payload.new as Presence];
            });
          } else if (payload.eventType === 'DELETE') {
            setPresences((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_collaboration_edits',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setEdits((prev) => [payload.new as Edit, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_collaboration_comments',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments((prev) => [...prev, payload.new as Comment]);
          } else if (payload.eventType === 'UPDATE') {
            setComments((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Comment) : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    setChannel(realtimeChannel);

    // Send presence heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      updatePresence({});
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      realtimeChannel.unsubscribe();
    };
  }, [sessionId]);

  async function fetchSession() {
    const response = await fetch(`/api/video/collaboration/sessions/${sessionId}`);
    if (response.ok) {
      const data = await response.json();
      setSession(data.session);
      setParticipants(data.session.participants || []);
    }
  }

  async function fetchPresences() {
    const response = await fetch(`/api/video/collaboration/presence?sessionId=${sessionId}`);
    if (response.ok) {
      const data = await response.json();
      setPresences(data.presences || []);
    }
  }

  async function fetchEdits() {
    const response = await fetch(`/api/video/collaboration/edits?sessionId=${sessionId}&limit=50`);
    if (response.ok) {
      const data = await response.json();
      setEdits(data.edits || []);
    }
  }

  async function fetchComments() {
    const response = await fetch(`/api/video/collaboration/comments?sessionId=${sessionId}`);
    if (response.ok) {
      const data = await response.json();
      setComments(data.comments || []);
    }
  }

  async function updatePresence(data: { cursorPosition?: any; currentSection?: string }) {
    await fetch('/api/video/collaboration/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        isActive: true,
        ...data,
      }),
    });
  }

  async function createEdit(edit: {
    operationType: Edit['operation_type'];
    path: string;
    oldValue?: any;
    newValue: any;
  }) {
    const response = await fetch('/api/video/collaboration/edits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        ...edit,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create edit');
    }
  }

  async function createComment(comment: {
    content: string;
    targetPath?: string;
    targetTimestamp?: number;
    parentId?: string;
  }) {
    const response = await fetch('/api/video/collaboration/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        ...comment,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create comment');
    }
  }

  async function resolveComment(commentId: string, resolved: boolean) {
    const response = await fetch(`/api/video/collaboration/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved }),
    });

    if (!response.ok) {
      throw new Error('Failed to resolve comment');
    }
  }

  return (
    <CollaborationContext.Provider
      value={{
        session,
        participants,
        presences,
        edits,
        comments,
        isConnected,
        updatePresence,
        createEdit,
        createComment,
        resolveComment,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}
