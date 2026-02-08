"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
}

export function CodeBlock({
  code,
  language = "javascript",
  filename,
  showLineNumbers = true,
  highlightLines = [],
  className
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <Card className={cn("overflow-hidden bg-slate-950 text-slate-50", className)}>
      {/* Header */}
      {filename && (
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-400">{filename}</span>
            {language && (
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {language}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-slate-400 hover:text-slate-100"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      )}

      {/* Code Content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm">
          <code className="font-mono">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isHighlighted = highlightLines.includes(lineNumber);

              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[1.5rem]",
                    isHighlighted && "bg-blue-500/10 border-l-2 border-blue-500 pl-3 -ml-1"
                  )}
                >
                  {showLineNumbers && (
                    <span className="inline-block w-8 select-none text-slate-600 mr-4 text-right">
                      {lineNumber}
                    </span>
                  )}
                  <span className={cn(isHighlighted && "text-blue-100")}>
                    {line || "\n"}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </Card>
  );
}
