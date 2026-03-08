"use client";

import { useState, useMemo } from "react";
import type { ProjectFile } from "@forge-code/shared-types";
import { cn } from "@/components/ui/cn";

interface FileTreeProps {
  files: ProjectFile[];
  selectedId?: string | null;
  onSelect: (file: ProjectFile) => void;
}

interface TreeNode {
  name: string;
  path: string;
  file?: ProjectFile;
  children: Map<string, TreeNode>;
}

function buildTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          file: isFile ? file : undefined,
          children: new Map(),
        });
      } else if (isFile) {
        current.children.get(part)!.file = file;
      }

      current = current.children.get(part)!;
    }
  }

  return root;
}

function TreeNodeRow({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId?: string | null;
  onSelect: (file: ProjectFile) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.children.size > 0 && !node.file;
  const isSelected = node.file?.id === selectedId;
  const sortedChildren = [...node.children.values()].sort((a, b) => {
    // Dirs first, then alpha
    const aIsDir = a.children.size > 0 && !a.file;
    const bIsDir = b.children.size > 0 && !b.file;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <button
        onClick={() => {
          if (isDir) setExpanded(!expanded);
          else if (node.file) onSelect(node.file);
        }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs transition-colors",
          isSelected ? "bg-accent-soft text-accent" : "text-text-secondary hover:bg-white/[0.03] hover:text-text-primary",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Connector line */}
        {depth > 0 && (
          <span className="mr-0.5 inline-block h-3 w-px bg-border" />
        )}

        {/* Icon */}
        {isDir ? (
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="currentColor"
            className={cn("flex-shrink-0 transition-transform", expanded && "rotate-90")}
          >
            <path d="M6 4l4 4-4 4V4z" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0 opacity-40">
            <path d="M3 1h6l4 4v10H3V1zm6 0v4h4" />
          </svg>
        )}

        <span className="truncate">{node.name}</span>
      </button>

      {isDir && expanded && (
        <div>
          {sortedChildren.map((child) => (
            <TreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ files, selectedId, onSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  const sortedRoots = [...tree.children.values()].sort((a, b) => {
    const aIsDir = a.children.size > 0 && !a.file;
    const bIsDir = b.children.size > 0 && !b.file;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  if (files.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-text-tertiary">No files yet</p>
    );
  }

  return (
    <div className="py-1">
      {sortedRoots.map((node) => (
        <TreeNodeRow
          key={node.path}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
