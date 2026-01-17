"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewThreadPage({
  params,
}: {
  params: { categorySlug: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !body.trim()) {
      setError("Title and content are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/community/forum/thread/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug: params.categorySlug,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create thread");
        setIsSubmitting(false);
        return;
      }

      // Redirect to the new thread
      router.push(`/app/community/forums/${params.categorySlug}/${data.threadId}`);
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/app/community/forums/${params.categorySlug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forum
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create New Thread</h1>
        <p className="text-muted-foreground mt-1">
          Start a new discussion in this category
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>New Thread</CardTitle>
          <CardDescription>
            Share your thoughts, ask questions, or start a discussion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Thread Title *</Label>
              <Input
                id="title"
                placeholder="Enter a descriptive title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                required
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Content *</Label>
              <Textarea
                id="body"
                placeholder="Write your message here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={isSubmitting}
                required
                rows={10}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Be clear and respectful. Follow community guidelines.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Thread"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
