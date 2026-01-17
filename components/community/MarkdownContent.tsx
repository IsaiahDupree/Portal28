"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
}

function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize rendering for specific elements
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props} />
            ) : (
              <code className="block bg-muted p-2 rounded text-sm overflow-x-auto" {...props} />
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownContent;
export { MarkdownContent };
