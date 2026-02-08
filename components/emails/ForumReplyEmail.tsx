import * as React from "react";

interface ForumReplyEmailProps {
  recipientName?: string;
  replierName: string;
  replyContent: string;
  threadTitle: string;
  threadUrl: string;
  spaceName: string;
  unsubscribeUrl: string;
}

export function ForumReplyEmail({
  recipientName,
  replierName,
  replyContent,
  threadTitle,
  threadUrl,
  spaceName,
  unsubscribeUrl,
}: ForumReplyEmailProps) {
  // Create a plain text excerpt (strip HTML if any)
  const plainTextExcerpt = replyContent.replace(/<[^>]*>/g, "").substring(0, 200);

  return (
    <div
      style={{
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        maxWidth: 600,
        margin: "0 auto",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 32px",
          backgroundColor: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 8px 0" }}>
          New reply in {spaceName}
        </p>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
            color: "#111827",
          }}
        >
          {replierName} replied to your post
        </h1>
      </div>

      {/* Body */}
      <div style={{ padding: "32px" }}>
        {recipientName && (
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#374151", margin: "0 0 24px 0" }}>
            Hi {recipientName},
          </p>
        )}

        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#374151", margin: "0 0 16px 0" }}>
          <strong>{replierName}</strong> replied to your post in <strong>{threadTitle}</strong>:
        </p>

        {/* Reply preview */}
        <div
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "#111827",
            margin: "0 0 24px 0",
            padding: "16px 20px",
            backgroundColor: "#f3f4f6",
            borderLeft: "4px solid #3b82f6",
            borderRadius: 4,
          }}
        >
          {plainTextExcerpt}
          {replyContent.length > 200 && "..."}
        </div>

        {/* CTA Button */}
        <a
          href={threadUrl}
          style={{
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#3b82f6",
            color: "#ffffff",
            textDecoration: "none",
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          View Reply
        </a>

        <p style={{ fontSize: 14, color: "#6b7280", margin: "24px 0 0 0" }}>
          Reply directly on the platform to continue the conversation.
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "24px 32px",
          backgroundColor: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center" as const,
        }}
      >
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px 0" }}>
          You're receiving this because you're a member of {spaceName}
        </p>
        <a
          href={unsubscribeUrl}
          style={{
            fontSize: 12,
            color: "#6b7280",
            textDecoration: "underline",
          }}
        >
          Unsubscribe from reply notifications
        </a>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "12px 0 0 0" }}>
          © Portal28 Academy
        </p>
      </div>
    </div>
  );
}
