"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Eye, RotateCcw, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { WebhookEventDialog } from "./WebhookEventDialog";

type WebhookSource = "stripe" | "resend" | "mux" | "other" | "all";
type WebhookStatus = "pending" | "processing" | "success" | "failed" | "retrying" | "all";

interface WebhookEvent {
  id: string;
  created_at: string;
  source: string;
  event_type: string;
  event_id?: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  error_message?: string;
  processing_time_ms?: number;
  payload: any;
  headers?: any;
  response_data?: any;
}

export function WebhookLogsViewer() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<WebhookSource>("all");
  const [statusFilter, setStatusFilter] = useState<WebhookStatus>("all");
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [sourceFilter, statusFilter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/webhooks?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to load webhook events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (eventId: string) => {
    setRetryingId(eventId);
    try {
      const response = await fetch(`/api/admin/webhooks/${eventId}/retry`, {
        method: "POST",
      });

      if (response.ok) {
        await loadEvents();
      } else {
        const error = await response.json();
        alert(`Retry failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to retry webhook:", error);
      alert("Failed to retry webhook");
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "retrying":
        return <Badge variant="secondary"><RotateCcw className="w-3 h-3 mr-1" />Retrying</Badge>;
      case "processing":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case "pending":
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      stripe: "bg-purple-500",
      resend: "bg-blue-500",
      mux: "bg-orange-500",
      other: "bg-gray-500",
    };
    return <Badge className={colors[source] || "bg-gray-500"}>{source}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>Monitor and manage incoming webhook events</CardDescription>
            </div>
            <Button onClick={loadEvents} disabled={loading} size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Source</label>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as WebhookSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="mux">Mux</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WebhookStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="retrying">Retrying</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Processing Time</TableHead>
                  <TableHead>Next Retry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading events...
                    </TableCell>
                  </TableRow>
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No webhook events found
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>{getSourceBadge(event.source)}</TableCell>
                      <TableCell className="font-mono text-sm">{event.event_type}</TableCell>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                      <TableCell>
                        {event.attempts}/{event.max_attempts}
                      </TableCell>
                      <TableCell>
                        {event.processing_time_ms ? `${event.processing_time_ms}ms` : "-"}
                      </TableCell>
                      <TableCell>
                        {event.next_retry_at
                          ? formatDistanceToNow(new Date(event.next_retry_at), { addSuffix: true })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedEvent(event)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(event.status === "failed" || event.status === "retrying") &&
                            event.attempts < event.max_attempts && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRetry(event.id)}
                                disabled={retryingId === event.id}
                              >
                                <RotateCcw className={`w-4 h-4 ${retryingId === event.id ? "animate-spin" : ""}`} />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedEvent && (
        <WebhookEventDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}
