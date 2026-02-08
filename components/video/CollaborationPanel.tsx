'use client';

import React, { useState } from 'react';
import { useCollaboration } from './CollaborationProvider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

export function CollaborationPanel() {
  const {
    session,
    presences,
    edits,
    comments,
    isConnected,
    createComment,
    resolveComment,
  } = useCollaboration();

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmitComment() {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await createComment({ content: newComment });
      setNewComment('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolveComment(commentId: string, resolved: boolean) {
    try {
      await resolveComment(commentId, resolved);
    } catch (error) {
      console.error('Failed to resolve comment:', error);
    }
  }

  const activeUsers = presences.filter((p) => p.is_active);
  const unresolvedComments = comments.filter((c) => !c.resolved && !c.parent_id);

  return (
    <div className="flex h-full flex-col border-l bg-white">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{session?.name}</h3>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-gray-500">{session?.description}</p>
      </div>

      {/* Active Users */}
      <div className="border-b p-4">
        <h4 className="mb-2 text-sm font-medium">Active Users ({activeUsers.length})</h4>
        <div className="flex flex-wrap gap-2">
          {activeUsers.map((presence) => (
            <div
              key={presence.id}
              className="flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1 text-sm"
            >
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>
                {presence.user?.full_name || presence.user?.email || 'Anonymous'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="comments" className="flex-1">
        <TabsList className="w-full">
          <TabsTrigger value="comments" className="flex-1">
            Comments ({unresolvedComments.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            History
          </TabsTrigger>
        </TabsList>

        {/* Comments Tab */}
        <TabsContent value="comments" className="flex h-full flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            {unresolvedComments.length === 0 ? (
              <p className="text-center text-sm text-gray-500">No comments yet</p>
            ) : (
              <div className="space-y-4">
                {unresolvedComments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {comment.user?.full_name || comment.user?.email || 'Anonymous'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="mb-2 text-sm">{comment.content}</p>
                    {comment.target_path && (
                      <p className="mb-2 text-xs text-gray-500">
                        On: {comment.target_path}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveComment(comment.id, true)}
                    >
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* New Comment Form */}
          <div className="border-t p-4">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-2"
            />
            <Button
              onClick={handleSubmitComment}
              disabled={isSubmitting || !newComment.trim()}
              className="w-full"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="p-0">
          <ScrollArea className="h-full p-4">
            {edits.length === 0 ? (
              <p className="text-center text-sm text-gray-500">No edit history</p>
            ) : (
              <div className="space-y-2">
                {edits.map((edit) => (
                  <div key={edit.id} className="rounded-lg border p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium capitalize">{edit.operation_type}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(edit.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{edit.path}</p>
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
