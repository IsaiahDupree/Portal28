"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface InstallButtonProps {
  widgetKey: string;
  isInstalled: boolean;
  status: string;
}

export function InstallButton({
  widgetKey,
  isInstalled: initialInstalled,
  status,
}: InstallButtonProps) {
  const router = useRouter();
  const [isInstalled, setIsInstalled] = useState(initialInstalled);
  const [loading, setLoading] = useState(false);

  async function handleInstall() {
    setLoading(true);

    try {
      const res = await fetch("/api/marketplace/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widget_key: widgetKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to install app");
      }

      setIsInstalled(true);
      toast.success("App installed successfully!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to install app"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUninstall() {
    if (!confirm("Are you sure you want to uninstall this app?")) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/marketplace/install", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widget_key: widgetKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to uninstall app");
      }

      setIsInstalled(false);
      toast.success("App uninstalled successfully!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to uninstall app"
      );
    } finally {
      setLoading(false);
    }
  }

  if (status === "coming_soon") {
    return (
      <Button className="w-full" disabled>
        Coming Soon
      </Button>
    );
  }

  if (isInstalled) {
    return (
      <div className="space-y-2">
        <Button className="w-full" variant="outline" disabled>
          ✓ Installed
        </Button>
        <Button
          className="w-full"
          variant="destructive"
          onClick={handleUninstall}
          disabled={loading}
        >
          {loading ? "Uninstalling..." : "Uninstall"}
        </Button>
      </div>
    );
  }

  return (
    <Button className="w-full" onClick={handleInstall} disabled={loading}>
      {loading ? "Installing..." : "Install"}
    </Button>
  );
}
