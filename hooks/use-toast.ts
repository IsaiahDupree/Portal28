"use client";

import { toast as notify } from "sonner";

type ToastInput = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

function toast({ title, description, variant = "default" }: ToastInput) {
  const options = description ? { description } : undefined;
  return variant === "destructive" ? notify.error(title, options) : notify.success(title, options);
}

function useToast() {
  return { toast };
}

export { useToast, toast };
