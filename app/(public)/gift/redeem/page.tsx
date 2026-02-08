"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gift, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function RedeemGiftPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const codeFromUrl = searchParams.get("code");

  const [code, setCode] = useState(codeFromUrl || "");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [giftDetails, setGiftDetails] = useState<any>(null);
  const [redeemed, setRedeemed] = useState(false);
  const [redeemedCourse, setRedeemedCourse] = useState<any>(null);

  useEffect(() => {
    if (codeFromUrl) {
      checkGiftCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  const checkGiftCode = async (giftCode: string) => {
    if (!giftCode.trim()) return;

    setChecking(true);
    setError("");

    try {
      const response = await fetch(`/api/gifts/redeem?code=${encodeURIComponent(giftCode)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid gift code");
        setGiftDetails(null);
      } else {
        setGiftDetails(data.gift);
        setError("");
      }
    } catch (err) {
      setError("Failed to verify gift code");
      setGiftDetails(null);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckCode = (e: React.FormEvent) => {
    e.preventDefault();
    checkGiftCode(code);
  };

  const handleRedeem = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/gifts/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to redeem gift");
      } else {
        setRedeemed(true);
        setRedeemedCourse(data.course);
      }
    } catch (err) {
      setError("Failed to redeem gift");
    } finally {
      setLoading(false);
    }
  };

  if (redeemed && redeemedCourse) {
    return (
      <main className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Gift Redeemed Successfully!</CardTitle>
            <CardDescription>
              You now have access to {redeemedCourse.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Start learning right away! Your course is ready in your dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href={`/courses/${redeemedCourse.slug}`}>
                  Go to Course
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/app">
                  My Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-brand-purple/10 rounded-full flex items-center justify-center">
            <Gift className="w-10 h-10 text-brand-purple" />
          </div>
          <CardTitle className="text-2xl">Redeem Your Gift</CardTitle>
          <CardDescription>
            Enter your gift code to access your course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCheckCode} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-2">
                Gift Code
              </label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  type="text"
                  placeholder="GIFT-XXXX-YYYY"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  disabled={checking || loading}
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!code.trim() || checking || loading}
                >
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
                </Button>
              </div>
            </div>
          </form>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {giftDetails && (
            <div className="border rounded-lg p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{giftDetails.course.title}</h3>
                {giftDetails.course.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {giftDetails.course.description}
                  </p>
                )}
              </div>

              {giftDetails.recipientName && (
                <p className="text-sm">
                  <span className="font-medium">For:</span> {giftDetails.recipientName}
                </p>
              )}

              {giftDetails.personalMessage && (
                <div className="bg-muted p-3 rounded">
                  <p className="text-sm italic">&quot;{giftDetails.personalMessage}&quot;</p>
                </div>
              )}

              {giftDetails.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expires: {new Date(giftDetails.expiresAt).toLocaleDateString()}
                </p>
              )}

              <Button
                className="w-full"
                onClick={handleRedeem}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  "Redeem Gift"
                )}
              </Button>
            </div>
          )}

          {!giftDetails && !error && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Enter your gift code above to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
