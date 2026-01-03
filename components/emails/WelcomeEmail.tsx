import * as React from "react";

interface WelcomeEmailProps {
  firstName?: string;
}

export function WelcomeEmail({ firstName }: WelcomeEmailProps) {
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ padding: "32px 24px", backgroundColor: "#fafafa" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 16px 0", color: "#111" }}>
          {firstName ? `Welcome, ${firstName}!` : "Welcome!"}
        </h1>
        
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#333", margin: "0 0 16px 0" }}>
          You're now on the Portal28 Academy list. Here's what to expect:
        </p>
        
        <ul style={{ margin: "0 0 24px 0", paddingLeft: 20, color: "#555", lineHeight: 1.8 }}>
          <li>Actionable Facebook Ads strategies</li>
          <li>Behind-the-scenes campaign breakdowns</li>
          <li>Early access to new courses and resources</li>
        </ul>
        
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#333", margin: "0 0 24px 0" }}>
          Keep an eye on your inbox — I'll be sharing valuable content soon.
        </p>
        
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#333", margin: 0 }}>
          — Sarah Ashley
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
