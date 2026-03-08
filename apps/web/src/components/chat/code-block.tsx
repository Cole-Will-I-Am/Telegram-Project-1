"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";

interface CodeBlockProps {
  code: string;
  language?: string;
  filePath?: string;
}

const COLLAPSE_THRESHOLD = 20;

export function CodeBlock({ code, language, filePath }: CodeBlockProps) {
  const lines = code.split("\n");
  const isLong = lines.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!isLong);
  const [copied, setCopied] = useState(false);

  const displayLines = expanded ? lines : lines.slice(0, COLLAPSE_THRESHOLD);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border-light bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[10px] text-text-tertiary">
          {filePath || language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <pre className="p-3 text-xs leading-5">
          <code className="font-mono">
            {displayLines.map((line, i) => (
              <div key={i} className="flex">
                <span className="mr-4 inline-block w-8 select-none text-right text-text-tertiary">
                  {i + 1}
                </span>
                <span className="text-text-primary">{line}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Expand/collapse */}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-border py-1.5 text-[10px] text-text-tertiary hover:text-text-secondary"
        >
          {expanded ? "Collapse" : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}
