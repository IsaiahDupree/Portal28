"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TerminalLine {
  text: string;
  type?: "command" | "output" | "error" | "success";
  delay?: number; // ms delay before showing this line
}

interface TerminalOutputProps {
  lines: TerminalLine[] | string[];
  title?: string;
  animated?: boolean;
  typingSpeed?: number; // characters per second
  className?: string;
  showPrompt?: boolean;
  promptSymbol?: string;
}

export function TerminalOutput({
  lines,
  title = "Terminal",
  animated = true,
  typingSpeed = 50,
  className,
  showPrompt = true,
  promptSymbol = "$"
}: TerminalOutputProps) {
  const [visibleLines, setVisibleLines] = useState<number>(animated ? 0 : lines.length);
  const [currentLineText, setCurrentLineText] = useState("");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  // Normalize lines to TerminalLine objects
  const normalizedLines: TerminalLine[] = lines.map(line =>
    typeof line === "string" ? { text: line, type: "output" } : line
  );

  useEffect(() => {
    if (!animated || currentLineIndex >= normalizedLines.length) {
      return;
    }

    const currentLine = normalizedLines[currentLineIndex];
    const delay = currentLine.delay || 0;

    // Apply initial delay if specified
    if (delay > 0 && currentLineText === "") {
      const delayTimeout = setTimeout(() => {
        animateCurrentLine();
      }, delay);
      return () => clearTimeout(delayTimeout);
    }

    animateCurrentLine();
  }, [currentLineIndex, animated]);

  const animateCurrentLine = () => {
    if (currentLineIndex >= normalizedLines.length) return;

    const currentLine = normalizedLines[currentLineIndex];
    const targetText = currentLine.text;

    if (currentLineText.length < targetText.length) {
      // Continue typing current line
      const timeout = setTimeout(() => {
        setCurrentLineText(targetText.slice(0, currentLineText.length + 1));
      }, 1000 / typingSpeed);

      return () => clearTimeout(timeout);
    } else {
      // Line complete, move to next
      setTimeout(() => {
        setVisibleLines(currentLineIndex + 1);
        setCurrentLineIndex(currentLineIndex + 1);
        setCurrentLineText("");
      }, 300);
    }
  };

  const getLineColor = (type?: string) => {
    switch (type) {
      case "command":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "success":
        return "text-green-300";
      case "output":
      default:
        return "text-slate-300";
    }
  };

  return (
    <Card className={cn("overflow-hidden bg-slate-950 text-slate-50", className)}>
      {/* Terminal Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <span className="ml-2 text-sm font-mono text-slate-400">{title}</span>
      </div>

      {/* Terminal Content */}
      <div className="p-4 font-mono text-sm">
        {normalizedLines.slice(0, visibleLines).map((line, index) => (
          <div key={index} className={cn("min-h-[1.5rem]", getLineColor(line.type))}>
            {line.type === "command" && showPrompt && (
              <span className="text-blue-400 mr-2">{promptSymbol}</span>
            )}
            {line.text}
          </div>
        ))}

        {/* Current animating line */}
        {animated && currentLineIndex < normalizedLines.length && currentLineText && (
          <div className={cn("min-h-[1.5rem]", getLineColor(normalizedLines[currentLineIndex].type))}>
            {normalizedLines[currentLineIndex].type === "command" && showPrompt && (
              <span className="text-blue-400 mr-2">{promptSymbol}</span>
            )}
            {currentLineText}
            <span className="animate-pulse">▋</span>
          </div>
        )}
      </div>
    </Card>
  );
}
