"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkVerification = async () => {
      const supabase = supabaseBrowser();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus("error");
        setMessage("There was an error verifying your email. Please try again.");
        return;
      }

      if (session) {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      } else {
        setStatus("error");
        setMessage("Email verification failed or link expired. Please try signing up again.");
      }
    };

    // Small delay to allow the auth callback to complete
    setTimeout(checkVerification, 1000);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple-dark">
              <span className="text-lg font-bold text-white">P28</span>
            </div>
            <span className="font-semibold text-xl">Portal28</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>
              {status === "loading" ? "Verifying your email..." : "Verification complete"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-6 text-center">
              {status === "loading" && (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Please wait while we verify your email...
                  </p>
                </>
              )}

              {status === "success" && (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 mb-4">
                    <CheckCircle className="h-6 w-6 text-brand-green" />
                  </div>
                  <h3 className="font-semibold mb-2">Email verified!</h3>
                  <p className="text-sm text-muted-foreground mb-4">{message}</p>
                  <Button asChild>
                    <Link href="/app">Go to Dashboard</Link>
                  </Button>
                </>
              )}

              {status === "error" && (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-semibold mb-2">Verification failed</h3>
                  <p className="text-sm text-muted-foreground mb-4">{message}</p>
                  <div className="flex flex-col gap-2 w-full">
                    <Button asChild>
                      <Link href="/signup">Sign up again</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/login">Go to login</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="inline-flex items-center hover:text-foreground">
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
