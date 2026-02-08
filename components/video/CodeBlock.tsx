"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
  enableTypingAnimation?: boolean;
  typingSpeed?: number; // characters per second
}

export function CodeBlock({
  code,
  language = "javascript",
  filename,
  showLineNumbers = true,
  highlightLines = [],
  className,
  enableTypingAnimation = false,
  typingSpeed = 20
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [displayedCode, setDisplayedCode] = useState(enableTypingAnimation ? "" : code);
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const codeRef = useRef<HTMLElement>(null);

  // Typing animation effect
  useEffect(() => {
    if (!enableTypingAnimation) {
      setDisplayedCode(code);
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= code.length) {
        setDisplayedCode(code.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 1000 / typingSpeed);

    return () => clearInterval(interval);
  }, [code, enableTypingAnimation, typingSpeed]);

  // Syntax highlighting effect
  useEffect(() => {
    if (displayedCode && language) {
      try {
        const grammar = Prism.languages[language] || Prism.languages.javascript;
        const highlighted = Prism.highlight(displayedCode, grammar, language);
        setHighlightedHtml(highlighted);
      } catch (error) {
        console.error("Syntax highlighting error:", error);
        setHighlightedHtml(displayedCode);
      }
    } else {
      setHighlightedHtml(displayedCode);
    }
  }, [displayedCode, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = displayedCode.split("\n");

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
          <code ref={codeRef} className="font-mono language-{language}">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isHighlighted = highlightLines.includes(lineNumber);

              // Get the highlighted HTML for this specific line
              const lineHtml = highlightedHtml.split("\n")[index] || line;

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
                  <span
                    className={cn(isHighlighted && "text-blue-100")}
                    dangerouslySetInnerHTML={{ __html: lineHtml || "&nbsp;" }}
                  />
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </Card>
  );
}
