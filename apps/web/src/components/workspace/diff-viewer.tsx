"use client";

import { useMemo } from "react";
import { cn } from "@/components/ui/cn";

interface DiffViewerProps {
  diff: string;
  className?: string;
}

interface DiffLine {
  type: "add" | "remove" | "context" | "header";
  content: string;
  oldNum?: number;
  newNum?: number;
}

function parseDiff(raw: string): DiffLine[] {
  const lines = raw.split("\n");
  const result: DiffLine[] = [];
  let oldNum = 0;
  let newNum = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      // Parse hunk header
      const match = line.match(/@@ -(\d+)/);
      if (match) {
        oldNum = parseInt(match[1], 10);
        const newMatch = line.match(/\+(\d+)/);
        newNum = newMatch ? parseInt(newMatch[1], 10) : oldNum;
      }
      result.push({ type: "header", content: line });
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      result.push({ type: "add", content: line.slice(1), newNum: newNum++ });
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      result.push({ type: "remove", content: line.slice(1), oldNum: oldNum++ });
    } else if (line.startsWith(" ")) {
      result.push({ type: "context", content: line.slice(1), oldNum: oldNum++, newNum: newNum++ });
    }
  }

  return result;
}

const lineColors = {
  add: "bg-success/8 text-success",
  remove: "bg-danger/8 text-danger",
  context: "text-text-secondary",
  header: "bg-accent-soft text-accent",
};

export function DiffViewer({ diff, className }: DiffViewerProps) {
  const lines = useMemo(() => parseDiff(diff), [diff]);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border-light", className)}>
      <div className="overflow-x-auto">
        <pre className="text-xs leading-5">
          {lines.map((line, i) => (
            <div key={i} className={cn("flex px-3 py-0.5", lineColors[line.type])}>
              <span className="w-8 select-none text-right text-text-tertiary opacity-50">
                {line.type === "remove" || line.type === "context" ? line.oldNum : ""}
              </span>
              <span className="w-8 select-none text-right text-text-tertiary opacity-50">
                {line.type === "add" || line.type === "context" ? line.newNum : ""}
              </span>
              <span className="mx-2 select-none text-text-tertiary">
                {line.type === "add" ? "+" : line.type === "remove" ? "-" : line.type === "header" ? "@@" : " "}
              </span>
              <span className="font-mono">{line.content}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
