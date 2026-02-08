"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_default: boolean;
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    try {
      const res = await fetch("/api/workspaces");
      const data = await res.json();

      if (res.ok) {
        setWorkspaces(data.workspaces || []);
        // Set default or first workspace as current
        const defaultWs = data.workspaces?.find((w: Workspace) => w.is_default);
        setCurrentWorkspace(defaultWs || data.workspaces?.[0] || null);
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectWorkspace(workspace: Workspace) {
    setCurrentWorkspace(workspace);
    setOpen(false);
    // Store in localStorage for persistence
    localStorage.setItem("current_workspace_id", workspace.id);
    // Optionally navigate to workspace home or refresh
  }

  if (loading || !currentWorkspace) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            {currentWorkspace.logo_url && (
              <img
                src={currentWorkspace.logo_url}
                alt={currentWorkspace.name}
                className="h-5 w-5 rounded"
              />
            )}
            <span className="truncate">{currentWorkspace.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search workspace..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Workspaces">
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => handleSelectWorkspace(workspace)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentWorkspace.id === workspace.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {workspace.logo_url && (
                      <img
                        src={workspace.logo_url}
                        alt={workspace.name}
                        className="h-4 w-4 rounded"
                      />
                    )}
                    <span>{workspace.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/admin/workspaces/new");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Workspace
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
