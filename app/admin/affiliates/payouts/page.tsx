"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  payout_email: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  affiliates: {
    affiliate_code: string;
    payout_email: string;
    users: {
      email: string;
    };
  };
}

export default function AffiliatePayoutsAdmin() {
  const [loading, setLoading] = useState(true);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPayoutRequests();
  }, [statusFilter]);

  async function fetchPayoutRequests() {
    try {
      setLoading(true);
      const url =
        statusFilter === "all"
          ? "/api/admin/affiliates/payouts"
          : `/api/admin/affiliates/payouts?status=${statusFilter}`;

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setPayoutRequests(data.payoutRequests || []);
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error("Error fetching payout requests:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId: string) {
    if (!confirm("Are you sure you want to approve this payout request?")) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/affiliates/payouts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_request_id: requestId }),
      });

      if (response.ok) {
        await fetchPayoutRequests();
        alert("Payout request approved successfully");
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Error approving payout:", err);
      alert("Failed to approve payout request");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selectedRequest || !rejectionReason.trim()) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/affiliates/payouts/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payout_request_id: selectedRequest.id,
          reason: rejectionReason,
        }),
      });

      if (response.ok) {
        setRejectDialogOpen(false);
        setRejectionReason("");
        setSelectedRequest(null);
        await fetchPayoutRequests();
        alert("Payout request rejected");
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Error rejecting payout:", err);
      alert("Failed to reject payout request");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleProcess(requestId: string) {
    if (!confirm("Are you sure you want to process this payout? This will initiate the transfer.")) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/affiliates/payouts/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_request_id: requestId }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchPayoutRequests();

        if (data.manualAction) {
          alert(data.message);
        } else {
          alert("Payout processed successfully");
        }
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Error processing payout:", err);
      alert("Failed to process payout");
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      processing: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      failed: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>
    );
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Affiliate Payouts</h1>
        <p className="text-muted-foreground">Manage affiliate payout requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending?.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${((summary.pending?.total || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.approved?.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${((summary.approved?.total || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completed?.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${((summary.completed?.total || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.rejected?.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${((summary.rejected?.total || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <Label>Status Filter:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payout Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>
            {payoutRequests.length} request{payoutRequests.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No payout requests found
                  </TableCell>
                </TableRow>
              ) : (
                payoutRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.affiliates.affiliate_code}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.affiliates.users.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(request.amount / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>{request.payout_method}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              disabled={actionLoading}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setRejectDialogOpen(true);
                              }}
                              disabled={actionLoading}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {request.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => handleProcess(request.id)}
                            disabled={actionLoading}
                          >
                            Process
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payout request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">Reason</Label>
              <Textarea
                id="rejection_reason"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading}
            >
              {actionLoading ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
