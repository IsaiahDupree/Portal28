"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";

export default function UnsubscribePage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenData, setTokenData] = useState<any>(null);

  useEffect(() => {
    decodeToken();
  }, []);

  function decodeToken() {
    try {
      const decoded = JSON.parse(
        Buffer.from(params.token as string, "base64url").toString()
      );
      setTokenData(decoded);
      setLoading(false);
    } catch (err) {
      setError("Invalid unsubscribe link");
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to unsubscribe");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError("An error occurred");
      setLoading(false);
    }
  }

  if (loading && !tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <CardTitle>Successfully Unsubscribed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You have been unsubscribed from {tokenData?.type || "email"} notifications.
            </p>
            <p className="text-sm text-muted-foreground">
              You can update your email preferences anytime in your account settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Unsubscribe from Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-muted-foreground">
            Are you sure you want to unsubscribe from {tokenData?.type || "email"} notifications?
          </p>

          <div className="flex gap-2">
            <Button onClick={handleUnsubscribe} disabled={loading} variant="destructive">
              {loading ? "Processing..." : "Unsubscribe"}
            </Button>
            <Button variant="outline" onClick={() => window.close()}>
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-4 border-t">
            You can manage your email preferences anytime in your account settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
