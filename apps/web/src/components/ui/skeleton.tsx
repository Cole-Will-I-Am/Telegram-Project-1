"use client";

import { cn } from "./cn";

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-shimmer h-4 rounded-lg bg-shimmer-gradient bg-[length:200%_100%] bg-surface"
          style={{ width: i === lines - 1 && lines > 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}
