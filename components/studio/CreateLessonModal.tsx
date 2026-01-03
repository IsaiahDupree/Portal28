"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, FileText, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateLessonModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: "multimedia" | "pdf" | "quiz" | "text") => Promise<void>;
}

const lessonTypes = [
  {
    type: "multimedia" as const,
    title: "Multimedia",
    description: "Includes text, images, videos, and file uploads",
    icon: Video,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  },
  {
    type: "pdf" as const,
    title: "PDF",
    description: "Embed a PDF document with supporting notes",
    icon: FileText,
    color: "text-red-600 bg-red-100 dark:bg-red-900/30",
  },
  {
    type: "quiz" as const,
    title: "Quiz",
    description: "Multiple choice questions with instant feedback",
    icon: HelpCircle,
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  },
  {
    type: "text" as const,
    title: "Text",
    description: "Simple text content for notes or instructions",
    icon: FileText,
    color: "text-green-600 bg-green-100 dark:bg-green-900/30",
  },
];

export default function CreateLessonModal({
  open,
  onClose,
  onSelect,
}: CreateLessonModalProps) {
  const [selectedType, setSelectedType] = useState<typeof lessonTypes[number]["type"] | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!selectedType) return;
    
    setCreating(true);
    try {
      await onSelect(selectedType);
      onClose();
    } catch (error) {
      console.error("Failed to create lesson:", error);
    } finally {
      setCreating(false);
      setSelectedType(null);
    }
  }

  function handleClose() {
    if (creating) return;
    setSelectedType(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New Lesson</DialogTitle>
          <DialogDescription>
            Choose the type of lesson you want to create
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {lessonTypes.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedType === item.type;

            return (
              <button
                key={item.type}
                onClick={() => setSelectedType(item.type)}
                disabled={creating}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all",
                  "hover:border-primary/50 hover:bg-muted/50",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/30"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-2.5 rounded-lg", item.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="h-3 w-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!selectedType || creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Lesson
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
