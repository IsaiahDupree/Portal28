'use client';

import React, { useState } from 'react';
import { useDM } from './DMProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';

interface DMThreadListProps {
  onSelectThread: (threadId: string) => void;
  selectedThreadId?: string;
}

export function DMThreadList({ onSelectThread, selectedThreadId }: DMThreadListProps) {
  const { threads, unreadCount, isLoading } = useDM();
  const [showArchived, setShowArchived] = useState(false);

  async function handleArchiveThread(threadId: string, isArchived: boolean) {
    await fetch(`/api/dm/threads/${threadId}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: !isArchived }),
    });
  }

  const activeThreads = threads.filter((t: any) => !t.is_archived);
  const archivedThreads = threads.filter((t: any) => t.is_archived);
  const displayThreads = showArchived ? archivedThreads : activeThreads;

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          {unreadCount > 0 && (
            <Badge variant="default">{unreadCount} unread</Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="flex-1" onValueChange={(v) => setShowArchived(v === 'archived')}>
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">
            Active ({activeThreads.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex-1">
            Archived ({archivedThreads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            {activeThreads.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">No active conversations</p>
            ) : (
              <div className="divide-y">
                {activeThreads.map((thread: any) => (
                  <div
                    key={thread.id}
                    className={`cursor-pointer p-4 hover:bg-gray-50 ${
                      selectedThreadId === thread.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onSelectThread(thread.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {thread.other_user?.full_name || thread.other_user?.email}
                          </p>
                          {thread.unread_count > 0 && (
                            <Badge variant="default" className="h-5 px-2 text-xs">
                              {thread.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {formatDistanceToNow(new Date(thread.updated_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveThread(thread.id, false);
                        }}
                      >
                        Archive
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="archived" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            {archivedThreads.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">No archived conversations</p>
            ) : (
              <div className="divide-y">
                {archivedThreads.map((thread: any) => (
                  <div
                    key={thread.id}
                    className={`cursor-pointer p-4 hover:bg-gray-50 ${
                      selectedThreadId === thread.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onSelectThread(thread.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">
                          {thread.other_user?.full_name || thread.other_user?.email}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          Archived{' '}
                          {formatDistanceToNow(new Date(thread.archived_at || thread.updated_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveThread(thread.id, true);
                        }}
                      >
                        Unarchive
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
