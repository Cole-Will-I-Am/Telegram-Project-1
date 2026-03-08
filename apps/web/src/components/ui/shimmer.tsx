"use client";

import { cn } from "./cn";

interface ShimmerProps {
  className?: string;
}

export function Shimmer({ className }: ShimmerProps) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-shimmer-gradient bg-[length:200%_100%]",
        "rounded-lg bg-surface",
        className,
      )}
    />
  );
}
