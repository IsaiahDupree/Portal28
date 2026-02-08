import * as React from "react";

interface AnnouncementEmailProps {
  recipientName?: string;
  announcementTitle: string;
  announcementContent: string;
  announcementExcerpt?: string;
  authorName: string;
  spaceName: string;
  announcementUrl: string;
  unsubscribeUrl: string;
}

export function AnnouncementEmail({
  recipientName,
  announcementTitle,
  announcementContent,
  announcementExcerpt,
  authorName,
  spaceName,
  announcementUrl,
  unsubscribeUrl,
}: AnnouncementEmailProps) {
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
          New announcement in {spaceName}
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
            color: "#111827",
          }}
        >
          {announcementTitle}
        </h1>
      </div>

      {/* Body */}
      <div style={{ padding: "32px" }}>
        {recipientName && (
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#374151", margin: "0 0 24px 0" }}>
            Hi {recipientName},
          </p>
        )}

        {announcementExcerpt && (
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: "#111827",
              fontWeight: 500,
              margin: "0 0 24px 0",
              padding: "16px 20px",
              backgroundColor: "#f3f4f6",
              borderLeft: "4px solid #3b82f6",
              borderRadius: 4,
            }}
          >
            {announcementExcerpt}
          </p>
        )}

        <div
          style={{
            fontSize: 16,
            lineHeight: 1.8,
            color: "#374151",
            margin: "0 0 32px 0",
          }}
          dangerouslySetInnerHTML={{
            __html: announcementContent.substring(0, 500) + (announcementContent.length > 500 ? "..." : ""),
          }}
        />

        {announcementContent.length > 500 && (
          <a
            href={announcementUrl}
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
            Read Full Announcement
          </a>
        )}

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            Posted by <strong>{authorName}</strong>
          </p>
        </div>
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
          Unsubscribe from announcements
        </a>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "12px 0 0 0" }}>
          © Portal28 Academy
        </p>
      </div>
    </div>
  );
}
