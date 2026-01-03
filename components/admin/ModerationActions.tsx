"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, EyeOff, Pin, PinOff, Lock, Unlock, Trash2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface ModerationActionsProps {
  type: "thread" | "reply" | "report";
  id: string;
  contentType?: string;
  contentId?: string;
  isHidden?: boolean;
  isPinned?: boolean;
  isLocked?: boolean;
}

export function ModerationActions({
  type,
  id,
  contentType,
  contentId,
  isHidden = false,
  isPinned = false,
  isLocked = false,
}: ModerationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          type,
          id,
          contentType,
          contentId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Action failed");
      }

      router.refresh();
    } catch (error) {
      console.error("Moderation action failed:", error);
      alert(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  if (type === "report") {
    return (
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction("dismiss_report")}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-1" />
          Dismiss
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleAction("hide_reported_content")}
          disabled={loading}
        >
          <EyeOff className="h-4 w-4 mr-1" />
          Hide Content
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Visibility toggle */}
        <DropdownMenuItem onClick={() => handleAction(isHidden ? "show" : "hide")}>
          {isHidden ? (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Show Content
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Content
            </>
          )}
        </DropdownMenuItem>

        {/* Thread-specific actions */}
        {type === "thread" && (
          <>
            <DropdownMenuItem onClick={() => handleAction(isPinned ? "unpin" : "pin")}>
              {isPinned ? (
                <>
                  <PinOff className="h-4 w-4 mr-2" />
                  Unpin Thread
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin Thread
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleAction(isLocked ? "unlock" : "lock")}>
              {isLocked ? (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock Thread
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock Thread
                </>
              )}
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Delete action */}
        <DropdownMenuItem
          onClick={() => {
            if (confirm("Are you sure you want to delete this content? This cannot be undone.")) {
              handleAction("delete");
            }
          }}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Permanently
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
