"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface TemplateFilterProps {
  templates: string[];
  currentTemplate: string;
}

export function TemplateFilter({ templates, currentTemplate }: TemplateFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("template");
    } else {
      params.set("template", value);
    }
    router.push(`/admin/email-analytics?${params.toString()}`);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <label htmlFor="template-filter" className="text-sm font-medium">
            Filter by template:
          </label>
          <Select value={currentTemplate} onValueChange={handleFilterChange}>
            <SelectTrigger id="template-filter" className="w-64">
              <SelectValue placeholder="All templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All templates</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template} value={template}>
                  {template}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentTemplate !== "all" && (
            <span className="text-sm text-muted-foreground">
              Showing stats for: <strong>{currentTemplate}</strong>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
