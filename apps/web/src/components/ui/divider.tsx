"use client";

import { cn } from "./cn";

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="h-px flex-1 bg-border" />
        <span className="tracking-label text-text-tertiary">{label}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return <div className={cn("h-px bg-border", className)} />;
}
