"use client";

import { useMemo } from "react";
import { CodeBlock } from "./code-block";

interface StreamingContentProps {
  content: string;
}

interface ContentSegment {
  type: "text" | "code";
  content: string;
  language?: string;
  filePath?: string;
}

function parseContent(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const codeBlockRegex = /```(\w+)?(?:\s*\/\/\s*(.+?))?\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(raw)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: raw.slice(lastIndex, match.index) });
    }

    segments.push({
      type: "code",
      content: match[3].trimEnd(),
      language: match[1],
      filePath: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < raw.length) {
    segments.push({ type: "text", content: raw.slice(lastIndex) });
  }

  return segments;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Simple: bold, inline code, italic
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  parts.forEach((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code key={i} className="rounded bg-surface px-1 py-0.5 font-mono text-xs text-accent">
          {part.slice(1, -1)}
        </code>,
      );
    } else if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>,
      );
    } else if (part.startsWith("*") && part.endsWith("*")) {
      nodes.push(
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>,
      );
    } else {
      nodes.push(part);
    }
  });

  return nodes;
}

export function StreamingContent({ content }: StreamingContentProps) {
  const segments = useMemo(() => parseContent(content), [content]);

  return (
    <div className="prose-sm text-sm leading-relaxed text-text-primary">
      {segments.map((seg, i) => {
        if (seg.type === "code") {
          return (
            <CodeBlock
              key={i}
              code={seg.content}
              language={seg.language}
              filePath={seg.filePath}
            />
          );
        }

        // Render text paragraphs
        return (
          <div key={i} className="whitespace-pre-wrap">
            {seg.content.split("\n\n").map((para, j) => (
              <p key={j} className="mb-2 last:mb-0">
                {renderInlineMarkdown(para)}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
