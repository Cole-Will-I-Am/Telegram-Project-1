"use client";

import { cn } from "./cn";

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

export function Label({ className, children }: LabelProps) {
  return (
    <span className={cn("tracking-label text-text-tertiary", className)}>
      {children}
    </span>
  );
}
