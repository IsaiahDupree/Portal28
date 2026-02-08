"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Users, TrendingUp, Copy, CheckCircle, Link as LinkIcon } from "lucide-react";

interface AffiliateData {
  affiliate: {
    id: string;
    affiliate_code: string;
    status: string;
    commission_rate: number;
    total_referrals: number;
    total_earnings: number;
    payout_email: string;
    payout_method: string;
    created_at: string;
  };
  stats: {
    totalClicks: number;
    totalConverted: number;
    conversionRate: number;
    pendingEarnings: number;
    paidEarnings: number;
  };
  recentReferrals: any[];
  recentCommissions: any[];
}

export default function AffiliateDashboard() {
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("stripe");
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2828";

  useEffect(() => {
    fetchAffiliateData();
    if (affiliateData) {
      fetchPayoutData();
    }
  }, [affiliateData?.affiliate?.id]);

  async function fetchAffiliateData() {
    try {
      setLoading(true);
      const response = await fetch("/api/affiliates/dashboard");

      if (response.status === 404) {
        // Not registered as affiliate
        setAffiliateData(null);
      } else if (response.ok) {
        const data = await response.json();
        setAffiliateData(data);
        setPayoutEmail(data.affiliate.payout_email);
        setPayoutMethod(data.affiliate.payout_method);
      } else {
        setError("Failed to load affiliate data");
      }
    } catch (err) {
      console.error("Error fetching affiliate data:", err);
      setError("Failed to load affiliate data");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    try {
      setRegistering(true);
      setError(null);

      const response = await fetch("/api/affiliates/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payout_email: payoutEmail,
          payout_method: payoutMethod,
        }),
      });

      if (response.ok) {
        await fetchAffiliateData();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to register as affiliate");
      }
    } catch (err) {
      console.error("Error registering affiliate:", err);
      setError("Failed to register as affiliate");
    } finally {
      setRegistering(false);
    }
  }

  async function fetchPayoutData() {
    try {
      const response = await fetch("/api/affiliates/payout/request");
      if (response.ok) {
        const data = await response.json();
        setPayoutRequests(data.payoutRequests || []);
        setAvailableBalance(data.availableBalance || 0);
      }
    } catch (err) {
      console.error("Error fetching payout data:", err);
    }
  }

  async function handleRequestPayout() {
    if (!payoutAmount) return;

    try {
      setRequestingPayout(true);
      setError(null);

      const amountInCents = Math.round(parseFloat(payoutAmount) * 100);

      const response = await fetch("/api/affiliates/payout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountInCents }),
      });

      const data = await response.json();

      if (response.ok) {
        setPayoutAmount("");
        await fetchPayoutData();
        alert("Payout request submitted successfully!");
      } else {
        setError(data.error || "Failed to request payout");
      }
    } catch (err) {
      console.error("Error requesting payout:", err);
      setError("Failed to request payout");
    } finally {
      setRequestingPayout(false);
    }
  }

  function copyAffiliateLink() {
    if (!affiliateData) return;

    const affiliateLink = `${siteUrl}?ref=${affiliateData.affiliate.affiliate_code}`;
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not registered as affiliate
  if (!affiliateData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Become an Affiliate</CardTitle>
              <CardDescription>
                Earn commissions by referring customers to Portal28
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <h3 className="font-semibold mb-2">How it works</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Get your unique affiliate link</li>
                    <li>Share it with your audience</li>
                    <li>Earn 20% commission on all sales</li>
                    <li>Track your earnings in real-time</li>
                    <li>Get paid monthly via Stripe, PayPal, or bank transfer</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payout_email">Payout Email</Label>
                    <Input
                      id="payout_email"
                      type="email"
                      placeholder="your@email.com"
                      value={payoutEmail}
                      onChange={(e) => setPayoutEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="payout_method">Payout Method</Label>
                    <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}

                <Button onClick={handleRegister} disabled={registering || !payoutEmail}>
                  {registering ? "Registering..." : "Register as Affiliate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Affiliate dashboard
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Affiliate Dashboard</h1>
        <p className="text-muted-foreground">
          Track your referrals and earnings
        </p>
      </div>

      {/* Status Notice */}
      {affiliateData.affiliate.status === "pending" && (
        <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <p className="text-sm">
              Your affiliate application is pending approval. You'll be notified once it's activated.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Affiliate Link */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Affiliate Link</CardTitle>
          <CardDescription>Share this link to earn commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${siteUrl}?ref=${affiliateData.affiliate.affiliate_code}`}
              className="font-mono"
            />
            <Button onClick={copyAffiliateLink} variant="outline">
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Commission Rate: <strong>{affiliateData.affiliate.commission_rate}%</strong>
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(affiliateData.affiliate.total_earnings / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending: ${(affiliateData.stats.pendingEarnings / 100).toFixed(2)} |
              Paid: ${(affiliateData.stats.paidEarnings / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateData.affiliate.total_referrals}</div>
            <p className="text-xs text-muted-foreground">
              Clicks: {affiliateData.stats.totalClicks} |
              Converted: {affiliateData.stats.totalConverted}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateData.stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {affiliateData.stats.totalConverted} of {affiliateData.stats.totalClicks} clicks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Request */}
      {affiliateData.affiliate.status === "active" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Request Payout</CardTitle>
            <CardDescription>
              Minimum payout: $50.00 | Available: ${(availableBalance / 100).toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="payout_amount">Amount ($)</Label>
                <Input
                  id="payout_amount"
                  type="number"
                  min="50"
                  step="0.01"
                  placeholder="50.00"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  disabled={availableBalance < 5000}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleRequestPayout}
                  disabled={
                    requestingPayout ||
                    !payoutAmount ||
                    parseFloat(payoutAmount) < 50 ||
                    parseFloat(payoutAmount) * 100 > availableBalance
                  }
                >
                  {requestingPayout ? "Requesting..." : "Request Payout"}
                </Button>
              </div>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            {availableBalance < 5000 && (
              <p className="text-sm text-muted-foreground">
                You need at least $50.00 in available balance to request a payout.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payoutRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payout requests yet</p>
          ) : (
            <div className="space-y-4">
              {payoutRequests.map((request: any) => (
                <div key={request.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">${(request.amount / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()} via{" "}
                      {request.payout_method}
                    </p>
                    {request.rejection_reason && (
                      <p className="text-sm text-destructive mt-1">
                        Reason: {request.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        request.status === "completed"
                          ? "bg-green-50 text-green-700"
                          : request.status === "approved"
                          ? "bg-blue-50 text-blue-700"
                          : request.status === "processing"
                          ? "bg-purple-50 text-purple-700"
                          : request.status === "rejected"
                          ? "bg-red-50 text-red-700"
                          : request.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Commissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          {affiliateData.recentCommissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commissions yet</p>
          ) : (
            <div className="space-y-4">
              {affiliateData.recentCommissions.map((commission: any) => (
                <div key={commission.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">${(commission.amount / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        commission.status === "paid"
                          ? "bg-green-50 text-green-700"
                          : commission.status === "approved"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {commission.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
