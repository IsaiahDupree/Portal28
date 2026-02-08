"use client";

/**
 * Custom Audiences List Component
 * META-007: Display and manage custom audiences
 */

import { useState } from "react";
import Link from "next/link";

interface Audience {
  id: string;
  name: string;
  description: string | null;
  audience_type: string;
  sync_status: string;
  user_count: number;
  last_sync_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface AudiencesListProps {
  initialAudiences: Audience[];
}

export function AudiencesList({ initialAudiences }: AudiencesListProps) {
  const [audiences, setAudiences] = useState(initialAudiences);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const handleSync = async (audienceId: string) => {
    if (syncing[audienceId]) return;

    setSyncing((prev) => ({ ...prev, [audienceId]: true }));

    try {
      const response = await fetch(
        `/api/admin/custom-audiences/${audienceId}/sync`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(`Sync failed: ${error.error}`);
        return;
      }

      const data = await response.json();
      alert(
        `Sync completed! ${data.users_sent} users synced to Meta.`
      );

      // Refresh the page to get updated sync status
      window.location.reload();
    } catch (error: any) {
      alert(`Sync error: ${error.message}`);
    } finally {
      setSyncing((prev) => ({ ...prev, [audienceId]: false }));
    }
  };

  const handleDelete = async (audienceId: string, audienceName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${audienceName}"? This will also delete it from Meta.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/custom-audiences/${audienceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Delete failed: ${error.error}`);
        return;
      }

      // Remove from local state
      setAudiences((prev) => prev.filter((a) => a.id !== audienceId));
      alert("Audience deleted successfully");
    } catch (error: any) {
      alert(`Delete error: ${error.message}`);
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
            Synced
          </span>
        );
      case "syncing":
        return (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            Syncing...
          </span>
        );
      case "error":
        return (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
            Error
          </span>
        );
      case "pending":
      default:
        return (
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
            Pending
          </span>
        );
    }
  };

  const getAudienceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchasers: "Purchasers",
      course_completers: "Course Completers",
      engaged_users: "Engaged Users",
      abandoned_checkouts: "Abandoned Checkouts",
      high_value: "High Value",
      custom: "Custom",
    };
    return labels[type] || type;
  };

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Type</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Users</th>
            <th className="text-left p-3">Last Sync</th>
            <th className="text-left p-3">Active</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {audiences.map((audience) => (
            <tr key={audience.id} className="border-t hover:bg-gray-50">
              <td className="p-3">
                <Link
                  href={`/admin/custom-audiences/${audience.id}`}
                  className="font-medium hover:underline"
                >
                  {audience.name}
                </Link>
                {audience.description && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {audience.description}
                  </p>
                )}
              </td>
              <td className="p-3">
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {getAudienceTypeLabel(audience.audience_type)}
                </span>
              </td>
              <td className="p-3">{getSyncStatusBadge(audience.sync_status)}</td>
              <td className="p-3 font-mono">{audience.user_count.toLocaleString()}</td>
              <td className="p-3 text-gray-600">
                {audience.last_sync_at
                  ? new Date(audience.last_sync_at).toLocaleDateString()
                  : "Never"}
              </td>
              <td className="p-3">
                {audience.is_active ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                    Active
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </td>
              <td className="p-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleSync(audience.id)}
                    disabled={syncing[audience.id]}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {syncing[audience.id] ? "Syncing..." : "Sync Now"}
                  </button>
                  <button
                    onClick={() => handleDelete(audience.id, audience.name)}
                    className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
