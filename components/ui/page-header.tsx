"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  backLink?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  backLink,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      {breadcrumbs && <div className="mb-4">{breadcrumbs}</div>}
      {backLink && (
        <Link
          href={backLink}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
