"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit2, Trash2, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import MarkdownContent from "@/components/community/MarkdownContent";

interface PostCardProps {
  post: {
    id: string;
    body: string;
    author_user_id: string;
    created_at: string;
    updated_at: string;
  };
  authorEmail: string;
  currentUserId: string;
  isOriginalPost: boolean;
}

export default function PostCard({
  post,
  authorEmail,
  currentUserId,
  isOriginalPost,
}: PostCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(post.body);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAuthor = post.author_user_id === currentUserId;
  const wasEdited = post.updated_at !== post.created_at;

  const handleEdit = async () => {
    if (!editedBody.trim()) {
      setError("Post cannot be empty");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/community/forum/post/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editedBody.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update post");
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/community/forum/post/${post.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete post");
        return;
      }

      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedBody(post.body);
    setError("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-medium">{authorEmail}</div>
            <div className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
              })}
              {wasEdited && " (edited)"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOriginalPost && <Badge variant="outline">Original Post</Badge>}
            {isAuthor && !isEditing && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={5}
              disabled={loading}
              className="resize-y"
            />
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleEdit} disabled={loading} size="sm">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Check className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={loading}
                size="sm"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <MarkdownContent content={post.body} />
        )}
      </CardContent>
    </Card>
  );
}
