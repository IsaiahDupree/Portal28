import { Metadata } from "next";
import { WebhookLogsViewer } from "@/components/admin/webhooks/WebhookLogsViewer";

export const metadata: Metadata = {
  title: "Webhook Event Logs | Admin",
  description: "View and manage webhook events from Stripe, Resend, and Mux",
};

export default function WebhookLogsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Webhook Event Logs</h1>
        <p className="text-muted-foreground mt-2">
          Monitor webhook events from Stripe, Resend, and Mux with automatic retry tracking
        </p>
      </div>

      <WebhookLogsViewer />
    </div>
  );
}
