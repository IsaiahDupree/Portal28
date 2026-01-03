"use client";

import { useRouter } from "next/navigation";

interface Version {
  id: string;
  version_number: number;
  subject: string;
  status: string;
  change_reason: string | null;
  created_at: string;
}

interface Props {
  programId: string;
  versions: Version[];
}

export default function VersionHistory({ programId, versions }: Props) {
  const router = useRouter();

  async function handleRollback(versionId: string) {
    if (!confirm("Roll back to this version? This will create a new draft.")) return;

    // In a full implementation, this would copy the version content
    // For MVP, just approve this version
    await fetch(`/api/admin/email-programs/${programId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version_id: versionId, activate: false })
    });

    router.refresh();
  }

  if (versions.length === 0) {
    return <p style={{ color: "#666" }}>No versions yet. Create one above.</p>;
  }

  return (
    <div style={{ maxHeight: 300, overflowY: "auto" }}>
      {versions.map((version, index) => (
        <div
          key={version.id}
          style={{
            padding: 12,
            marginBottom: 8,
            backgroundColor: index === 0 ? "#e8f5e9" : "#f5f5f5",
            borderRadius: 6,
            border: version.status === "approved" ? "2px solid #4caf50" : "1px solid #ddd"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <strong>v{version.version_number}</strong>
              <span style={{
                marginLeft: 8,
                padding: "2px 6px",
                borderRadius: 3,
                fontSize: 11,
                backgroundColor:
                  version.status === "approved" ? "#c8e6c9" :
                  version.status === "sent" ? "#bbdefb" : "#fff9c4"
              }}>
                {version.status}
              </span>
            </div>
            {index !== 0 && version.status !== "approved" && (
              <button
                onClick={() => handleRollback(version.id)}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 3,
                  cursor: "pointer"
                }}
              >
                Rollback
              </button>
            )}
          </div>

          <p style={{ margin: "8px 0 4px", fontSize: 14 }}>
            <strong>Subject:</strong> {version.subject}
          </p>

          {version.change_reason && (
            <p style={{ margin: 0, fontSize: 12, color: "#666", fontStyle: "italic" }}>
              "{version.change_reason}"
            </p>
          )}

          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#888" }}>
            {new Date(version.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
