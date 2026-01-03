import * as React from "react";

interface CourseAccessEmailProps {
  firstName?: string;
  courseName: string;
  accessUrl: string;
}

export function CourseAccessEmail({ firstName, courseName, accessUrl }: CourseAccessEmailProps) {
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ padding: "32px 24px", backgroundColor: "#fafafa" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 16px 0", color: "#111" }}>
          {firstName ? `You're in, ${firstName}!` : "You're in!"}
        </h1>
        
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#333", margin: "0 0 24px 0" }}>
          Your access to <strong>{courseName}</strong> is ready. Click below to start learning.
        </p>
        
        <a
          href={accessUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#111",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: 500,
            fontSize: 14
          }}
        >
          Start Learning →
        </a>
        
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #eee" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px 0", color: "#111" }}>
            Getting Started
          </h3>
          <ol style={{ margin: 0, paddingLeft: 20, color: "#555", lineHeight: 1.8 }}>
            <li>Click the button above to access your course</li>
            <li>Watch the intro video in Module 1</li>
            <li>Complete the first lesson to build momentum</li>
          </ol>
        </div>
        
        <p style={{ fontSize: 12, color: "#888", marginTop: 32 }}>
          If you didn't purchase this course, you can safely ignore this email.
        </p>
      </div>
      
      <div style={{ padding: "16px 24px", backgroundColor: "#f0f0f0", textAlign: "center" as const }}>
        <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
          © Portal28 Academy
        </p>
      </div>
    </div>
  );
}
