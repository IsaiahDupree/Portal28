"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, HelpCircle } from "lucide-react";

interface ReplyFormProps {
  threadId: string;
  categorySlug: string;
}

export default function ReplyForm({ threadId, categorySlug }: ReplyFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!body.trim()) {
      setError("Reply cannot be empty");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/community/forum/post/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: body.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to post reply");
        return;
      }

      setBody("");
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reply">Post a Reply</Label>
            <Textarea
              id="reply"
              placeholder="Write your reply..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              disabled={loading}
              className="resize-y"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="h-auto p-0 hover:bg-transparent"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Markdown supported
              </Button>
              <span>{body.length} characters</span>
            </div>
            {showHelp && (
              <div className="text-xs space-y-1 p-3 bg-muted rounded-md">
                <p className="font-medium">Formatting Help:</p>
                <p>**bold** → <strong>bold</strong></p>
                <p>*italic* → <em>italic</em></p>
                <p>`code` → <code className="bg-background px-1 rounded">code</code></p>
                <p>[link](url) → creates a link</p>
                <p>- List item → creates bullet list</p>
                <p>1. Numbered item → creates numbered list</p>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !body.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Reply
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
