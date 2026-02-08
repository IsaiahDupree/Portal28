"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

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
  error_stack?: string;
  processing_time_ms?: number;
  payload: any;
  headers?: any;
  response_data?: any;
}

interface WebhookEventDialogProps {
  event: WebhookEvent;
  open: boolean;
  onClose: () => void;
}

export function WebhookEventDialog({ event, open, onClose }: WebhookEventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge>{event.source}</Badge>
            <span className="font-mono text-sm">{event.event_type}</span>
          </DialogTitle>
          <DialogDescription>
            Event ID: {event.event_id || event.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div className="mt-1">
                <Badge
                  variant={
                    event.status === "success"
                      ? "default"
                      : event.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {event.status}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Attempts</div>
              <div className="mt-1">
                {event.attempts}/{event.max_attempts}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="mt-1 text-sm">
                {format(new Date(event.created_at), "PPpp")}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Processing Time</div>
              <div className="mt-1">
                {event.processing_time_ms ? `${event.processing_time_ms}ms` : "N/A"}
              </div>
            </div>
            {event.last_attempt_at && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Last Attempt</div>
                <div className="mt-1 text-sm">
                  {format(new Date(event.last_attempt_at), "PPpp")}
                </div>
              </div>
            )}
            {event.next_retry_at && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Next Retry</div>
                <div className="mt-1 text-sm">
                  {format(new Date(event.next_retry_at), "PPpp")}
                </div>
              </div>
            )}
          </div>

          {event.error_message && (
            <div className="rounded-md bg-destructive/10 p-4">
              <div className="text-sm font-medium text-destructive mb-2">Error Message</div>
              <div className="text-sm font-mono">{event.error_message}</div>
              {event.error_stack && (
                <details className="mt-2">
                  <summary className="text-sm cursor-pointer text-muted-foreground">
                    Show stack trace
                  </summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap overflow-x-auto">
                    {event.error_stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <Tabs defaultValue="payload" className="w-full">
            <TabsList>
              <TabsTrigger value="payload">Payload</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              {event.response_data && <TabsTrigger value="response">Response</TabsTrigger>}
            </TabsList>
            <TabsContent value="payload" className="mt-4">
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </TabsContent>
            <TabsContent value="headers" className="mt-4">
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {JSON.stringify(event.headers || {}, null, 2)}
              </pre>
            </TabsContent>
            {event.response_data && (
              <TabsContent value="response" className="mt-4">
                <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto">
                  {JSON.stringify(event.response_data, null, 2)}
                </pre>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
