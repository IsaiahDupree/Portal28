"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function NewsletterUnsubscribePage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [isLoading, setIsLoading] = useState(false);
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnsubscribe() {
    if (!email) {
      setError("No email provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to unsubscribe");
      }

      setIsUnsubscribed(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!email) {
    return (
      <div className="container mx-auto max-w-md py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This unsubscribe link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isUnsubscribed) {
    return (
      <div className="container mx-auto max-w-md py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Successfully Unsubscribed</CardTitle>
            <CardDescription>
              You've been unsubscribed from our newsletter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We're sorry to see you go. You won't receive any more newsletter emails from us.
            </p>
            <p className="text-sm text-muted-foreground">
              Changed your mind? You can always subscribe again from our homepage.
            </p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Unsubscribe from Newsletter</CardTitle>
          <CardDescription>
            We're sorry to see you go!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Email: <span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Click the button below to unsubscribe from our newsletter. You won't receive any more emails from us.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleUnsubscribe}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
            >
              {isLoading ? "Unsubscribing..." : "Unsubscribe"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
