import * as React from "react";

interface LeadWelcomeEmailProps {
  firstName?: string;
  nextUrl: string;
}

export function LeadWelcomeEmail({ firstName, nextUrl }: LeadWelcomeEmailProps) {
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ padding: "32px 24px", backgroundColor: "#fafafa" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 16px 0", color: "#111" }}>
          {firstName ? `You're in, ${firstName}.` : "You're in."}
        </h1>
        
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#333", margin: "0 0 24px 0" }}>
          Quick next step:
        </p>
        
        <a
          href={nextUrl}
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
          Start here →
        </a>
        
        <p style={{ fontSize: 12, color: "#888", marginTop: 32, opacity: 0.7 }}>
          You'll also get occasional updates from Portal28 Academy.
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
