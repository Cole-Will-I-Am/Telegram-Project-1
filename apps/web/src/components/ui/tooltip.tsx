"use client";

import { useState, type ReactNode } from "react";
import { cn } from "./cn";

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={cn(
            "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2",
            "rounded-lg bg-surface-elevated px-2.5 py-1.5",
            "border border-border-light text-xs text-text-secondary",
            "whitespace-nowrap animate-fade-in",
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
